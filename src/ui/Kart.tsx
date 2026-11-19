"use client";

import { divIcon, type FitBoundsOptions, type Map as LeafletKart } from "leaflet";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { GeoJSON, MapContainer, Marker, TileLayer } from "react-leaflet";
import {
  etikettTilVenstre,
  grenser,
  grupperStartpunkter,
  harMal,
  KARTFLISER_URL,
  type Kartkort,
  midtpunkt,
} from "./kart-data";
import stil from "./Kart.module.css";
import skjult from "./skjult.module.css";
import { MAL_STI, MAL_VIEWBOX, Tegnforklaring } from "./Tegnforklaring";
import { BAKGRUNNSKART, KART, NY_FANE, ZOOM_INN, ZOOM_UT } from "./tekster";

// Kartet i Resultatet (story 3.1, FR-23, FR-25, FR-29, AR-19, UX-DR36). Lastes bare på klienten, via
// KartLaster. Bakgrunnen er Kartverkets gråtonekart uten nøkkel. Over det tegner kartet hver rute med
// <GeoJSON> to ganger, papirhalo under og linje over, med den valgte ruten øverst. Startpunktene er
// nummererte sirkler, og kort med samme Startpunkt får én markør med numrene side om side. Mål er en
// trekant. «omtrentlig rute» står ved midten av den valgte ruten. Kartet zoomer slik at alle ruter og
// Startpunkter synes. Zoom og panorering med mus og berøring er Leaflets standard.
//
// Ruter og markører er ikke interaktive ennå: valg fra kartet kommer i story 3.5. Selve kartflaten,
// markørene og tegnforklaringen er skjult for skjermlesere, fordi alt kartet viser, står i kortene.
// Kartflaten er heller ikke et tabulatorstopp (`keyboard={false}`): zoomknappene er egne knapper på
// 44 × 44 px med navn, fordi Leaflets knapper har title-attributter og er mindre. Med «Reduser bevegelse»
// zoomer og panorerer kartet uten animasjon.

const MIN_ZOOM = 9;
const MAKS_ZOOM = 17;

/** Startpunktet: sirkelen er 29 px med ringen, og sirklene i en gruppe overlapper 3 px. */
const PIN = 29;
const PIN_STEG = 26;

/**
 * Margen rundt rutene når kartet zoomer til dem. Til venstre står zoomknappene, og nederst står
 * tegnforklaringen, som er `forklaring` px høy. Til sidene er margen minst halve den bredeste
 * Startpunkt-markøren, så en delt markør i kanten ikke klippes. Etiketten «omtrentlig rute» peker inn
 * mot kartet (se `etikettTilVenstre`) og trenger ikke egen marg.
 */
const marg = (forklaring: number, bredesteMarkor: number): FitBoundsOptions => {
  const side = bredesteMarkor / 2 + 8;
  return {
    paddingTopLeft: [Math.max(64, side), Math.max(24, PIN / 2 + 8)],
    paddingBottomRight: [Math.max(24, side), forklaring + 24],
    maxZoom: 16,
    animate: false,
  };
};

/** Tegnforklaringen er én linje på PC. Kartet zoomer på nytt med den målte høyden når det er klart. */
const FORKLARING_EN_LINJE = 32;

export type KartProps = {
  kort: readonly Kartkort[];
  /** Indeksen til det valgte kortet. Ruten og Startpunktet uthever det. */
  valgt: number;
};

function startikon(numre: readonly { nummer: number; valgt: boolean }[]) {
  const bredde = PIN + (numre.length - 1) * PIN_STEG;
  const html = numre
    .map(({ nummer, valgt }) => `<span class="${stil.pin}${valgt ? ` ${stil.pinValgt}` : ""}">${nummer}</span>`)
    .join("");
  return divIcon({
    className: stil.startpunkt,
    html: `<span class="${stil.pinner}" aria-hidden="true" data-testid="kart-startpunkt">${html}</span>`,
    iconSize: [bredde, PIN],
    iconAnchor: [bredde / 2, PIN / 2],
  });
}

