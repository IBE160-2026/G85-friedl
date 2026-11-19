"use client";

import { divIcon, type FitBoundsOptions, type Map as LeafletKart } from "leaflet";
import {
  Fragment,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { GeoJSON, MapContainer, Marker, TileLayer } from "react-leaflet";
import {
  etikettTilVenstre,
  type Grenser,
  grenser,
  grupperStartpunkter,
  harMal,
  KARTFLISER_URL,
  type Kartkort,
  midtpunkt,
  type NavngittPunkt,
  punktgrenser,
  SOK_PRIKK,
  type Sokflate,
  sokMarg,
} from "./kart-data";
import stil from "./Kart.module.css";
import { Omradeboks } from "./Omradeboks";
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
//
// Statisk modus (`statisk`, story 3.2, UX-DR38) er Kartutsnittet i kortene og kartet på Frarådet-kortet:
// samme kart uten dragging, zoom, tastatur, zoomknapper, tegnforklaring, etikett og animasjoner. Kartet tar
// ikke imot pekeren, så et trykk går til knappen rundt (Kartutsnitt), og en sveip til Stokken. Det fyller
// flaten det står i, og krediteringen står i merket nederst, utenfor kartet (Kartutsnitt.tsx). Det viser
// bare kortets rute og Startpunkt, ikke Mål, og holder dem klar av merkene over kartet (`tilpassStatisk`).
// Med `omrade` (Frarådet-kortet) viser det bare området, uten marg.
//
// Søk-kartet på PC (`Startpunktkart`, story 3.3, UX-DR40) er samme interaktive kart uten ruter, Mål og
// etikett. Det viser de 8 Startpunktene fra sidedataene som prikker uten nummer, som i skissen pc-1, og
// zoomer slik at alle synes. Øverst til venstre står «Moldemarka» og telleteksten (Omradeboks), med
// zoomknappene under. Tegnforklaringen viser bare Startpunkt. Prikkene har ingen etikett: skissen har
// ingen etikett ved hover eller fokus, og ingenting skal kreve hover (EXPERIENCE.md › Interaction).

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

/**
 * Statisk modus zoomer i kvarte trinn, så ruten fyller det lave utsnittet bedre. Flisene skaleres da litt
 * og kan bli noe mykere, som er greit i et lite, statisk utsnitt.
 */
const ZOOMTRINN_STATISK = 0.25;

/** Klaringen i px mellom merkene og Startpunktet eller ruten i statisk modus. */
const KLARING = 3;
/** Halve bredden av ruten med halo, i px, som ruten stikker ut forbi punktene sine. */
const RUTEKANT = 4;
/** Minste marg i statisk modus: Startpunktet står helt inne i kartet, med litt klaring. */
const MIN_STATISK = PIN / 2 + KLARING;

/** Margen i statisk modus, med `topp` og `bunn` i px. Til sidene står hele Startpunktet inne i kartet. */
function statiskMarg(topp: number, bunn: number, hoyde: number): FitBoundsOptions {
  // Er merkene så høye at det ikke blir plass igjen (for eksempel ved 200 % zoom), deles plassen.
  const skala = topp + bunn > hoyde - 8 ? (hoyde - 8) / (topp + bunn) : 1;
  return {
    paddingTopLeft: [MIN_STATISK + 6, topp * skala],
    paddingBottomRight: [MIN_STATISK + 6, bunn * skala],
    maxZoom: 16,
    animate: false,
  };
}

/** Frarådet-kortet viser et område uten ruter og merker over seg, så det har ingen marg. */
const MARG_OMRADE: FitBoundsOptions = { padding: [0, 0], animate: false };

/** En boks i px i kartflaten. */
type Boks = { venstre: number; topp: number; hoyre: number; bunn: number };

const overlapper = (a: Boks, b: Boks) =>
  a.venstre < b.hoyre && b.venstre < a.hoyre && a.topp < b.bunn && b.topp < a.bunn;

/** Startpunktene og ruten slik kartet tegner dem nå, som bokser i kartflaten. */
function innholdsbokser(kart: LeafletKart, kort: readonly Kartkort[]): Boks[] {
  const starter = grupperStartpunkter(kort).map(({ punkt, kort: numre }) => {
    const { x, y } = kart.latLngToContainerPoint([punkt.lat, punkt.lon]);
    const halv = (PIN + (numre.length - 1) * PIN_STEG) / 2;
    return { venstre: x - halv, hoyre: x + halv, topp: y - PIN / 2, bunn: y + PIN / 2 };
  });
  const ruter = kort.map(({ kart: k }) => {
    const punkter = k.rute.geometry.coordinates.flat().map(([lon, lat]) => kart.latLngToContainerPoint([lat, lon]));
    const xs = punkter.map((p) => p.x);
    const ys = punkter.map((p) => p.y);
    return {
      venstre: Math.min(...xs) - RUTEKANT,
      hoyre: Math.max(...xs) + RUTEKANT,
      topp: Math.min(...ys) - RUTEKANT,
      bunn: Math.max(...ys) + RUTEKANT,
    };
  });
  return [...starter, ...ruter];
}

/**
 * Zoomer det statiske kartet til ruten slik at ruten og Startpunktet aldri ligger under merkene. Først
 * zoomer kartet med minste marg. Treffer innholdet et merke øverst, får kartet marg under det merket, og
 * tilsvarende nederst, og zoomer på nytt. Margene bare øker, så det ender senest med marg ved begge
 * merkene, og da er innholdet klar av dem.
 */
function tilpassStatisk(kart: LeafletKart, omrade: Grenser, kort: readonly Kartkort[], merker: readonly Element[]) {
  const flate = kart.getContainer().getBoundingClientRect();
  const hoyde = flate.height;
  const piller: Boks[] = merker
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({
      venstre: r.left - flate.left,
      hoyre: r.right - flate.left,
      topp: r.top - flate.top,
      bunn: r.bottom - flate.top,
    }));
  const overst = (b: Boks) => b.topp + b.bunn < hoyde;
  const fullTopp = Math.max(MIN_STATISK, ...piller.filter(overst).map((b) => b.bunn + MIN_STATISK));
  const fullBunn = Math.max(MIN_STATISK, ...piller.filter((b) => !overst(b)).map((b) => hoyde - b.topp + MIN_STATISK));

  let topp = MIN_STATISK;
  let bunn = MIN_STATISK;
  for (;;) {
    kart.fitBounds(omrade, statiskMarg(topp, bunn, hoyde));
    const innhold = innholdsbokser(kart, kort);
    const treffer = (b: Boks) => innhold.some((i) => overlapper(i, b));
    const nyTopp = piller.some((b) => overst(b) && treffer(b)) ? fullTopp : topp;
    const nyBunn = piller.some((b) => !overst(b) && treffer(b)) ? fullBunn : bunn;
    if (nyTopp === topp && nyBunn === bunn) return;
    topp = nyTopp;
    bunn = nyBunn;
  }
}

