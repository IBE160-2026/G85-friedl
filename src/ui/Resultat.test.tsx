import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Resultatvisning, Turkort as TurkortData } from "@/kjerne/visning/skjema";
import { Dagslysstolpe } from "./Dagslysstolpe";
import { medHake } from "./Hake";
import { Resultat, type Resultattilstand } from "./Resultat";
import { Tidsstolpe } from "./Tidsstolpe";

// Komponenttest for Resultatet uten vær. Flaten rendres på serveren og sjekkes i HTML-en, uten
// nettleser. Oppførselen i nettleseren testes i e2e/resultat.spec.ts og e2e/stokk.spec.ts.
// Både kortraden for PC og Stokken for mobil og nettbrett står i HTML-en. CSS viser ett av dem.

function kort(nummer: number, onsker: TurkortData["kriterier"][2]): TurkortData {
  return {
    turId: `tur-${nummer}`,
    mal: `Mål ${nummer}`,
    fra: "fra Startpunktet",
    startpunktTekst: "Startpunkt: Parkering",
    faktalinje: "5,0 km · 318 høydemeter · høyeste punkt 527 moh · Middels",
    kriterier: [
      { rad: "tid", merke: "ok", tekst: "1 t 32 min av 2 t", detalj: ["gangtid, uten pauser"] },
      { rad: "vaer", merke: "ingen", tekst: "ikke vurdert", detalj: ["Værmeldingen fra MET mangler"] },
      onsker,
      {
        rad: "morke",
        merke: "se-opp",
        tekst: "Mørkevarsel: tilbake ca. 15:32",
        detalj: ["Sola går ned 15:59.", "Lurt å ta med hodelykt."],
      },
    ],
    tidsstolpe: { fyll: 0.77, overGrense: 0 },
    dagslysstolpe: {
      startTekst: "13:30",
      slutt: { andel: 0.62, tekst: "tilbake 15:02" },
      skumring: 0.8,
      solNed: { andel: 1, tekst: "sol ned 15:59" },
      solOpp: null,
    },
    regeltekst: "passer tiden din (1 t 32 min av 2 t), værdata mangler, utsikt",
    kartinfoboks: { navn: `Mål ${nummer}`, tekst: "5,0 km · Middels" },
    stokkoversiktRad: "1 t 32 min uten pauser · tilbake 15:02",
    lesetekst: `Turforslag ${nummer} av 2: Mål ${nummer}. Turtid: 1 t 32 min av 2 t, gangtid uten pauser.`,
    kilde: { navn: "morotur.no", url: "https://www.morotur.no/tur" },
    kart: {
      rute: {
        type: "Feature",
        geometry: { type: "MultiLineString", coordinates: [[[7.1, 62.7], [7.2, 62.8]]] },
        properties: {},
      },
      startpunkt: { lat: 62.7, lon: 7.1 },
      nummer,
    },
  };
}

const visning: Resultatvisning = {
  resultatId: "r1",
  sok: { dato: "2026-11-09", start: "13:30", tilgjengeligMin: 120, vanskelighetsgrad: "B", utsikt: true, vann: true },
  overskrift: "To Turforslag som passer tiden din",
  dittSok: {
    turdag: "I dag, man. 9. nov.",
    starttidspunkt: "13:30",
    tilgjengeligTid: "2 t",
    vanskelighetsgrad: "Middels",
    opplevelsespreferanser: [],
  },
  liveTekst: "To Turforslag som passer tiden din",
  vaer: { type: "mangler", tekst: "Været er ikke vurdert. Vi fikk ikke hentet Værmeldingen fra MET." },
  utfall: {
    type: "turforslag",
    kort: [
      kort(1, { rad: "onsker", merke: "ok", tekst: "utsikt ✓ · vann –", detalj: [] }),
      kort(2, { rad: "onsker", merke: "ingen", tekst: "ingen valgt", detalj: ["har vann (ikke valgt)"] }),
    ],
  },
};

/** Handlingene i Resultatet, som ikke kalles i disse testene. */
const handlinger = {
  onEndreSok: () => {},
  onEndreTilgjengeligTid: () => {},
  onProvIgjen: () => {},
  onBrukBedreTidsvindu: () => {},
};

