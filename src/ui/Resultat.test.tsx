import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Resultatvisning, Turkort as TurkortData } from "@/kjerne/visning/skjema";
import { Dagslysstolpe } from "./Dagslysstolpe";
import { medHake } from "./Hake";
import { Resultat } from "./Resultat";
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

const html = renderToString(<Resultat visning={visning} onEndreSok={() => {}} />);
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

  it("melder overskriften i et høflig live-område og viser «ingen» uten preferanser", () => {
    expect(html).toMatch(/<div aria-live="polite"><h1[^>]*tabindex="-1"[^>]*>To Turforslag som passer tiden din<\/h1><\/div>/);
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
      <Resultat visning={{ ...visning, utfall: { type: "turforslag", kort: kortene } }} onEndreSok={() => {}} />,
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
        visning={{ ...visning, dittSok: { ...visning.dittSok, opplevelsespreferanser: ["utsikt", "vann"] } }}
        onEndreSok={() => {}}
      />,
    );
    expect(medPreferanser).toContain("I dag, man. 9. nov. · 13:30 · 2 t · Middels · utsikt og vann</p>");
  });
});

describe("Resultat på Søk", () => {
  it("har bare det tomme live-området", () => {
    const html = renderToString(<Resultat visning={null} onEndreSok={() => {}} />);
    expect(html).toMatch(/<div[^>]*aria-live="polite"[^>]*><\/div>/);
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("<article");
  });
});

describe("Resultat med Alternativ", () => {
  it("viser plassholderen med «Endre søk»", () => {
    const alternativ: Resultatvisning = {
      ...visning,
      overskrift: "Ingen Tur passer 15 min.",
      utfall: {
        type: "kortesteTur",
        kort: kort(1, { rad: "onsker", merke: "ingen", tekst: "ingen valgt", detalj: [] }),
        passerMedTekst: "Med 30 min eller mer passer minst én Tur.",
      },
    };
    const html = renderToString(<Resultat visning={alternativ} onEndreSok={() => {}} />);
    expect(html).toContain("Visningen av dette Resultatet kommer snart.");
    expect(html).toMatch(/<button[^>]*>Endre søk<\/button>/);
    expect(html).not.toContain("<article");
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
    const html = renderToString(<Resultat visning={medDetalj} onEndreSok={() => {}} />);
    expect(html).not.toContain("✓");
    expect(pcDel(html).match(/<p class="[^"]*">har vann<svg/g)).toHaveLength(2);
    expect(stokkDel(html).match(/<p class="[^"]*">har vann<svg/g)).toHaveLength(2);
  });
});