/** Tegnforklaringen er én linje på PC. Kartet zoomer på nytt med den målte høyden når det er klart. */
const FORKLARING_EN_LINJE = 32;

export type KartProps = {
  kort: readonly Kartkort[];
  /** Indeksen til det valgte kortet. Ruten og Startpunktet uthever det. */
  valgt: number;
  /** Statisk modus: Kartutsnittet og kartet på Frarådet-kortet. */
  statisk?: boolean;
  /** Området kartet viser, når det ikke er grensene til kortene. Frarådet-kortet viser Moldemarka. */
  omrade?: Grenser;
  /**
   * Statisk modus: merkene som står over kartet. Ruten og Startpunktet holdes klar av dem, og kartet
   * zoomer på nytt når de endrer størrelse.
   */
  merker?: () => readonly Element[];
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

export function Kart({ kort: alleKort, valgt, statisk = false, omrade: fastOmrade, merker }: KartProps) {
  // Kartutsnittet viser bare kortets egen rute og Startpunkt (UX-DR38), ikke Mål.
  const kort = useMemo(
    () => (statisk ? alleKort.map((k) => ({ ...k, kart: { ...k.kart, malpunkt: undefined } })) : alleKort),
    [alleKort, statisk],
  );
  const [kart, settKart] = useState<LeafletKart | null>(null);
  const zoom = useZoom(kart);
  const forklaring = useRef<HTMLDivElement>(null);
  // Leaflet leser valgene bare når kartet lages, så «Reduser bevegelse» leses én gang.
  // Det statiske kartet flytter seg aldri selv, så det har ingen animasjoner.
  const [rolig] = useState(() => statisk || window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const omrade = useMemo(() => fastOmrade ?? grenser(kort), [fastOmrade, kort]);
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
    // I statisk modus står «omtrentlig rute» i merket nederst, ikke ved ruten.
    const midt = kort[valgt] && !statisk ? midtpunkt(kort[valgt].kart.rute) : null;
    const side = midt && omrade && etikettTilVenstre(midt, omrade) ? "venstre" : "hoyre";
    const etikett = midt ? { punkt: midt, ikon: ETIKETT[side] } : null;
    return { ruter, mal, starter, etikett };
  }, [kort, valgt, omrade, statisk]);

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
      if (fastOmrade) kart.fitBounds(omrade, MARG_OMRADE);
      else if (statisk) tilpassStatisk(kart, omrade, kort, merker?.() ?? []);
      else kart.fitBounds(omrade, marg(forklaring.current?.offsetHeight ?? FORKLARING_EN_LINJE, bredesteMarkor));
    };
    const observator = new ResizeObserver(tilpass);
    observator.observe(flate);
    if (forklaring.current) observator.observe(forklaring.current);
    for (const merke of merker?.() ?? []) observator.observe(merke);
    return () => observator.disconnect();
  }, [kart, omrade, kort, bredesteMarkor, statisk, fastOmrade, merker]);

  if (!omrade) return null;

  return (
    <div className={statisk ? stil.statisk : stil.flate} data-testid={statisk ? "kart-statisk" : "kart"}>
      <div className={stil.kartlag} aria-hidden="true">
        <MapContainer
          ref={settKart}
          className={stil.kartet}
          bounds={omrade}
          boundsOptions={
            fastOmrade
              ? MARG_OMRADE
              : statisk
                ? statiskMarg(MIN_STATISK, MIN_STATISK, Infinity)
                : marg(FORKLARING_EN_LINJE, bredesteMarkor)
          }
          minZoom={MIN_ZOOM}
          maxZoom={MAKS_ZOOM}
          zoomSnap={statisk ? ZOOMTRINN_STATISK : 1}
          dragging={!statisk}
          touchZoom={!statisk}
          doubleClickZoom={!statisk}
          scrollWheelZoom={!statisk}
          boxZoom={!statisk}
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

      {!statisk && (
        <KartKontroller kart={kart} zoom={zoom} forklaring={forklaring} harMal={harMal(kort)} />
      )}
    </div>
  );
}