/** Resultatet som tilstand for Resultat-komponenten. */
const som = (v: Resultatvisning): Resultattilstand => ({ type: "resultat", visning: v });

/** Delen av `html` fra `fra` til `til`. Feiler hvis en av merkene mangler, i stedet for å gi feil del. */
function del(html: string, fra: string, til: string): string {
  const start = html.indexOf(fra);
  const slutt = html.indexOf(til);
  if (start < 0 || slutt < 0) throw new Error(`Fant ikke ${start < 0 ? fra : til} i HTML-en`);
  return html.slice(start, slutt);
}
/** Kortraden på PC: fra `kortraden` til Stokken. */
const pcDel = (html: string) => del(html, 'data-testid="kortraden"', 'data-testid="stokk"');
/** Stokken, Stokknavigasjonen og Stokkoversikten: fra Stokken til Ansvarsmerknaden. */
const stokkDel = (html: string) => del(html, 'data-testid="stokk"', 'data-testid="ansvarsmerknad"');

const html = renderToString(<Resultat tilstand={som(visning)} {...handlinger} />);
const pc = pcDel(html);
const artikler = [...pc.matchAll(/<article[^>]*>/g)].map((m) => m[0]);

describe("Resultat med Turforslag uten vær", () => {
  it("har hvert kort som en artikkel med leseteksten som navn", () => {
    expect(artikler).toHaveLength(2);
    expect(pc).toMatch(/data-testid="nummerstempel">1<\/span><p[^>]*><span[^>]*>1 av 2<\/span>/);
    expect(artikler[0]).toContain('aria-label="Turforslag 1 av 2: Mål 1. Turtid: 1 t 32 min av 2 t, gangtid uten pauser."');
    expect(artikler[1]).toContain('aria-label="Turforslag 2 av 2: Mål 2.');
  });

  it("gir radene PRD-begrepene som navn og merkene tekstalternativ", () => {
    for (const navn of ["Turtid", "Værklasse", "Opplevelsespreferanser", "Mørkevarsel"]) {
      expect(pc.match(new RegExp(`role="group" aria-label="${navn}"`, "g"))).toHaveLength(2);
    }
    expect(pc.match(/role="img" aria-label="passer"/g)).toHaveLength(3);
    expect(pc.match(/role="img" aria-label="ikke vurdert"/g)).toHaveLength(3);
    expect(pc.match(/role="img" aria-label="se opp"/g)).toHaveLength(2);
  });

  it("bytter ✓ med SVG-ikonet og tekstalternativet «: ja»", () => {
    expect(html).not.toContain("✓");
    expect(html).toMatch(
      /utsikt<svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg><span[^>]*>: ja<\/span> · vann <span aria-hidden="true">–<\/span>/,
    );
  });

  it("melder live-teksten i et høflig live-område, med overskriften rett etter, og viser «ingen» uten preferanser", () => {
    expect(html).toMatch(
      /<div aria-live="polite"><p class="[^"]*skjult[^"]*" data-testid="live-tekst">To Turforslag som passer tiden din<\/p><\/div><h1[^>]*tabindex="-1"[^>]*>To Turforslag som passer tiden din<\/h1>/,
    );
    expect(html).toMatch(/<dt[^>]*>Opplevelsespreferanser<\/dt><dd[^>]*>ingen<\/dd>/);
  });

  it("har Værmangel-linjen, Begrunnelsen i anførselstegn, kildelenken og Ansvarsmerknaden", () => {
    expect(html).toContain("Været er ikke vurdert.</strong> Vi fikk ikke hentet Værmeldingen fra MET.");
    expect(html).toContain("«passer tiden din (1 t 32 min av 2 t), værdata mangler, utsikt»");
    expect(html).toMatch(/<a[^>]*href="https:\/\/www.morotur.no\/tur" target="_blank" rel="noopener noreferrer">Kilde: morotur.no/);
    expect(html).toContain("Du har selv ansvaret for å vurdere forholdene.");
  });

  it("setter stolpene etter andelene fra serveren", () => {
    expect(html).toMatch(/data-testid="tidsstolpe-fyll"/);
    expect(html).toContain("--andel:0.77");
    expect(html).toContain("--fra:0.8;--til:1");
    expect(html).toContain("--andel:0.62");
  });
});