function malikon(valgt: boolean) {
  const klasse = `${stil.mal}${valgt ? ` ${stil.malValgt}` : ""}`;
  return divIcon({
    className: "",
    html:
      `<svg class="${klasse}" width="16" height="15" viewBox="${MAL_VIEWBOX}" aria-hidden="true" ` +
      `data-testid="kart-mal"><path d="${MAL_STI}"/></svg>`,
    iconSize: [16, 15],
    iconAnchor: [8, 9],
  });
}

const etikettikon = (tilVenstre: boolean) =>
  divIcon({
    className: "",
    html:
      `<span class="${stil.etikett}${tilVenstre ? ` ${stil.etikettVenstre}` : ""}" aria-hidden="true" ` +
      `data-testid="kart-etikett">${KART.omtrentligRute}</span>`,
    iconSize: [0, 0],
  });
const ETIKETT = { hoyre: etikettikon(false), venstre: etikettikon(true) };

/** Zoomnivået, oppdatert etter hver zoom. `null` før kartet er klart. */
function useZoom(kart: LeafletKart | null): number | null {
  const abonner = useCallback(
    (varsle: () => void) => {
      kart?.on("zoomend", varsle);
      return () => {
        kart?.off("zoomend", varsle);
      };
    },
    [kart],
  );
  return useSyncExternalStore(
    abonner,
    () => kart?.getZoom() ?? null,
    () => null,
  );
}

