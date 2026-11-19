"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Sok } from "@/kjerne/sok";
import type { DittSok as DittSokData, Resultatvisning } from "@/kjerne/visning/skjema";
import { Ansvarsmerknad } from "./Ansvarsmerknad";
import { BedreTidsvinduKort } from "./BedreTidsvinduKort";
import { useBegrunnelser } from "./begrunnelser";
import { DittSok } from "./DittSok";
import { DittSokLinje } from "./DittSokLinje";
import { FraradetKort } from "./FraradetKort";
import { Kartinfoboks } from "./Kartinfoboks";
import { KartLaster } from "./KartLaster";
import { Knapp } from "./Knapp";
import { Kontaktfeil } from "./Kontaktfeil";
import { Plassholderstokk } from "./Plassholderstokk";
import stil from "./Resultat.module.css";
import skjult from "./skjult.module.css";
import { Stokk } from "./Stokk";
import { Stokkoversikt } from "./Stokkoversikt";
import { ENDRE_TILGJENGELIG_TID, KART } from "./tekster";
import { useEndreSokIToppfelt } from "./ToppfeltHandling";
import { Turkort } from "./Turkort";
import { Vaermangel } from "./Vaermangel";
import { Vaersammendrag } from "./Vaersammendrag";
import { Vaervarsling } from "./Vaervarsling";

// Resultat-flaten (EXPERIENCE.md › Information Architecture og State Patterns). Demomodus-merket står i
// toppfeltet og Krediteringen i bunnen (Side). Alt innhold kommer ferdig fra Resultatvisningen.
//
// Tilstandene:
// - Venter: Ditt søk og Plassholderstokken der kortene ellers står.
// - Resultat med Turforslag. PC (fra 1200 px): Ditt søk som panel, vær-delen, overskriften, kartet,
//   Turkortene side om side og Ansvarsmerknaden. Mobil og nettbrett: Ditt søk som én linje med «Endre
//   søk» i toppfeltet, vær-delen, overskriften, Stokken med Stokknavigasjon, kartet, Stokkoversikten og
//   Ansvarsmerknaden. Begge oppsettene står i DOM-en, og CSS viser ett av dem ved 1200 px. Kartet står
//   én gang, mellom Stokken og Stokkoversikten. På PC er de skjult, så kartet står over kortene uten at
//   rekkefølgen i DOM-en endres (UX-DR13).
//   Vær-delen er Værsammendraget (god og middels), Værvarslingen med Bedre tidsvindu-boksen (dårlig)
//   eller Værmangel-linjen.
// - Resultat med Alternativ: som over, men med Alternativkortet, «Endre Tilgjengelig tid», teksten
//   under og Ansvarsmerknaden. Ingen Stokk og ingen Stokkoversikt, og kortet står likt ved alle bredder.
//   Kartet viser ruten til den korteste Turen, i samme bredde som kortet. Det står over kortet på PC og
//   etter det på mobil og nettbrett. Begge plassene står i DOM-en, og CSS viser én, så rekkefølgen i
//   DOM-en er den samme som på skjermen ved alle bredder. Det skjulte kartet tilpasses når det vises.
// - Frarådet: Ditt søk med «Endre søk», overskriften «Ingen Turforslag», Frarådet-kortet og Bedre
//   tidsvindu-kortet, ved siden av hverandre på PC og under hverandre på mobil. Ingen vær-del, kart,
//   Ansvarsmerknad eller Turkort.
// - Kontaktfeil: Ditt søk og Kontaktfeil-kortet. Ingen kart, Ansvarsmerknad eller Stokkoversikt.
//
// «Bruk …» i Bedre tidsvindu-boksen og Bedre tidsvindu-kortet sender `nyttSok` fra serveren med
// `onBrukBedreTidsvindu`, gjennom samme flyt som «Finn tur», og det nye Resultatet erstatter dette.
//
// Valgt kort er én tilstand her (indeks, kort 1 fra start), og den eneste sannheten for kortene på PC,
// Stokken, Stokkoversikten, Kartutsnittet, kartet og Kartinfoboksen (story 3.5, FR-24). Stokken viser det
// valgte kortet, kartet uthever det, og Kartinfoboksen viser det. Valget endres av Stokken og
// Stokkoversikten (mobil og nettbrett), av et trykk på et kort eller «Vis på kartet» (PC), og av et trykk på
// en rute eller et Startpunkt i kartet, som da blar Stokken til kortet. Kartutsnittet i kortet på mobil og
// nettbrett ruller til kartet (story 3.2). «Vis på kartet» på PC ruller kartet inn bare når det ikke synes
// helt. Et nytt Søk (ny `resultatId`) setter valget tilbake til kort 1.
//
// Begrunnelsen (story 4.2): for hvert Turforslag ber `useBegrunnelser` om en Språkmodelltekst, og
// Turkortene i Stokken og på PC viser den i stedet for Regelteksten når den kom innen 5 s i samme Resultat.
//
// Komponenten står alltid i treet, også på Søk, slik at det høflige live-området overlever byttet
// mellom flatene. I live-området står `liveTekst` (skjult, bare for skjermlesere), Plassholderstokken med
// «Finner turer …» eller Kontaktfeil-kortet, så de meldes når de settes inn. `liveTekst` er overskriften,
// og ved dårlig vær også tittelen på Værvarslingen. Overskriften står rett etter live-området. Hver ny
// tilstand flytter fokus: til overskriften, til tittelen på Kontaktfeil-kortet, eller til
// Plassholderstokken, og siden ruller dit.