describe("Stokken på mobil og nettbrett", () => {
  const stokk = stokkDel(html);
  /** Hele Resultatet med `antall` Turforslag. */
  const lag = (antall: number) => {
    const kortene = [1, 2, 3]
      .slice(0, antall)
      .map((n) => kort(n, { rad: "onsker", merke: "ingen", tekst: "ingen valgt", detalj: [] }));
    return renderToString(
      <Resultat tilstand={som({ ...visning, utfall: { type: "turforslag", kort: kortene } })} {...handlinger} />,
    );
  };

  it("er en region som heter «Turforslag N av M», kan få fokus og viser bare det valgte kortet", () => {
    expect(stokk).toMatch(/^data-testid="stokk"/);
    expect(html).toMatch(/<section[^>]*aria-label="Turforslag 1 av 2" tabindex="0"[^>]*data-testid="stokk"/);
    const plasser = [...stokk.matchAll(/<div class="[^"]*"( inert="")?( data-testid="stokk-valgt")?><article/g)];
    expect(plasser).toHaveLength(2);
    expect(plasser[0][1]).toBeUndefined();
    expect(plasser[0][2]).toBeDefined();
    expect(plasser[1][1]).toBeDefined();
  });

  it("har kortene som artikler med leseteksten og Begrunnelsen som én linje", () => {
    expect(stokk).toContain('aria-label="Turforslag 1 av 2: Mål 1. Turtid: 1 t 32 min av 2 t, gangtid uten pauser."');
    expect(stokk).toContain("Begrunnelse: «passer tiden din (1 t 32 min av 2 t), værdata mangler, utsikt»");
    expect(stokk).not.toContain(">Begrunnelse<");
  });

  it("har Stokknavigasjon med navnene i UX-DR32, «N av M» og prikker som pynt", () => {
    expect(stokk).toMatch(/<button type="button"[^>]*aria-label="Forrige Turforslag" aria-disabled="true"/);
    expect(stokk).toMatch(/<button type="button"[^>]*aria-label="Neste Turforslag"(?! aria-disabled)[^>]*>Neste tur<svg/);
    expect(stokk).not.toContain("disabled=\"\"");
    expect(stokk).toMatch(/data-testid="stokk-posisjon" aria-live="polite" aria-atomic="true">1 av 2<\/span><span[^>]*aria-hidden="true">(<span[^>]*><\/span>){2}<\/span>/);
  });

  it("har én Stokk-kant per kort bak det valgte, høyst to", () => {
    expect(stokk.match(/data-testid="stokk-kant"/g)).toHaveLength(1);
    expect(stokkDel(lag(3)).match(/data-testid="stokk-kant"/g)).toHaveLength(2);
    expect(lag(1)).not.toContain("stokk-kant");
  });

  it("har Stokkoversikt med «Begge i stokken» ved to kort og «Alle tre i stokken» ved tre", () => {
    expect(stokk).toContain(">Begge i stokken</h2>");
    expect(stokk.match(/<button type="button"[^>]*aria-pressed="(true|false)"/g)).toEqual([
      expect.stringContaining('aria-pressed="true"'),
      expect.stringContaining('aria-pressed="false"'),
    ]);
    expect(stokk).toContain(">Mål 1 fra Startpunktet</span>");
    expect(stokk).toContain("1 t 32 min uten pauser · tilbake 15:02");
    expect(stokk).toContain('role="img" aria-label="Turtid: passer"');
    expect(stokk).toContain('role="img" aria-label="Mørkevarsel: se opp"');
    expect(stokkDel(lag(3))).toContain(">Alle tre i stokken</h2>");
  });

  it("har verken Stokknavigasjon eller Stokkoversikt ved ett kort", () => {
    const ett = lag(1);
    expect(ett).toMatch(/<section[^>]*aria-label="Turforslag 1 av 1"[^>]*data-testid="stokk"/);
    expect(ett).not.toContain("stokknavigasjon");
    expect(ett).not.toContain("stokkoversikt");
  });

  it("har Ditt søk som én linje uten preferanseleddet når ingen er valgt", () => {
    expect(html).toMatch(/data-testid="ditt-sok-linje"><span[^>]*>Ditt søk: <\/span>I dag, man. 9. nov. · 13:30 · 2 t · Middels<\/p>/);
    const medPreferanser = renderToString(
      <Resultat
        tilstand={som({ ...visning, dittSok: { ...visning.dittSok, opplevelsespreferanser: ["utsikt", "vann"] } })}
        {...handlinger}
      />,
    );
    expect(medPreferanser).toContain("I dag, man. 9. nov. · 13:30 · 2 t · Middels · utsikt og vann</p>");
  });
});

describe("Resultat på Søk", () => {
  it("har bare det tomme live-området", () => {
    const html = renderToString(<Resultat tilstand={null} {...handlinger} />);
    expect(html).toMatch(/<div[^>]*aria-live="polite"[^>]*><\/div>/);
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("<article");
  });
});

describe("Resultat med Alternativ", () => {
  const alternativkort: TurkortData = {
    ...kort(1, { rad: "onsker", merke: "ingen", tekst: "ingen valgt", detalj: [] }),
    lesetekst: "Alternativ: Mål 1. Turtid: 16 min av 15 min, trenger 1 min mer, uten pauser.",
    tidsstolpe: { fyll: 0.94, overGrense: 0.06 },
  };
  alternativkort.kriterier[0] = {
    rad: "tid",
    merke: "se-opp",
    tekst: "16 min av 15 min",
    detalj: ["trenger 1 min mer, uten pauser"],
  };
  const alternativ: Resultatvisning = {
    ...visning,
    overskrift: "Ingen Tur passer 15 min.",
    liveTekst: "Ingen Tur passer 15 min.",
    utfall: {
      type: "kortesteTur",
      kort: alternativkort,
      passerMedTekst: "Med 30 min eller mer passer minst én Tur.",
    },
  };
  const html = renderToString(<Resultat tilstand={som(alternativ)} {...handlinger} />);

  it("viser Alternativkortet som én artikkel med stempelet «→» og overlinjen", () => {
    expect(html.match(/<article/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Alternativ: Mål 1. Turtid: 16 min av 15 min, trenger 1 min mer, uten pauser."');
    expect(html).toMatch(/data-testid="nummerstempel"><svg[^>]*data-testid="stempel-pil"/);
    expect(html).toMatch(/>Alternativ<\/span><span[^>]*aria-hidden="true"> · <\/span><span[^>]*>den korteste Turen</);
    expect(html).toContain(">Slik står den mot Søket ditt<");
    expect(html).not.toContain(">Passer fordi<");
  });

  it("har Tid-raden som warn og Tidsstolpen med biten over grensen", () => {
    expect(html).toMatch(/aria-label="Turtid"[^>]*><svg[^>]*role="img" aria-label="se opp"/);
    expect(html).toContain('style="--andel:0.06;--start:0.94"');
  });

  it("har ingen Stokk, Stokkoversikt eller Frarådet-kort, men «Endre Tilgjengelig tid», teksten og Ansvarsmerknaden", () => {
    expect(html).not.toContain('data-testid="stokk"');
    expect(html).not.toContain("stokkoversikt");
    expect(html).not.toContain('data-testid="fraradet-kort"');
    expect(html).toMatch(/<button[^>]*>Endre Tilgjengelig tid<\/button><p[^>]*>Med 30 min eller mer passer minst én Tur.<\/p>/);
    expect(html.indexOf("Endre Tilgjengelig tid")).toBeLessThan(html.indexOf('data-testid="ansvarsmerknad"'));
    expect(html).toMatch(/<div aria-live="polite"><p[^>]*>Ingen Tur passer 15 min.<\/p><\/div><h1[^>]*>Ingen Tur passer 15 min.<\/h1>/);
  });

  it("har begge formene av Begrunnelsen, som CSS bytter ved 1200 px", () => {
    expect(html).toContain(">Begrunnelse<");
    expect(html).toContain("Begrunnelse: «passer tiden din");
  });
});

const sendtSok = {
  turdag: "I dag",
  starttidspunkt: "13:30",
  tilgjengeligTid: "2 t",
  vanskelighetsgrad: "Middels",
  opplevelsespreferanser: ["utsikt"],
};

describe("Resultat mens svaret venter", () => {
  const html = renderToString(
    <Resultat tilstand={{ type: "venter", id: "venter-1", dittSok: sendtSok }} {...handlinger} />,
  );

  it("har Ditt søk uten knapp og Plassholderstokken i live-området", () => {
    expect(html).toContain('data-testid="ditt-sok"');
    expect(html).toContain("I dag · 13:30 · 2 t · Middels · utsikt");
    expect(html).not.toContain("<button");
    expect(html).toMatch(/<div aria-live="polite"><div[^>]*aria-busy="true" data-testid="plassholderstokk"/);
    expect(html.match(/data-testid="plassholder-kant"/g)).toHaveLength(2);
    expect(html).toMatch(/<\/div><p tabindex="-1"[^>]*data-testid="plassholder">Finner turer …<\/p><\/div><\/div>/);
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("ansvarsmerknad");
  });
});

describe("Resultat ved Kontaktfeil", () => {
  const lag = (kanProveIgjen: boolean) =>
    renderToString(
      <Resultat
        tilstand={{ type: "kontaktfeil", id: "kontaktfeil-1", dittSok: sendtSok, kanProveIgjen }}
        {...handlinger}
      />,
    );
  const html = lag(true);

  it("har Ditt søk og Kontaktfeil-kortet i live-området, uten Ansvarsmerknad og kort", () => {
    expect(html).toContain('data-testid="ditt-sok"');
    expect(html).toMatch(/<div aria-live="polite"><section[^>]*data-testid="kontaktfeil"/);
    expect(html).toMatch(/<h1[^>]*tabindex="-1"[^>]*>Vi fikk ikke kontakt.<\/h1>/);
    expect(html).toContain(">Søket ditt er tatt vare på.</p>");
    expect(html).toMatch(/<button[^>]*_primaer[^>]*>Prøv igjen<\/button><button[^>]*_sekundaer[^>]*>Endre søk<\/button>/);
    expect(html.match(/>Endre søk</g)).toHaveLength(1);
    expect(html).not.toContain("ansvarsmerknad");
    expect(html).not.toContain("<article");
  });

  it("har bare «Endre søk» når serveren avviste Søket", () => {
    const avvist = lag(false);
    expect(avvist).toContain(">Vi fikk ikke kontakt.</h1>");
    expect(avvist).not.toContain("Prøv igjen");
    expect(avvist.match(/<button[^>]*>Endre søk<\/button>/g)).toHaveLength(1);
  });
});

describe("Resultat ved frarådet", () => {
  const FRARADET_VAER: Resultatvisning["vaer"] = {
    type: "vurdert",
    klasse: "fraradet",
    klasseTekst: "Værklasse frarådet",
    symbol: { ord: "regn", ikonSti: "/vaerikoner/rain.svg" },
    sammendrag: "regn · 4–6 °C · nedbør 1,2 mm/t · vind opptil 19 m/s",
    verdier: "4–6 °C · nedbør 1,2 mm/t · vind opptil 19 m/s",
    tidsvindu: "10:00–12:00",
    hoydemerknad: "Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.",
  };
  const FUNNET: NonNullable<Resultatvisning["bedreTidsvindu"]> = {
    type: "funnet",
    nyttSok: { dato: "2026-11-15", start: "11:00", tilgjengeligMin: 120, vanskelighetsgrad: "B", utsikt: false, vann: false },
    tekst: "I morgen fra kl. 11:00 er Værklassen god.",
    dag: "I morgen, søn. 15. nov.",
    detalj: "fra kl. 11:00 · samme 2 t, Middels",
    antallTekst: "7 Turer passer før mørket.",
    knappTekst: "Bruk i morgen 11:00",
  };
  const fraradet: Resultatvisning = {
    ...visning,
    overskrift: "Ingen Turforslag",
    liveTekst: "Ingen Turforslag",
    vaer: FRARADET_VAER,
    utfall: {
      type: "fraradet",
      melding: "Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).",
      kriterier: [
        { rad: "vaer", merke: "se-opp", tekst: "Værklasse frarådet", detalj: ["sterk kuling, vind opp mot 19 m/s"] },
        { rad: "tid", merke: "ingen", tekst: "ikke vurdert", detalj: ["Frarådet går foran tid og ønsker."] },
      ],
    },
    bedreTidsvindu: FUNNET,
  };
  const html = renderToString(<Resultat tilstand={som(fraradet)} {...handlinger} />);
  /** Frarådet-kortet: fra artikkelen til Bedre tidsvindu-kortet. */
  const kortet = del(html, 'data-testid="fraradet-kort"', 'data-testid="bedre-tidsvindu-kort"');

  it("har Frarådet-kortet med vindflaten, «!», «Ingen Turforslag», Værklassen, verdiene og meldingen i rekkefølge", () => {
    expect(html).toMatch(/<article[^>]*aria-labelledby="([^"]+) ([^"]+)" data-testid="fraradet-kort">/);
    const [, ingenId, tittelId] = /aria-labelledby="([^"]+) ([^"]+)" data-testid="fraradet-kort"/.exec(html)!;
    expect(kortet).toMatch(/data-testid="vindflate"/);
    expect(kortet).toMatch(/<div[^>]*aria-hidden="true" data-testid="vindflate"><svg/);
    expect(kortet).toMatch(/<span class="[^"]*varsel[^"]*" aria-hidden="true" data-testid="nummerstempel">!<\/span>/);
    expect(kortet).toContain(`id="${ingenId}"`);
    expect(kortet).toMatch(new RegExp(`<h2 id="${tittelId}"[^>]*>Værklasse frarådet</h2>`));
    const deler = [
      'data-testid="vindflate"',
      'data-testid="nummerstempel">!',
      ">Ingen Turforslag</p>",
      ">Værklasse frarådet</h2>",
      ">4–6 °C · nedbør 1,2 mm/t · vind opptil 19 m/s</p>",
      ">Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).</p>",
      ">Derfor ingen tur</p>",
      'aria-label="Værklasse"',
      'aria-label="Turtid"',
      'data-testid="met-farevarsler"',
    ];
    const plasser = deler.map((d) => kortet.indexOf(d));
    expect(plasser.every((p) => p >= 0), JSON.stringify(plasser)).toBe(true);
    expect([...plasser].sort((a, b) => a - b)).toEqual(plasser);
  });

  it("har bare radene Vær og Tid, med merkene se opp og ikke vurdert", () => {
    expect(kortet.match(/role="group"/g)).toHaveLength(2);
    expect(kortet).toMatch(/aria-label="Værklasse"[^>]*><svg[^>]*role="img" aria-label="se opp"/);
    expect(kortet).toMatch(/aria-label="Turtid"[^>]*><svg[^>]*role="img" aria-label="ikke vurdert"/);
    expect(kortet).toMatch(/<p class="[^"]*varsel[^"]*">Værklasse frarådet<\/p>/);
  });

  it("har lenken til MET sine farevarsler i ny fane, med skjult tekst for skjermlesere", () => {
    expect(kortet).toMatch(
      /<a[^>]*href="https:\/\/www.met.no\/vaer-og-klima\/ekstremvaervarsler-og-andre-farevarsler" target="_blank" rel="noopener noreferrer"[^>]*>Sjekk også MET sine farevarsler.<span[^>]*> \(åpnes i ny fane\)<\/span><\/a>/,
    );
  });

  it("har Bedre tidsvindu-kortet med «→», overlinjen, dagen, detaljen, antallet og knappen", () => {
    const bedre = html.slice(html.indexOf('data-testid="bedre-tidsvindu-kort"'));
    expect(bedre).toMatch(/data-testid="nummerstempel"><svg[^>]*data-testid="stempel-pil"/);
    expect(bedre).toMatch(/<h2[^>]*><span>Alternativ<\/span><span aria-hidden="true"> · <\/span><span>Bedre tidsvindu<\/span><\/h2>/);
    const [, dagId] = /<p id="([^"]+)"[^>]*data-testid="bedre-tidsvindu-dag">I morgen, søn. 15. nov.<\/p>/.exec(bedre)!;
    const [, detaljId] = /<p id="([^"]+)"[^>]*data-testid="bedre-tidsvindu-detalj">fra kl. 11:00 · samme 2 t, Middels<\/p>/
      .exec(bedre)!;
    const [, antallId] = /<p id="([^"]+)"[^>]*data-testid="bedre-tidsvindu-antall">7 Turer passer før mørket.<\/p>/.exec(bedre)!;
    // Knappen er beskrevet av dagen, detaljen og antallet.
    expect(bedre).toMatch(
      new RegExp(`<button type="button" class="[^"]*_primaer[^"]*" aria-describedby="${dagId} ${detaljId} ${antallId}">Bruk i morgen 11:00</button>`),
    );
  });

  it("har Ditt søk med «Endre søk» og live-teksten, men ingen vær-del, Ansvarsmerknad eller Turkort", () => {
    expect(html).toContain('data-testid="ditt-sok"');
    expect(html).toMatch(/<button[^>]*>Endre søk<\/button>/);
    expect(html).toMatch(/<div aria-live="polite"><p[^>]*data-testid="live-tekst">Ingen Turforslag<\/p><\/div><h1[^>]*>Ingen Turforslag<\/h1>/);
    for (const testid of ["vaersammendrag", "vaervarsling", "vaermangel", "ansvarsmerknad", "turkort", "alternativkort", "stokk"]) {
      expect(html).not.toContain(`data-testid="${testid}"`);
    }
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf('data-testid="fraradet-kort"'));
    expect(html.match(/<article/g)).toHaveLength(2);
  });

  it("viser teksten uten knapp når det ikke finnes noe Bedre tidsvindu", () => {
    const tekst = "Det finnes ikke noe bedre tidsvindu i dagslys i dag eller i morgen.";
    const ingen = renderToString(
      <Resultat tilstand={som({ ...fraradet, bedreTidsvindu: { type: "ingen", tekst } })} {...handlinger} />,
    );
    const bedre = ingen.slice(ingen.indexOf('data-testid="bedre-tidsvindu-kort"'));
    expect(bedre).toContain(`data-testid="bedre-tidsvindu-tekst">${tekst}</p>`);
    expect(bedre).not.toContain("<button");
    expect(bedre).not.toContain("bedre-tidsvindu-dag");
    // Samme overskriftsnivå som når Bedre tidsvindu finnes.
    expect(bedre).toMatch(/<h2[^>]*>.*Bedre tidsvindu<\/span><\/h2>/);
  });

  it("viser Ditt søk med «Endre søk» og overskriften når frarådet mangler vurdert vær", () => {
    const utenVaer = renderToString(
      <Resultat tilstand={som({ ...fraradet, vaer: visning.vaer, bedreTidsvindu: undefined })} {...handlinger} />,
    );
    expect(utenVaer).toContain('data-testid="ditt-sok"');
    expect(utenVaer).toMatch(/<button[^>]*>Endre søk<\/button>/);
    expect(utenVaer).toMatch(/<h1[^>]*>Ingen Turforslag<\/h1>/);
    expect(utenVaer).not.toContain('data-testid="fraradet-kort"');
  });

  it("viser Frarådet-kortet alene når Bedre tidsvindu mangler", () => {
    const utenBedre = renderToString(<Resultat tilstand={som({ ...fraradet, bedreTidsvindu: undefined })} {...handlinger} />);
    expect(utenBedre).toContain('data-testid="fraradet-kort"');
    expect(utenBedre).not.toContain('data-testid="bedre-tidsvindu-kort"');
    expect(utenBedre).toMatch(/<button[^>]*>Endre søk<\/button>/);
  });
});