const PRIKKIKON = divIcon({
  className: "",
  html: `<span class="${stil.prikk}" aria-hidden="true" data-testid="sok-kart-startpunkt"></span>`,
  iconSize: [SOK_PRIKK, SOK_PRIKK],
  iconAnchor: [SOK_PRIKK / 2, SOK_PRIKK / 2],
});

/**
 * Søk-kartet zoomer i halve trinn, så de 8 Startpunktene fyller det høye kartet bedre. Flisene skaleres da
 * litt mellom trinnene og kan bli noe mykere, som er en grei pris for et oversiktskart.
 */
const ZOOMTRINN_SOK = 0.5;

/** Hvordan Søk-kartet zoomer til Startpunktene, både første gang og senere (`sokMarg` i kart-data.ts). */
function sokTilpasning(flate: Sokflate): FitBoundsOptions {
  const { side, topp, bunn } = sokMarg(flate);
  return { paddingTopLeft: [side, topp], paddingBottomRight: [side, bunn], maxZoom: 16, animate: false };
}

/** Første tilpasning, før overleggene er målt. Kartet tilpasses på nytt med målene før det tegnes. */
const SOK_FORSTE = sokTilpasning({ hoyde: Infinity, hjorneBunn: null, bunnTopp: null });

/** Målene til overleggene i Søk-kartet, i px fra toppen av kartflaten. */
function malSokflate(flate: HTMLElement, hjorne: HTMLElement | null, bunn: (HTMLElement | null)[]): Sokflate {
  const topper = bunn.filter((el): el is HTMLElement => el !== null).map((el) => el.offsetTop);
  return {
    hoyde: flate.clientHeight,
    hjorneBunn: hjorne ? hjorne.offsetTop + hjorne.offsetHeight : null,
    bunnTopp: topper.length > 0 ? Math.min(...topper) : null,
  };
}

export type StartpunktkartProps = {
  /** Startpunktene fra sidedataene. */
  startpunkter: readonly NavngittPunkt[];
  /** «12 Turer fra 8 Startpunkter» fra sidedataene. */
  telletekst: string;
};