export type Resultattilstand =
  /** Søket er sendt, og svaret venter. `dittSok` er Søket som ble sendt. */
  | { type: "venter"; id: string; dittSok: DittSokData }
  | { type: "resultat"; visning: Resultatvisning }
  /** Ingen kontakt, eller feil fra serveren. `dittSok` er Søket som Kontaktfeil gjelder for. */
  /** `kanProveIgjen` er false når serveren avviste Søket (400): samme Søk ville gitt samme feil. */
  | { type: "kontaktfeil"; id: string; dittSok: DittSokData; kanProveIgjen: boolean };

type Props = {
  /** Tilstanden som vises, eller `null` på Søk. */
  tilstand: Resultattilstand | null;
  onEndreSok: () => void;
  onEndreTilgjengeligTid: () => void;
  onProvIgjen: () => void;
  /** «Bruk …» i Bedre tidsvindu: sender det nye Søket fra serveren. */
  onBrukBedreTidsvindu: (sok: Sok) => void;
  /** Demo-ID-en fra sidedataene, eller `null` uten Demomodus. Går som `?demo=` til `/api/begrunnelse`. */
  demoId: string | null;
  /** Miljøet har en språkmodell (sidedataene). Uten den sendes ingen forespørsler til `/api/begrunnelse`. */
  sprakmodell: boolean;
};

/** Kartområdet: en region med navnet «Kart» som Kartutsnittet kan flytte fokus til. Ikke et tabulatorstopp. */
const KARTOMRADE = { role: "region", "aria-label": KART.navn, tabIndex: -1 } as const;

const tilstandId = (t: Resultattilstand | null) => (t === null ? null : t.type === "resultat" ? t.visning.resultatId : t.id);