describe("Overlinjene", () => {
  it("står med vanlige ord og skrives i versaler av CSS", () => {
    expect(html).toMatch(/aria-labelledby="([^"]+)"[\s\S]*id="\1"[^>]*>Ditt søk</);
    expect(html).toContain(">Passer fordi<");
    expect(html).toContain(">Begrunnelse<");
  });
});

describe("Tidsstolpe over Tilgjengelig tid", () => {
  it("tegner biten over grensen og grensestreken", () => {
    const html = renderToString(<Tidsstolpe stolpe={{ fyll: 0.94, overGrense: 0.06 }} />);
    expect(html).toContain('style="--andel:0.94"');
    expect(html).toContain('style="--andel:0.06;--start:0.94"');
    expect(html.match(/<div class="[^"]*"/g)).toHaveLength(4);
  });

  it("har bare fyllet når Turtiden passer", () => {
    const html = renderToString(<Tidsstolpe stolpe={{ fyll: 0.5, overGrense: 0 }} />);
    expect(html.match(/<div class="[^"]*"/g)).toHaveLength(2);
  });
});

describe("Dagslysstolpe før soloppgang", () => {
  it("tegner det mørke feltet før soloppgang etter fyllet, så det synes", () => {
    const html = renderToString(
      <Dagslysstolpe
        varsel
        stolpe={{
          startTekst: "07:00",
          slutt: { andel: 0.3, tekst: "tilbake 09:00" },
          skumring: 0.9,
          solNed: { andel: 0.95, tekst: "sol ned 15:59" },
          solOpp: { andel: 0.2, tekst: "sol opp 08:30" },
        }}
      />,
    );
    const fyll = html.indexOf('style="--andel:0.3"');
    const solOpp = html.indexOf('style="--fra:0;--til:0.2" data-testid="dagslysstolpe-solopp"');
    expect(fyll).toBeGreaterThan(-1);
    expect(solOpp).toBeGreaterThan(fyll);
    expect(html).toContain("sol opp 08:30");
    expect(html).toContain("sol ned 15:59");
  });
});

describe("medHake", () => {
  const vis = (tekst: string) => renderToString(<p>{medHake(tekst)}</p>);
  const hake = (mellomrom: boolean) =>
    `<svg class="[^"]*${mellomrom ? " [^\"]*" : ""}" viewBox="0 0 12 12"[^>]*>.*?</svg><span[^>]*>: ja</span>`;

  it("lar tekst uten ✓ og «–» stå urørt", () => {
    expect(medHake("ingen valgt")).toBe("ingen valgt");
  });

  it("bytter flere ✓", () => {
    const html = vis("utsikt ✓ · vann ✓");
    expect(html).not.toContain("✓");
    expect(html.match(/: ja</g)).toHaveLength(2);
    expect(html).toMatch(new RegExp(`^<p>utsikt${hake(true)} · vann${hake(true)}</p>$`));
  });

  it("bytter ✓ først i teksten og ✓ uten mellomrom foran, uten marg", () => {
    expect(vis("✓ utsikt")).toMatch(new RegExp(`^<p>${hake(false)} utsikt</p>$`));
    expect(vis("utsikt✓")).toMatch(new RegExp(`^<p>utsikt${hake(false)}</p>$`));
  });

  it("skjuler «–» for ønsker som ikke treffer, men ikke tankestrek mellom tall", () => {
    expect(vis("ikke utsikt – · ikke vann –")).toBe(
      '<p>ikke utsikt <span aria-hidden="true">–</span> · ikke vann <span aria-hidden="true">–</span></p>',
    );
    expect(vis("3–5 °C")).toBe("<p>3–5 °C</p>");
  });

  it("bytter ✓ i detaljlinjer på kortet", () => {
    const medDetalj: Resultatvisning = {
      ...visning,
      utfall: {
        type: "turforslag",
        kort: [kort(1, { rad: "onsker", merke: "ok", tekst: "utsikt ✓", detalj: ["har vann ✓", "har vann ✓"] })],
      },
    };
    const html = renderToString(<Resultat tilstand={som(medDetalj)} {...handlinger} />);
    expect(html).not.toContain("✓");
    expect(pcDel(html).match(/<p class="[^"]*">har vann<svg/g)).toHaveLength(2);
    expect(stokkDel(html).match(/<p class="[^"]*">har vann<svg/g)).toHaveLength(2);
  });
});