/** Søk-kartet på PC (story 3.3): Startpunktene og telleteksten, med zoom og panorering. */
export function Startpunktkart({ startpunkter, telletekst }: StartpunktkartProps) {
  const [kart, settKart] = useState<LeafletKart | null>(null);
  const zoom = useZoom(kart);
  const flate = useRef<HTMLDivElement>(null);
  const forklaring = useRef<HTMLDivElement>(null);
  const kreditering = useRef<HTMLAnchorElement>(null);
  const hjorne = useRef<HTMLDivElement>(null);
  const [rolig] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const omrade = useMemo(() => punktgrenser(startpunkter), [startpunkter]);

  // Kartet zoomer til Startpunktene på nytt når kartflaten, boksen, tegnforklaringen eller krediteringen
  // endrer størrelse. Har brukeren dratt eller zoomet, beholdes utsnittet hennes, til kartflaten selv får en
  // ny størrelse. Kartets egne tilpasninger (`egen`) teller ikke som brukerens.
  useEffect(() => {
    if (!kart || !omrade) return;
    let egen = false;
    let brukerStyrt = false;
    let forrige = { bredde: 0, hoyde: 0 };
    const merkBruker = () => {
      if (!egen) brukerStyrt = true;
    };
    kart.on("dragstart zoomstart", merkBruker);
    const tilpass = () => {
      const f = flate.current;
      if (!f || f.clientWidth === 0 || f.clientHeight === 0) return;
      const nyStorrelse = f.clientWidth !== forrige.bredde || f.clientHeight !== forrige.hoyde;
      forrige = { bredde: f.clientWidth, hoyde: f.clientHeight };
      if (brukerStyrt && !nyStorrelse) return;
      egen = true;
      try {
        kart.invalidateSize({ pan: false });
        const maal = malSokflate(f, hjorne.current, [forklaring.current, kreditering.current]);
        kart.fitBounds(omrade, sokTilpasning(maal));
      } finally {
        egen = false;
      }
    };
    const observator = new ResizeObserver(tilpass);
    for (const el of [flate.current, hjorne.current, forklaring.current, kreditering.current]) {
      if (el) observator.observe(el);
    }
    return () => {
      observator.disconnect();
      kart.off("dragstart zoomstart", merkBruker);
    };
  }, [kart, omrade]);

  if (!omrade) return null;

  return (
    <div ref={flate} className={`${stil.flate} ${stil.fyll}`} data-testid="sok-kart-flate">
      <div className={stil.kartlag} aria-hidden="true">
        <MapContainer
          ref={settKart}
          className={stil.kartet}
          bounds={omrade}
          boundsOptions={SOK_FORSTE}
          minZoom={MIN_ZOOM}
          maxZoom={MAKS_ZOOM}
          zoomSnap={ZOOMTRINN_SOK}
          keyboard={false}
          zoomAnimation={!rolig}
          fadeAnimation={!rolig}
          markerZoomAnimation={!rolig}
          inertia={!rolig}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url={KARTFLISER_URL} minZoom={MIN_ZOOM} maxZoom={MAKS_ZOOM} />
          {startpunkter.map((p) => (
            <Marker
              key={`${p.navn}|${p.lat},${p.lon}`}
              position={[p.lat, p.lon]}
              icon={PRIKKIKON}
              interactive={false}
              keyboard={false}
            />
          ))}
        </MapContainer>
      </div>

      <KartKontroller
        kart={kart}
        zoom={zoom}
        forklaring={forklaring}
        kreditering={kreditering}
        harMal={false}
        bareStartpunkt
        hjorne={<Omradeboks ref={hjorne} telletekst={telletekst} />}
      />
    </div>
  );
}

type KontrollerProps = {
  kart: LeafletKart | null;
  zoom: number | null;
  forklaring: Ref<HTMLDivElement>;
  /** Søk-kartet måler krediteringen, så Startpunktene holdes klar av den. */
  kreditering?: Ref<HTMLAnchorElement>;
  harMal: boolean;
  /** Søk-kartet: tegnforklaringen viser bare Startpunkt. */
  bareStartpunkt?: boolean;
  /** Søk-kartet: boksen øverst til venstre, med zoomknappene under. */
  hjorne?: ReactNode;
};

/** Zoomknappene, tegnforklaringen og krediteringspillen over det interaktive kartet. */
function KartKontroller({ kart, zoom, forklaring, kreditering, harMal, bareStartpunkt, hjorne }: KontrollerProps) {
  const kanZoomeInn = kart !== null && zoom !== null && zoom < kart.getMaxZoom();
  const kanZoomeUt = kart !== null && zoom !== null && zoom > kart.getMinZoom();

  const zoomknapper = (
    <div className={hjorne ? stil.zoomgruppe : stil.zoom}>
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
  );

  return (
    <>
      {hjorne ? (
        <div className={stil.hjorne}>
          {hjorne}
          {zoomknapper}
        </div>
      ) : (
        zoomknapper
      )}

      <Tegnforklaring ref={forklaring} harMal={harMal} bareStartpunkt={bareStartpunkt} />

      <a
        ref={kreditering}
        className={stil.kreditering}
        href={BAKGRUNNSKART.lenke}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="kart-kreditering"
      >
        <span className={stil.pille}>{BAKGRUNNSKART.tekst}</span>
        <span className={skjult.skjult}>{NY_FANE}</span>
      </a>
    </>
  );
}