export function Kart({ kort, valgt }: KartProps) {
  const [kart, settKart] = useState<LeafletKart | null>(null);
  const zoom = useZoom(kart);
  const forklaring = useRef<HTMLDivElement>(null);
  // Leaflet leser valgene bare når kartet lages, så «Reduser bevegelse» leses én gang.
  const [rolig] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const omrade = useMemo(() => grenser(kort), [kort]);
  const lag = useMemo(() => {
    const andre = [...kort.keys()].filter((i) => i !== valgt);
    // Den valgte ruten tegnes sist, så den ligger øverst.
    const rekkefolge = kort[valgt] ? [...andre, valgt] : andre;
    const ruter = rekkefolge.map((i) => ({ kort: kort[i], valgt: i === valgt }));
    const mal = rekkefolge.flatMap((i) => {
      const punkt = kort[i].kart.malpunkt;
      return punkt ? [{ turId: kort[i].turId, punkt, ikon: malikon(i === valgt) }] : [];
    });
    const starter = grupperStartpunkter(kort).map((gruppe) => {
      const harValgt = gruppe.kort.some((k) => k.indeks === valgt);
      return {
        nokkel: `${gruppe.punkt.lat},${gruppe.punkt.lon}`,
        punkt: gruppe.punkt,
        harValgt,
        ikon: startikon(gruppe.kort.map((k) => ({ nummer: k.nummer, valgt: k.indeks === valgt }))),
      };
    });
    const midt = kort[valgt] ? midtpunkt(kort[valgt].kart.rute) : null;
    const side = midt && omrade && etikettTilVenstre(midt, omrade) ? "venstre" : "hoyre";
    const etikett = midt ? { punkt: midt, ikon: ETIKETT[side] } : null;
    return { ruter, mal, starter, etikett };
  }, [kort, valgt, omrade]);

  /** Den bredeste Startpunkt-markøren i px. */
  const bredesteMarkor = useMemo(
    () => PIN + (Math.max(1, ...grupperStartpunkter(kort).map((g) => g.kort.length)) - 1) * PIN_STEG,
    [kort],
  );

  // Kartet zoomer til rutene på nytt hver gang kartflaten eller tegnforklaringen endrer størrelse: når
  // kartet er klart, når tegnforklaringen brytes til flere linjer på smale skjermer, og når høyden
  // endres ved 1200 px. En skjult kartflate (0 px) hoppes over, og den tilpasses når den vises.
  useEffect(() => {
    if (!kart || !omrade) return;
    const flate = kart.getContainer();
    const tilpass = () => {
      if (flate.clientWidth === 0 || flate.clientHeight === 0) return;
      kart.invalidateSize({ pan: false });
      kart.fitBounds(omrade, marg(forklaring.current?.offsetHeight ?? FORKLARING_EN_LINJE, bredesteMarkor));
    };
    const observator = new ResizeObserver(tilpass);
    observator.observe(flate);
    if (forklaring.current) observator.observe(forklaring.current);
    return () => observator.disconnect();
  }, [kart, omrade, bredesteMarkor]);

  if (!omrade) return null;

  const kanZoomeInn = kart !== null && zoom !== null && zoom < kart.getMaxZoom();
  const kanZoomeUt = kart !== null && zoom !== null && zoom > kart.getMinZoom();

  return (
    <div className={stil.flate} data-testid="kart">
      <div className={stil.kartlag} aria-hidden="true">
        <MapContainer
          ref={settKart}
          className={stil.kartet}
          bounds={omrade}
          boundsOptions={marg(FORKLARING_EN_LINJE, bredesteMarkor)}
          minZoom={MIN_ZOOM}
          maxZoom={MAKS_ZOOM}
          keyboard={false}
          zoomAnimation={!rolig}
          fadeAnimation={!rolig}
          markerZoomAnimation={!rolig}
          inertia={!rolig}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url={KARTFLISER_URL} minZoom={MIN_ZOOM} maxZoom={MAKS_ZOOM} />
          {/* Et nytt valg tegner lagene på nytt, så den valgte ruten havner øverst. */}
          <Fragment key={valgt}>
            {/* Klassen settes med `style`, før stien lages. Farge, bredde og strek står i CSS. */}
            {lag.ruter.map(({ kort: k, valgt: erValgt }) => {
              const tilstand = erValgt ? stil.valgt : stil.inaktiv;
              return (
                <Fragment key={k.turId}>
                  <GeoJSON data={k.kart.rute} style={{ className: `${stil.halo} ${tilstand}` }} interactive={false} />
                  <GeoJSON data={k.kart.rute} style={{ className: `${stil.linje} ${tilstand}` }} interactive={false} />
                </Fragment>
              );
            })}
            {lag.mal.map(({ turId, punkt, ikon }) => (
              <Marker key={turId} position={[punkt.lat, punkt.lon]} icon={ikon} interactive={false} keyboard={false} />
            ))}
            {lag.starter.map(({ nokkel, punkt, harValgt, ikon }) => (
              <Marker
                key={nokkel}
                position={[punkt.lat, punkt.lon]}
                icon={ikon}
                interactive={false}
                keyboard={false}
                zIndexOffset={harValgt ? 1000 : 0}
              />
            ))}
            {lag.etikett && (
              <Marker
                position={[lag.etikett.punkt.lat, lag.etikett.punkt.lon]}
                icon={lag.etikett.ikon}
                interactive={false}
                keyboard={false}
              />
            )}
          </Fragment>
        </MapContainer>
      </div>

      <div className={stil.zoom}>
        <button
          type="button"
          className={stil.zoomknapp}
          aria-label={ZOOM_INN}
          aria-disabled={!kanZoomeInn || undefined}
          onClick={() => {
            if (kanZoomeInn) kart.zoomIn();
          }}
        >
          <svg className={stil.zoomikon} viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 2v12M2 8h12" />
          </svg>
        </button>
        <button
          type="button"
          className={stil.zoomknapp}
          aria-label={ZOOM_UT}
          aria-disabled={!kanZoomeUt || undefined}
          onClick={() => {
            if (kanZoomeUt) kart.zoomOut();
          }}
        >
          <svg className={stil.zoomikon} viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 8h12" />
          </svg>
        </button>
      </div>

      <Tegnforklaring ref={forklaring} harMal={harMal(kort)} />

      <a
        className={stil.kreditering}
        href={BAKGRUNNSKART.lenke}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="kart-kreditering"
      >
        <span className={stil.pille}>{BAKGRUNNSKART.tekst}</span>
        <span className={skjult.skjult}>{NY_FANE}</span>
      </a>
    </div>
  );
}
