"use client";

import {
  divIcon,
  type FitBoundsOptions,
  type GeoJSON as LeafletGeoJSON,
  type LeafletEventHandlerFnMap,
  type LeafletKeyboardEvent,
  type Map as LeafletKart,
  type Marker as LeafletMarker,
  type Path,
} from "leaflet";
import {
  Fragment,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { GeoJSON, MapContainer, Marker, Pane, TileLayer } from "react-leaflet";
import {
  etikettTilVenstre,
  type Grenser,
  grenser,
  grupperStartpunkter,
  harMal,
  dekketHoyre,
  KARTFLISER_URL,
  kartmarg as marg,
  type Kartkort,
  markornavn,
  midtpunkt,
  type Flatrekt,
  type NavngittPunkt,
  PIN,
  plasserEtiketter,
  punktgrenser,
  SOK_PRIKK,
  type Sokflate,
  sokflate,
  sokMarg,
  somHtml,
  type Startgruppe,
  velgIGruppe,
} from "./kart-data";
import { Bakgrunnsfeil, flisvakt } from "./Bakgrunnsfeil";
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
// Med `onVelg` (story 3.5, FR-24, UX-DR44) er rutene og Startpunkt-markørene interaktive, og et trykk velger
// kortet. Hver rute har en bred, usynlig trefflinje i et eget lag (`TREFFLAG`) over rutene og under
// markørene. Markørene er knapper (`role="button"`, `tabIndex={0}`, fra Leaflets `keyboard`) med navnet
// «Turforslag N: {mal} fra …» (`markornavn`), 44 px høye, og Enter eller mellomrom velger. Et delt
// Startpunkt velger det første kortet i gruppen som ikke er valgt, og hvert nytt trykk det neste, rundt i
// gruppen (`velgIGruppe`). Rutene har ingen egen tabulatorstopp: markøren gir samme valg. Markørene står
// fast mens valget endres (bare ikonet byttes), så fokuset blir stående på markøren. Kartet zoomer ikke på
// nytt når valget endres. Da er bare dekoren skjult for skjermlesere: flisene, rutene, trefflinjene, Mål og
// etiketten. Uten `onVelg` (Alternativet) er markørene ikke interaktive, og hele kartlaget er skjult.
//
// Kartinfoboksen (Kartinfoboks.tsx) står utenfor kartet, i Resultatet. På PC ligger den over kartet øverst
// til høyre, og kartet holder rutene til venstre for den (`infoboks`). Tegnforklaringen er skjult for
// skjermlesere, fordi alt kartet viser, står i kortene.
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
// zoomknappene under. Tegnforklaringen viser bare Startpunkt. Ved hver prikk står det korte navnet
// (`kortnavn`) fast, som i pc-1. `plasserEtiketter` setter det til høyre, til venstre, over eller under, der
// det ikke dekker andre navn, prikker eller overleggene, og plasseringen gjøres på nytt etter zoom, panorering
// og endret størrelse. Navnene er dekor for skjermlesere. Søk-flaten har en skjult liste med de fulle navnene.
//
// Laster ikke kartflisene (flisvakten i Bakgrunnsfeil.tsx, story 3.4, UX-DR39), fjernes flislaget, og flaten
// blir papirfarget. Ruter, Startpunkter, Mål og kontrollene står som før. Det interaktive kartet og Søk-kartet
// viser teksten «Bakgrunnskartet kunne ikke lastes.» øverst i midten, og begge holder innholdet under den,
// med mindre brukeren har flyttet kartet. På Søk-kartet står teksten midt i plassen til høyre for Omradeboksen. Det statiske kartet
// melder feilen til kortet (`onBakgrunnFeil`), som har den skjulte teksten for skjermlesere
// (Bakgrunnsfeil.tsx).

const MIN_ZOOM = 9;
const MAKS_ZOOM = 17;

/** Sirklene i et delt Startpunkt overlapper 3 px (sirkelen er `PIN`, 29 px). */
const PIN_STEG = 26;
/** Startpunkt-markøren er en knapp på minst 44 × 44 px (SM-4), med sirklene i midten. */
const MARKOR = 44;

/** Laget med de usynlige trefflinjene langs rutene, over rutene (400) og under markørene (600). */
const TREFFLAG = "kart-treff";
const TREFFLAG_STIL = { zIndex: "450" };
/** Trefflinjene er bare for pekeren, ikke for skjermlesere. */
const skjulLag = (lag: HTMLElement | null) => lag?.setAttribute("aria-hidden", "true");
/** Mål og etiketten «omtrentlig rute» er pynt i markørlaget, som ellers har Startpunkt-knappene. */
const SKJULT_IKON: LeafletEventHandlerFnMap = {
  add: (e) => (e.target as LeafletMarker).getElement()?.setAttribute("aria-hidden", "true"),
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
  /**
   * Statisk modus: får `true` når bakgrunnskartet ikke laster, og `false` når kartet fjernes. Kortet viser
   * da den skjulte teksten for skjermlesere (story 3.4).
   */
  onBakgrunnFeil?: (feilet: boolean) => void;
  /**
   * Interaktivt kart (story 3.5): et trykk på en rute eller en Startpunkt-markør, eller Enter og mellomrom på
   * markøren, velger kortet med indeksen.
   */
  onVelg?: (indeks: number) => void;
  /**
   * Kartinfoboksen. Ligger den over kartflaten (PC), holder kartet rutene til venstre for den. Bredden måles
   * når kartet zoomer til rutene, ikke når valget endres.
   */
  infoboks?: () => Element | null;
};

/** Bredden i px som `boks` dekker av kartflaten fra høyre kant (`dekketHoyre` i kart-data.ts). */
const dekket = (flate: Element, boks: Element | null | undefined) =>
  dekketHoyre(flate.getBoundingClientRect(), boks?.getBoundingClientRect() ?? null);

function startikon(numre: readonly { nummer: number; valgt: boolean }[]) {
  const bredde = PIN + (numre.length - 1) * PIN_STEG;
  const flate = Math.max(MARKOR, bredde);
  const html = numre
    .map(({ nummer, valgt }) => `<span class="${stil.pin}${valgt ? ` ${stil.pinValgt}` : ""}">${nummer}</span>`)
    .join("");
  return divIcon({
    className: stil.startpunkt,
    html: `<span class="${stil.pinner}" aria-hidden="true" data-testid="kart-startpunkt">${html}</span>`,
    iconSize: [flate, MARKOR],
    iconAnchor: [flate / 2, MARKOR / 2],
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

/** Trefflinjen til en rute får nummeret til kortet, så testene kan finne den. */
function merkTreff(lag: LeafletGeoJSON, nummer: number) {
  lag.eachLayer((l) => {
    const sti = (l as Path).getElement();
    sti?.setAttribute("data-testid", "kart-rute-treff");
    sti?.setAttribute("data-nummer", String(nummer));
  });
}

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

/** Feiltilstanden når flisene ikke laster (story 3.4), med hendelsene til flislaget. */
function useBakgrunnFeil() {
  const [feilet, settFeilet] = useState(false);
  const vakt = useMemo(() => flisvakt(() => settFeilet(true)), []);
  useEffect(() => vakt.stopp, [vakt]);
  return [feilet, vakt.hendelser] as const;
}

/** Bunnen av elementet i px fra toppen av kartflaten, eller 0 når det er tomt. */
const bunnAv = (el: HTMLElement | null) => (el && el.offsetHeight > 0 ? el.offsetTop + el.offsetHeight : 0);

export function Kart({
  kort: alleKort,
  valgt,
  statisk = false,
  omrade: fastOmrade,
  merker,
  onBakgrunnFeil,
  onVelg,
  infoboks,
}: KartProps) {
  const interaktiv = !statisk && onVelg !== undefined;
  // Kartutsnittet viser bare kortets egen rute og Startpunkt (UX-DR38), ikke Mål.
  const kort = useMemo(
    () => (statisk ? alleKort.map((k) => ({ ...k, kart: { ...k.kart, malpunkt: undefined } })) : alleKort),
    [alleKort, statisk],
  );
  const [kart, settKart] = useState<LeafletKart | null>(null);
  const zoom = useZoom(kart);
  const forklaring = useRef<HTMLDivElement>(null);
  const feil = useRef<HTMLDivElement>(null);
  const [bakgrunnFeilet, flis] = useBakgrunnFeil();
  // Leaflet leser valgene bare når kartet lages, så «Reduser bevegelse» leses én gang.
  // Det statiske kartet flytter seg aldri selv, så det har ingen animasjoner.
  const [rolig] = useState(() => statisk || window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const omrade = useMemo(() => fastOmrade ?? grenser(kort), [fastOmrade, kort]);
  const lag = useMemo(() => {
    const andre = [...kort.keys()].filter((i) => i !== valgt);
    // Den valgte ruten tegnes sist, så den ligger øverst.
    const rekkefolge = kort[valgt] ? [...andre, valgt] : andre;
    const ruter = rekkefolge.map((i) => ({ kort: kort[i], indeks: i, valgt: i === valgt }));
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
        gruppe,
        navn: markornavn(kort, gruppe),
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
  // Har brukeren dratt eller zoomet det interaktive kartet, beholdes utsnittet hennes til kartflaten selv får
  // en ny størrelse, også når teksten om bakgrunnskartet kommer, som i Startpunktkart.
  useEffect(() => {
    if (!kart || !omrade) return;
    const flate = kart.getContainer();
    let egen = false;
    let brukerStyrt = false;
    let forrige = { bredde: 0, hoyde: 0 };
    const merkBruker = () => {
      if (!egen) brukerStyrt = true;
    };
    if (!statisk) kart.on("dragstart zoomstart", merkBruker);
    const tilpass = () => {
      if (flate.clientWidth === 0 || flate.clientHeight === 0) return;
      const nyStorrelse = flate.clientWidth !== forrige.bredde || flate.clientHeight !== forrige.hoyde;
      forrige = { bredde: flate.clientWidth, hoyde: flate.clientHeight };
      if (brukerStyrt && !nyStorrelse) return;
      egen = true;
      try {
        kart.invalidateSize({ pan: false });
        if (fastOmrade) kart.fitBounds(omrade, MARG_OMRADE);
        else if (statisk) tilpassStatisk(kart, omrade, kort, merker?.() ?? []);
        else {
          const hoyde = forklaring.current?.offsetHeight ?? FORKLARING_EN_LINJE;
          const dekketAv = dekket(flate, infoboks?.());
          kart.fitBounds(omrade, marg(hoyde, bredesteMarkor, bunnAv(feil.current), dekketAv));
        }
      } finally {
        egen = false;
      }
    };
    const observator = new ResizeObserver(tilpass);
    observator.observe(flate);
    if (forklaring.current) observator.observe(forklaring.current);
    // Teksten om bakgrunnskartet er 0 px høy til flisene feiler. Da zoomer kartet på nytt under den.
    if (feil.current) observator.observe(feil.current);
    for (const merke of merker?.() ?? []) observator.observe(merke);
    return () => {
      observator.disconnect();
      kart.off("dragstart zoomstart", merkBruker);
    };
  }, [kart, omrade, kort, bredesteMarkor, statisk, fastOmrade, merker, infoboks]);

  // Det interaktive kartet: bare dekoren er skjult for skjermlesere, og markørene er tilgjengelige.
  useEffect(() => {
    if (!kart || !interaktiv) return;
    for (const navn of ["tilePane", "shadowPane", "overlayPane", "tooltipPane", "popupPane"]) {
      skjulLag(kart.getPane(navn) ?? null);
    }
  }, [kart, interaktiv]);

  /** Hendelsene til en Startpunkt-markør: navnet, trykk, og Enter eller mellomrom. */
  /**
   * En markør som får fokus, flyttes inn i den synlige delen av kartet: innenfor zoomknappene,
   * tegnforklaringen og teksten om bakgrunnskartet, og til venstre for Kartinfoboksen på PC. Nettleseren ruller
   * Leaflet-flaten selv for å vise et fokusert element utenfor den, så rullingen settes tilbake først.
   */
  const visMarkor = useCallback(
    (markor: LeafletMarker) => {
      if (!kart) return;
      const flate = kart.getContainer();
      flate.scrollTop = 0;
      flate.scrollLeft = 0;
      const hoyde = forklaring.current?.offsetHeight ?? FORKLARING_EN_LINJE;
      const { paddingTopLeft, paddingBottomRight } = marg(
        hoyde,
        bredesteMarkor,
        bunnAv(feil.current),
        dekket(flate, infoboks?.()),
      );
      kart.panInside(markor.getLatLng(), { paddingTopLeft, paddingBottomRight, animate: !rolig });
    },
    [kart, bredesteMarkor, infoboks, rolig],
  );
  // Fokuslytteren settes når markøren legges til, så den kaller alltid den siste `visMarkor`.
  const visMarkorRef = useRef(visMarkor);
  useEffect(() => {
    visMarkorRef.current = visMarkor;
  }, [visMarkor]);

  const markorhendelser = useCallback(
    (gruppe: Startgruppe, navn: string): LeafletEventHandlerFnMap | undefined => {
      if (!interaktiv || !onVelg) return undefined;
      const velg = () => onVelg(velgIGruppe(gruppe, valgt));
      return {
        add: (e) => {
          const markor = e.target as LeafletMarker;
          const element = markor.getElement();
          element?.setAttribute("aria-label", navn);
          element?.addEventListener("focus", () => visMarkorRef.current(markor));
        },
        click: velg,
        keydown: (e) => {
          const tast = (e as LeafletKeyboardEvent).originalEvent;
          if (tast.key !== "Enter" && tast.key !== " ") return;
          tast.preventDefault();
          if (!tast.repeat) velg();
        },
      };
    },
    [interaktiv, onVelg, valgt],
  );

  // Det statiske kartet melder feilen til kortet, og trekker den tilbake når kartet fjernes.
  useEffect(() => {
    if (!bakgrunnFeilet || !onBakgrunnFeil) return;
    onBakgrunnFeil(true);
    return () => onBakgrunnFeil(false);
  }, [bakgrunnFeilet, onBakgrunnFeil]);

  if (!omrade) return null;

  const flateklasse = statisk ? stil.statisk : stil.flate;
  return (
    <div
      className={bakgrunnFeilet ? `${flateklasse} ${stil.flisfeil}` : flateklasse}
      data-testid={statisk ? "kart-statisk" : "kart"}
    >
      <div className={stil.kartlag} aria-hidden={interaktiv ? undefined : "true"}>
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
          {!bakgrunnFeilet && (
            <TileLayer url={KARTFLISER_URL} minZoom={MIN_ZOOM} maxZoom={MAKS_ZOOM} eventHandlers={flis} />
          )}
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
              <Marker
                key={turId}
                position={[punkt.lat, punkt.lon]}
                icon={ikon}
                interactive={false}
                keyboard={false}
                eventHandlers={SKJULT_IKON}
              />
            ))}
            {lag.etikett && (
              <Marker
                position={[lag.etikett.punkt.lat, lag.etikett.punkt.lon]}
                icon={lag.etikett.ikon}
                interactive={false}
                keyboard={false}
                eventHandlers={SKJULT_IKON}
              />
            )}
          </Fragment>
          {/* Trefflinjene langs rutene: et trykk velger kortet. Den valgte ligger øverst, som ruten. */}
          {interaktiv && onVelg && (
            <Pane name={TREFFLAG} ref={skjulLag} style={TREFFLAG_STIL}>
              {lag.ruter.map(({ kort: k, indeks }) => (
                <GeoJSON
                  key={`${k.turId}-${indeks === valgt}`}
                  data={k.kart.rute}
                  style={{ className: stil.treff }}
                  eventHandlers={{
                    add: (e) => merkTreff(e.target as LeafletGeoJSON, k.kart.nummer),
                    click: () => onVelg(indeks),
                  }}
                />
              ))}
            </Pane>
          )}
          {/* Markørene står fast når valget endres, så fokuset blir stående. Bare ikonet byttes. */}
          {lag.starter.map(({ nokkel, punkt, harValgt, ikon, gruppe, navn }) => (
            <Marker
              key={nokkel}
              position={[punkt.lat, punkt.lon]}
              icon={ikon}
              interactive={interaktiv}
              keyboard={interaktiv}
              autoPanOnFocus={false}
              zIndexOffset={harValgt ? 1000 : 0}
              eventHandlers={markorhendelser(gruppe, navn)}
            />
          ))}
        </MapContainer>
      </div>

      {!statisk && (
        <KartKontroller
          kart={kart}
          zoom={zoom}
          forklaring={forklaring}
          harMal={harMal(kort)}
          feil={feil}
          bakgrunnFeilet={bakgrunnFeilet}
        />
      )}
    </div>
  );
}

/** Prikken på Søk-kartet med det korte navnet ved siden av. Navnet står til høyre til det er plassert. */
const prikkikon = (kortnavn: string) =>
  divIcon({
    className: stil.startpunkt,
    html:
      `<span class="${stil.prikk}" aria-hidden="true" data-testid="sok-kart-startpunkt"></span>` +
      `<span class="${stil.startnavn}" aria-hidden="true" data-testid="sok-kart-startnavn" data-plass="hoyre">` +
      `${somHtml(kortnavn)}</span>`,
    iconSize: [SOK_PRIKK, SOK_PRIKK],
    iconAnchor: [SOK_PRIKK / 2, SOK_PRIKK / 2],
  });

/** Et element målt i px fra øverste venstre hjørne av `flate`, eller `null` når det ikke har størrelse. */
function iFlaten(el: HTMLElement | null, flate: DOMRect): Flatrekt | null {
  const r = el?.getBoundingClientRect();
  if (!r || r.width === 0 || r.height === 0) return null;
  return { x: r.left - flate.left, y: r.top - flate.top, bredde: r.width, hoyde: r.height };
}

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

/**
 * Målene til overleggene i Søk-kartet (`sokflate` i kart-data.ts). `hjorne` er hele hjørnegruppen, med
 * Omradeboksen og zoomknappene, og `feil` er teksten om bakgrunnskartet. Alt måles i vinduet, så det ikke
 * avhenger av hvilket element som er utgangspunktet for `offsetTop`.
 */
function malSokflate(
  flate: HTMLElement,
  hjorne: HTMLElement | null,
  feil: HTMLElement | null,
  bunn: (HTMLElement | null)[],
): Sokflate {
  const mal = (el: HTMLElement | null) => el?.getBoundingClientRect() ?? null;
  const innside = { top: flate.getBoundingClientRect().top + flate.clientTop, hoyde: flate.clientHeight };
  return sokflate(innside, mal(hjorne), mal(feil), bunn.map(mal));
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
  const hjornegruppe = useRef<HTMLDivElement>(null);
  const feil = useRef<HTMLDivElement>(null);
  const [bakgrunnFeilet, flis] = useBakgrunnFeil();
  const [rolig] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const omrade = useMemo(() => punktgrenser(startpunkter), [startpunkter]);
  const ikoner = useMemo(() => startpunkter.map((p) => prikkikon(p.kortnavn)), [startpunkter]);
  const markorer = useRef<(LeafletMarker | null)[]>([]);

  // Navnene ved prikkene plasseres etter zoom og panorering, når kartflaten eller overleggene endrer
  // størrelse, når en markør legges til, og når skrifta er lastet (bredden endres da). Flere hendelser i
  // samme bilde gir én plassering.
  const planlegg = useRef<() => void>(() => {});
  const markorhendelser = useMemo<LeafletEventHandlerFnMap>(() => ({ add: () => planlegg.current() }), []);

  useEffect(() => {
    if (!kart) return;
    let bilde = 0;
    let aktiv = true;
    const plasser = () => {
      bilde = 0;
      const boks = kart.getContainer().getBoundingClientRect();
      const navn = startpunkter.map(
        (_, i) => markorer.current[i]?.getElement()?.querySelector<HTMLElement>("[data-plass]") ?? null,
      );
      const punkter = startpunkter.map((p, i) => {
        const { x, y } = kart.latLngToContainerPoint([p.lat, p.lon]);
        return { x, y, bredde: navn[i]?.offsetWidth ?? 0, hoyde: navn[i]?.offsetHeight ?? 0 };
      });
      const overlegg = [hjornegruppe.current, feil.current, forklaring.current, kreditering.current];
      const hindringer = overlegg.map((el) => iFlaten(el, boks)).filter((r): r is Flatrekt => r !== null);
      const valgte = plasserEtiketter(punkter, { bredde: boks.width, hoyde: boks.height }, hindringer);
      navn.forEach((el, i) => el?.setAttribute("data-plass", valgte[i]));
    };
    const p = () => {
      if (aktiv && bilde === 0) bilde = requestAnimationFrame(plasser);
    };
    planlegg.current = p;
    kart.on("zoomend moveend resize", p);
    const observator = new ResizeObserver(p);
    for (const el of [flate.current, hjornegruppe.current, feil.current, forklaring.current, kreditering.current]) {
      if (el) observator.observe(el);
    }
    // En skrift som lastes senere, endrer bredden på navnene.
    void document.fonts?.ready.then(p);
    document.fonts?.addEventListener("loadingdone", p);
    p();
    return () => {
      aktiv = false;
      planlegg.current = () => {};
      kart.off("zoomend moveend resize", p);
      document.fonts?.removeEventListener("loadingdone", p);
      observator.disconnect();
      cancelAnimationFrame(bilde);
    };
  }, [kart, startpunkter]);

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
        const bunn = [forklaring.current, kreditering.current];
        const maal = malSokflate(f, hjornegruppe.current, feil.current, bunn);
        kart.fitBounds(omrade, sokTilpasning(maal));
      } finally {
        egen = false;
      }
    };
    const observator = new ResizeObserver(tilpass);
    const overlegg = [hjornegruppe.current, feil.current, forklaring.current, kreditering.current];
    for (const el of [flate.current, ...overlegg]) {
      if (el) observator.observe(el);
    }
    return () => {
      observator.disconnect();
      kart.off("dragstart zoomstart", merkBruker);
    };
  }, [kart, omrade]);

  // Teksten om bakgrunnskartet (story 3.4) står midt i plassen til høyre for Omradeboksen. Høyre kant av
  // boksen settes før kartet tegnes første gang, og på nytt når boksen eller kartflaten endrer størrelse.
  useLayoutEffect(() => {
    const f = flate.current;
    const h = hjorne.current;
    if (!f || !h) return;
    const mal = () => {
      const hoyre = h.getBoundingClientRect().right - f.getBoundingClientRect().left;
      f.style.setProperty("--hjorne-hoyre", `${hoyre}px`);
    };
    mal();
    const observator = new ResizeObserver(mal);
    observator.observe(h);
    observator.observe(f);
    return () => observator.disconnect();
  }, [omrade]);

  if (!omrade) return null;

  return (
    <div
      ref={flate}
      className={`${stil.flate} ${stil.fyll}${bakgrunnFeilet ? ` ${stil.flisfeil}` : ""}`}
      data-testid="sok-kart-flate"
    >
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
          {!bakgrunnFeilet && (
            <TileLayer url={KARTFLISER_URL} minZoom={MIN_ZOOM} maxZoom={MAKS_ZOOM} eventHandlers={flis} />
          )}
          {startpunkter.map((p, i) => (
            <Marker
              key={`${p.navn}|${p.lat},${p.lon}`}
              ref={(m) => {
                markorer.current[i] = m;
              }}
              position={[p.lat, p.lon]}
              icon={ikoner[i]}
              interactive={false}
              keyboard={false}
              eventHandlers={markorhendelser}
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
        hjorneRef={hjornegruppe}
        feil={feil}
        bakgrunnFeilet={bakgrunnFeilet}
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
  /** Søk-kartet måler hele hjørnet, med zoomknappene, så Startpunktene holdes under det. */
  hjorneRef?: Ref<HTMLDivElement>;
  /** Bakgrunnskartet laster ikke (story 3.4): teksten står øverst i midten. */
  bakgrunnFeilet: boolean;
  /** Kartet måler teksten, så innholdet holdes under den. */
  feil?: Ref<HTMLDivElement>;
};

/** Zoomknappene, tegnforklaringen og krediteringspillen over det interaktive kartet. */
function KartKontroller({
  kart,
  zoom,
  forklaring,
  kreditering,
  harMal,
  bareStartpunkt,
  hjorne,
  hjorneRef,
  bakgrunnFeilet,
  feil,
}: KontrollerProps) {
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
        <div ref={hjorneRef} className={stil.hjorne}>
          {hjorne}
          {zoomknapper}
        </div>
      ) : (
        zoomknapper
      )}

      <Bakgrunnsfeil ref={feil} feilet={bakgrunnFeilet} />

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