export function Resultat({
  tilstand,
  onEndreSok,
  onEndreTilgjengeligTid,
  onProvIgjen,
  onBrukBedreTidsvindu,
  demoId,
  sprakmodell,
}: Props) {
  const overskrift = useRef<HTMLHeadingElement>(null);
  const plassholder = useRef<HTMLParagraphElement>(null);
  const stokk = useRef<HTMLElement>(null);
  /** Kartet på mobil og nettbrett, som Kartutsnittet ruller til. */
  const kartet = useRef<HTMLDivElement>(null);
  const id = tilstandId(tilstand);
  const visning = tilstand?.type === "resultat" ? tilstand.visning : null;
  const resultatId = visning?.resultatId ?? null;
  const begrunnelser = useBegrunnelser(visning, demoId, sprakmodell);

  // Valget gjelder Resultatet det ble gjort i. Et nytt Resultat starter på kort 1.
  const [valg, settValg] = useState<{ resultatId: string | null; indeks: number }>({ resultatId, indeks: 0 });
  const valgt = valg.resultatId === resultatId ? valg.indeks : 0;
  const velg = useCallback((indeks: number) => settValg({ resultatId, indeks }), [resultatId]);
  /** Kartinfoboksen på PC, som kartet holder rutene klar av. */
  const infoboks = useRef<HTMLDivElement>(null);
  const finnInfoboks = useCallback(() => infoboks.current, []);

  // Fokus og rulling ved hver ny tilstand. Overskriften i Resultatet og tittelen på Kontaktfeil-kortet
  // deler `overskrift`. Mens svaret venter, får «Finner turer …» fokus, og siden ruller til toppen av
  // Plassholderstokken.
  useEffect(() => {
    if (id === null) return;
    const element = overskrift.current ?? plassholder.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    const rull = element === plassholder.current ? (element.parentElement ?? element) : element;
    rull.scrollIntoView({ block: "start" });
  }, [id]);

  const turforslag = visning?.utfall.type === "turforslag" ? visning.utfall.kort : null;
  const alternativ = visning?.utfall.type === "kortesteTur" ? visning.utfall : null;
  const alternativKart = useMemo(() => (alternativ ? [alternativ.kort] : null), [alternativ]);
  // Frarådet: utfallet og Værklassen smalnes én gang. Skjemaet krever vurdert vær og Bedre tidsvindu ved
  // frarådet. Mangler været likevel, står Ditt søk med «Endre søk» og overskriften, så siden aldri er tom.
  // Mangler Bedre tidsvindu, står Frarådet-kortet alene.
  const fraradet =
    visning?.utfall.type === "fraradet" && visning.vaer.type === "vurdert"
      ? { utfall: visning.utfall, vaer: visning.vaer, bedreTidsvindu: visning.bedreTidsvindu }
      : null;

  // «Endre søk» står i toppfeltet på mobil og nettbrett ved et Resultat, også ved frarådet.
  useEndreSokIToppfelt(visning ? onEndreSok : null);

  /** Stokkoversikten: velg kortet, og gå tilbake til Stokken med fokus. */
  function velgFraOversikt(indeks: number) {
    velg(indeks);
    const element = stokk.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    const rolig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ block: "start", behavior: rolig ? "auto" : "smooth" });
  }

  /**
   * Kartutsnittet i kortet: rull til kartet, og flytt fokus til kartområdet, så tastatur og skjermleser
   * følger med. Kortet er allerede det valgte, fordi Stokken viser det valgte kortet, og Alternativet har
   * bare ett.
   */
  function visPaKartet() {
    const element = kartet.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    const rolig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ block: "start", behavior: rolig ? "auto" : "smooth" });
  }

  /**
   * «Vis på kartet» på PC: rull kartet inn når det ikke synes helt. Siden ruller ikke når kartet synes helt,
   * eller når det er høyere enn vinduet og allerede fyller det (fra rullemargen øverst til bunnen av vinduet).
   * Fokuset blir stående på knappen.
   */
  function rullInnKartet() {
    const element = kartet.current;
    if (!element) return;
    const r = element.getBoundingClientRect();
    const marg = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
    const synesHelt = r.top >= 0 && r.bottom <= window.innerHeight;
    const fyller = r.top <= marg && r.bottom >= window.innerHeight;
    if (synesHelt || fyller) return;
    const rolig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ block: "start", behavior: rolig ? "auto" : "smooth" });
  }

  // Ditt søk øverst: fra Resultatvisningen, eller Søket som ble sendt mens svaret venter og ved Kontaktfeil.
  // Bare Resultatet har «Endre søk» i Ditt søk. Kontaktfeil-kortet har knappen selv.
  const dittSok = visning
    ? visning.dittSok
    : tilstand && tilstand.type !== "resultat"
      ? tilstand.dittSok
      : null;

  return (
    <div className={tilstand ? stil.resultat : undefined}>
      {tilstand && dittSok && (
        <div key={`topp-${id}`} className={stil.topp}>
          <div className={stil.pc}>
            <DittSok dittSok={dittSok} onEndreSok={visning ? onEndreSok : undefined} />
          </div>
          <div className={stil.mobil}>
            <DittSokLinje dittSok={dittSok} />
          </div>
          {visning && (
            <Vaerdelen
              vaer={visning.vaer}
              bedreTidsvindu={visning.bedreTidsvindu}
              onBrukBedreTidsvindu={onBrukBedreTidsvindu}
            />
          )}
        </div>
      )}

      <div>
        <div aria-live="polite">
          {visning && (
            <p key={visning.resultatId} className={skjult.skjult} data-testid="live-tekst">
              {visning.liveTekst}
            </p>
          )}
          {tilstand?.type === "venter" && <Plassholderstokk key={tilstand.id} tekstRef={plassholder} />}
          {tilstand?.type === "kontaktfeil" && (
            <Kontaktfeil
              key={tilstand.id}
              tittelRef={overskrift}
              onProvIgjen={tilstand.kanProveIgjen ? onProvIgjen : null}
              onEndreSok={onEndreSok}
            />
          )}
        </div>
        {visning && (
          <h1 key={visning.resultatId} ref={overskrift} tabIndex={-1} className={stil.overskrift}>
            {visning.overskrift}
          </h1>
        )}
      </div>

      {visning && turforslag && (
        <div key={`bunn-${visning.resultatId}`} className={stil.bunn}>
          <div className={stil.mobil}>
            <Stokk
              ref={stokk}
              kort={turforslag}
              valgt={valgt}
              onVelg={velg}
              onVisPaKartet={visPaKartet}
              begrunnelser={begrunnelser}
            />
          </div>
          <div ref={kartet} className={stil.kartplass} {...KARTOMRADE}>
            {turforslag[valgt] && (
              <Kartinfoboks ref={infoboks} kort={turforslag[valgt]} antall={turforslag.length} live />
            )}
            <KartLaster kort={turforslag} valgt={valgt} onVelg={velg} infoboks={finnInfoboks} />
          </div>
          <div className={stil.mobil}>
            <Stokkoversikt kort={turforslag} valgt={valgt} onVelg={velgFraOversikt} />
          </div>
          <div className={`${stil.pc} ${stil.kortene}`} data-testid="kortraden">
            {turforslag.map((kort, i) => (
              <Turkort
                key={kort.turId}
                kort={kort}
                antall={turforslag.length}
                begrunnelse={begrunnelser.get(kort.turId)}
                valgt={i === valgt}
                onVelg={() => velg(i)}
                onVisPaKartet={rullInnKartet}
              />
            ))}
          </div>
          <Ansvarsmerknad />
        </div>
      )}

      {visning && alternativ && (
        <div key={`bunn-${visning.resultatId}`} className={stil.bunn}>
          {alternativKart && (
            <div className={`${stil.pc} ${stil.alternativKart} ${stil.kartplass}`}>
              <Kartinfoboks ref={infoboks} kort={alternativ.kort} antall={1} alternativ />
              <KartLaster kort={alternativKart} valgt={0} infoboks={finnInfoboks} />
            </div>
          )}
          <div className={stil.alternativ}>
            <Turkort kort={alternativ.kort} antall={1} alternativ onVisPaKartet={visPaKartet} />
            <div className={stil.alternativHandling}>
              <Knapp className={stil.endreTid} onClick={onEndreTilgjengeligTid}>
                {ENDRE_TILGJENGELIG_TID}
              </Knapp>
              <p className={stil.passerMed} data-testid="passer-med">
                {alternativ.passerMedTekst}
              </p>
            </div>
          </div>
          {alternativKart && (
            <div ref={kartet} className={`${stil.mobil} ${stil.alternativKart} ${stil.kartplass}`} {...KARTOMRADE}>
              <Kartinfoboks kort={alternativ.kort} antall={1} alternativ />
              <KartLaster kort={alternativKart} valgt={0} />
            </div>
          )}
          <Ansvarsmerknad />
        </div>
      )}

      {visning && fraradet && (
        <div key={`bunn-${visning.resultatId}`} className={stil.bunn}>
          <div className={stil.fraradet}>
            <FraradetKort vaer={fraradet.vaer} utfall={fraradet.utfall} />
            {fraradet.bedreTidsvindu && (
              <BedreTidsvinduKort bedreTidsvindu={fraradet.bedreTidsvindu} onBruk={onBrukBedreTidsvindu} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type VaerdelenProps = {
  vaer: Resultatvisning["vaer"];
  bedreTidsvindu: Resultatvisning["bedreTidsvindu"];
  onBrukBedreTidsvindu: (sok: Sok) => void;
};

/**
 * Vær-delen mellom Ditt søk og overskriften: Værsammendraget, Værvarslingen med Bedre tidsvindu-boksen,
 * eller Værmangel-linjen. Ved frarådet er det ingen vær-del, fordi Frarådet-kortet har verdiene.
 */
function Vaerdelen({ vaer, bedreTidsvindu, onBrukBedreTidsvindu }: VaerdelenProps) {
  if (vaer.type === "mangler") return <Vaermangel />;
  if (vaer.klasse === "darlig") {
    return <Vaervarsling vaer={vaer} bedreTidsvindu={bedreTidsvindu} onBrukBedreTidsvindu={onBrukBedreTidsvindu} />;
  }
  if (vaer.klasse === "god" || vaer.klasse === "middels") return <Vaersammendrag vaer={vaer} />;
  return null;
}
