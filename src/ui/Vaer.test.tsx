import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BedreTidsvindu, Resultatvisning, Turkort as TurkortData, Vaer } from "@/kjerne/visning/skjema";
import { Resultat } from "./Resultat";
import { Vaersammendrag } from "./Vaersammendrag";
import { Vaervarsling } from "./Vaervarsling";

// Story 2.9: vær-delen i Resultatet. Værsammendraget ved god og middels, Værvarslingen ved dårlig, og
// Værmangel-linjen når Værmeldingen mangler, alle mellom Ditt søk og overskriften. Live-området har
// `liveTekst`. Rendres på serveren og sjekkes i HTML-en. Oppsettet i nettleseren testes i e2e/vaer.spec.ts.

type VaerVurdert = Extract<Vaer, { type: "vurdert" }>;

const HOYDEMERKNAD = "Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.";

const GOD: VaerVurdert = {
  type: "vurdert",
  klasse: "god",
  klasseTekst: "Værklasse god",
  symbol: { ord: "klarvær", ikonSti: "/vaerikoner/clearsky_day.svg" },
  sammendrag: "klarvær · 3–5 °C · nedbør 0 mm/t · vind opptil 4,5 m/s",
  verdier: "3–5 °C · nedbør 0 mm/t · vind opptil 4,5 m/s",
  tidsvindu: "13:30–15:30",
  hoydemerknad: HOYDEMERKNAD,
};

const DARLIG: VaerVurdert = {
  ...GOD,
  klasse: "darlig",
  klasseTekst: "Værklasse dårlig",
  symbol: { ord: "regn", ikonSti: "/vaerikoner/rain.svg" },
  sammendrag: "regn · 5–7 °C · nedbør 3,4 mm/t · vind opptil 9,2 m/s",
  verdier: "5–7 °C · nedbør 3,4 mm/t · vind opptil 9,2 m/s",
  tidsvindu: "10:00–13:00",
  vaervarsling: {
    tittel: "Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00",
    tekst: "Nedbør opptil 3,4 mm/t, vind opptil 9,2 m/s, 5–7 °C.",
  },
};

describe("Værsammendraget", () => {
  const html = renderToString(<Vaersammendrag vaer={GOD} />);

  it("har merket som pynt, klassen, ikonet med tom alt og ordet ved siden av", () => {
    expect(html).toMatch(/data-testid="vaersammendrag"/);
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg><strong[^>]*>Værklasse god<\/strong>/);
    expect(html).toMatch(/<img[^>]*src="\/vaerikoner\/clearsky_day.svg" alt="" width="32" height="32"\/><span>klarvær<\/span>/);
  });

  it("har verdiene uten symbolordet foran, Tidsvinduet med skjult etikett etter og Høydemerknaden under", () => {
    expect(html).toMatch(
      /data-testid="vaerverdier">3–5 °C · nedbør 0 mm\/t · vind opptil 4,5 m\/s<\/span><span[^>]*><span class="[^"]*skjult[^"]*">Tidsvindu: <\/span><span data-testid="tidsvindu">13:30–15:30<\/span>/,
    );
    expect(html.match(/klarvær/g)).toHaveLength(1);
    expect(html.indexOf("data-testid=\"tidsvindu\"")).toBeLessThan(html.indexOf(HOYDEMERKNAD));
  });

  it("viser verken ikon eller ord uten symbol, og verdiene urørt", () => {
    const uten = renderToString(
      <Vaersammendrag vaer={{ ...GOD, symbol: null, sammendrag: "3–5 °C · nedbør 0 mm/t · vind opptil 4,5 m/s" }} />,
    );
    expect(uten).not.toContain("<img");
    expect(uten).not.toContain("vaersymbol");
    expect(uten).toContain(">3–5 °C · nedbør 0 mm/t · vind opptil 4,5 m/s</span>");
  });

  it("viser bare ordet når MET ikke har ikon for koden", () => {
    const utenIkon = renderToString(<Vaersammendrag vaer={{ ...GOD, symbol: { ord: "klarvær", ikonSti: null } }} />);
    expect(utenIkon).not.toContain("<img");
    expect(utenIkon).toMatch(/data-testid="vaersymbol"><span>klarvær<\/span><\/span>/);
  });
});

describe("Værvarslingen", () => {
  const html = renderToString(<Vaervarsling vaer={DARLIG} onBrukBedreTidsvindu={() => {}} />);

  it("er en region med tittelen som navn, merket se opp som pynt og tittelen", () => {
    expect(html).toMatch(
      /<section[^>]*aria-labelledby="([^"]+)" data-testid="vaervarsling"><div[^>]*><p[^>]*><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg><strong id="\1"[^>]*>Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00<\/strong><\/p>/,
    );
    expect(html).toMatch(/<svg class="[^"]*se-opp/);
  });

  it("viser ingenting uten vaervarsling", () => {
    expect(renderToString(<Vaervarsling vaer={GOD} onBrukBedreTidsvindu={() => {}} />)).toBe("");
  });

  it("har verdiene, symbolet, forklaringen og Høydemerknaden i den rekkefølgen", () => {
    const deler = [
      ">Nedbør opptil 3,4 mm/t, vind opptil 9,2 m/s, 5–7 °C.</p>",
      'src="/vaerikoner/rain.svg" alt=""',
      "<span>regn</span>",
      ">Derfor står lavtliggende Turer og Turer som er egnet i dårlig vær øverst i stokken.</p>",
      HOYDEMERKNAD,
    ];
    const plasser = deler.map((d) => html.indexOf(d));
    expect(plasser.every((p) => p >= 0)).toBe(true);
    expect([...plasser].sort((a, b) => a - b)).toEqual(plasser);
  });
});

describe("Bedre tidsvindu-boksen i Værvarslingen", () => {
  const FUNNET: BedreTidsvindu = {
    type: "funnet",
    nyttSok: { dato: "2026-11-09", start: "14:00", tilgjengeligMin: 180, vanskelighetsgrad: "R", utsikt: true, vann: false },
    tekst: "I morgen fra kl. 14:00 er Værklassen god.",
    dag: "I morgen, man. 9. nov.",
    detalj: "fra kl. 14:00 · samme 3 t, Krevende",
    antallTekst: "5 Turer passer før mørket.",
    knappTekst: "Bruk 14:00",
  };
  const vis = (bedre: BedreTidsvindu) =>
    renderToString(<Vaervarsling vaer={DARLIG} bedreTidsvindu={bedre} onBrukBedreTidsvindu={() => {}} />);

  it("står etter innholdet i Værvarslingen, med overlinjen, teksten, antallet og knappen", () => {
    const html = vis(FUNNET);
    expect(html.indexOf('data-testid="bedre-tidsvindu-boks"')).toBeGreaterThan(html.indexOf(HOYDEMERKNAD));
    // Ingen egen region inne i Værvarslingen.
    expect(html).toMatch(/<div class="[^"]*" data-testid="bedre-tidsvindu-boks"><p class="[^"]*">Bedre tidsvindu<\/p>/);
    expect(html.match(/<section/g)).toHaveLength(1);
    const [, tekstId] = /<p id="([^"]+)"[^>]*data-testid="bedre-tidsvindu-tekst">I morgen fra kl. 14:00 er Værklassen god.<\/p>/
      .exec(html)!;
    const [, antallId] = /<p id="([^"]+)"[^>]*data-testid="bedre-tidsvindu-antall">5 Turer passer før mørket.<\/p>/.exec(html)!;
    // Knappen er beskrevet av teksten og antallet, så dagen leses med «Bruk 14:00».
    expect(html).toContain(`aria-describedby="${tekstId} ${antallId}">Bruk 14:00</button>`);
    expect(html).toMatch(/<button type="button" class="[^"]*_primaer[^"]*"[^>]*>Bruk 14:00<\/button>/);
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it("viser bare teksten, uten antall og knapp, når det ikke finnes noe Bedre tidsvindu", () => {
    const tekst = "Det finnes ikke noe bedre tidsvindu i dagslys i dag eller i morgen.";
    const html = vis({ type: "ingen", tekst });
    expect(html).toContain(`data-testid="bedre-tidsvindu-tekst">${tekst}</p>`);
    expect(html).not.toContain("bedre-tidsvindu-antall");
    expect(html).not.toContain("<button");
  });

  it("står i Værvarslingen i Resultatet ved dårlig vær", () => {
    const v: Resultatvisning = {
      ...visning(DARLIG, { rad: "vaer", merke: "se-opp", tekst: "Værklasse dårlig", detalj: [] }, "Ett Turforslag i dårlig vær", "x"),
      bedreTidsvindu: FUNNET,
    };
    const html = renderToString(<Resultat tilstand={{ type: "resultat", visning: v }} {...handlinger} />);
    const varsling = html.indexOf('data-testid="vaervarsling"');
    const boks = html.indexOf('data-testid="bedre-tidsvindu-boks"');
    expect(boks).toBeGreaterThan(varsling);
    expect(boks).toBeLessThan(html.indexOf("<h1"));
  });
});

/** Et Turkort med Vær-raden `vaer`. */
function kort(vaer: TurkortData["kriterier"][1]): TurkortData {
  return {
    turId: "tur-1",
    mal: "Mål 1",
    fra: "fra Startpunktet",
    startpunktTekst: "Startpunkt: Parkering",
    faktalinje: "5,0 km · 318 høydemeter · høyeste punkt 340 moh · Krevende",
    kriterier: [
      { rad: "tid", merke: "ok", tekst: "1 t 33 min av 3 t", detalj: ["gangtid, uten pauser"] },
      vaer,
      { rad: "onsker", merke: "ingen", tekst: "ikke utsikt –", detalj: [] },
      { rad: "morke", merke: "ok", tekst: "tilbake 11:33", detalj: ["sola går ned 15:59"] },
    ],
    tidsstolpe: { fyll: 0.5, overGrense: 0 },
    dagslysstolpe: { startTekst: "10:00", slutt: { andel: 0.3, tekst: "tilbake 11:33" }, skumring: 0.9, solNed: null, solOpp: null },
    regeltekst: "passer tiden din (1 t 33 min av 3 t), nedbør opptil 3,4 mm/t og frisk vind",
    kartinfoboks: { navn: "Mål 1", tekst: "5,0 km · Krevende" },
    stokkoversiktRad: "1 t 33 min uten pauser · tilbake 11:33",
    lesetekst: "Turforslag 1 av 1: Mål 1.",
    kilde: { navn: "morotur.no", url: "https://www.morotur.no/tur" },
    kart: {
      rute: { type: "Feature", geometry: { type: "MultiLineString", coordinates: [[[7.1, 62.7], [7.2, 62.8]]] }, properties: {} },
      startpunkt: { lat: 62.7, lon: 7.1 },
      nummer: 1,
    },
  };
}

const visning = (vaer: Vaer, vaerRad: TurkortData["kriterier"][1], overskrift: string, liveTekst: string): Resultatvisning => ({
  resultatId: "r-vaer",
  sok: { dato: "2026-11-09", start: "10:00", tilgjengeligMin: 180, vanskelighetsgrad: "R", utsikt: true, vann: false },
  overskrift,
  dittSok: {
    turdag: "I morgen, man. 9. nov.",
    starttidspunkt: "10:00",
    tilgjengeligTid: "3 t",
    vanskelighetsgrad: "Krevende",
    opplevelsespreferanser: ["utsikt"],
  },
  liveTekst,
  vaer,
  utfall: { type: "turforslag", kort: [kort(vaerRad)] },
});

const handlinger = {
  onEndreSok: () => {},
  onEndreTilgjengeligTid: () => {},
  onProvIgjen: () => {},
  onBrukBedreTidsvindu: () => {},
};
const vis = (v: Resultatvisning) => renderToString(<Resultat tilstand={{ type: "resultat", visning: v }} {...handlinger} />);

describe("vær-delen i Resultatet", () => {
  it("god: Værsammendraget mellom Ditt søk og overskriften, uten Værmangel-linje og Værvarsling", () => {
    const html = vis(
      visning(GOD, { rad: "vaer", merke: "ok", tekst: "Værklasse god", detalj: ["oppholdsvær og lite vind · 3–5 °C"] }, "Ett Turforslag som passer nå", "Ett Turforslag som passer nå"),
    );
    const sammendrag = html.indexOf('data-testid="vaersammendrag"');
    expect(sammendrag).toBeGreaterThan(html.indexOf('data-testid="ditt-sok"'));
    expect(sammendrag).toBeLessThan(html.indexOf("<h1"));
    expect(html).not.toContain('data-testid="vaermangel"');
    expect(html).not.toContain('data-testid="vaervarsling"');
  });

  it("middels: Værsammendraget", () => {
    const middels: VaerVurdert = { ...GOD, klasse: "middels", klasseTekst: "Værklasse middels" };
    const html = vis(visning(middels, { rad: "vaer", merke: "ok", tekst: "Værklasse middels", detalj: [] }, "Ett Turforslag som passer nå", "x"));
    expect(html).toContain(">Værklasse middels</strong>");
    expect(html).not.toContain('data-testid="vaervarsling"');
  });

  it("dårlig: Værvarslingen før overskriften, live-teksten med tittelen, og Vær-raden i rust", () => {
    const live = "Ett Turforslag i dårlig vær. Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00.";
    const html = vis(
      visning(
        DARLIG,
        {
          rad: "vaer",
          merke: "se-opp",
          tekst: "Værklasse dårlig",
          detalj: ["nedbør opptil 3,4 mm/t og frisk vind · 5–7 °C", "Øverst fordi: lavtliggende tur (340 moh)"],
        },
        "Ett Turforslag i dårlig vær",
        live,
      ),
    );
    const varsling = html.indexOf('data-testid="vaervarsling"');
    expect(varsling).toBeGreaterThan(html.indexOf('data-testid="ditt-sok"'));
    expect(varsling).toBeLessThan(html.indexOf("<h1"));
    expect(html).not.toContain('data-testid="vaersammendrag"');
    expect(html).toMatch(new RegExp(`<div aria-live="polite"><p[^>]*data-testid="live-tekst">${live}</p></div><h1[^>]*>Ett Turforslag i dårlig vær</h1>`));
    expect(html).toMatch(/aria-label="Værklasse"[^>]*><svg[^>]*role="img" aria-label="se opp"/);
    expect(html).toMatch(/<p class="[^"]*varsel[^"]*">Værklasse dårlig<\/p><p[^>]*>nedbør opptil 3,4 mm\/t og frisk vind · 5–7 °C<\/p><p[^>]*>Øverst fordi: lavtliggende tur \(340 moh\)<\/p>/);
  });

  it("mangler: Værmangel-linjen som før", () => {
    const html = vis(
      visning(
        { type: "mangler", tekst: "Været er ikke vurdert. Vi fikk ikke hentet Værmeldingen fra MET." },
        { rad: "vaer", merke: "ingen", tekst: "ikke vurdert", detalj: ["Værmeldingen fra MET mangler"] },
        "Ett Turforslag som passer tiden din",
        "Ett Turforslag som passer tiden din",
      ),
    );
    expect(html).toContain('data-testid="vaermangel"');
    expect(html).not.toContain('data-testid="vaersammendrag"');
    expect(html).not.toContain('data-testid="vaervarsling"');
  });
});

describe("vær-delen med Alternativet", () => {
  /** Resultatet med den korteste Turen i stedet for Turforslag. */
  const medAlternativ = (vaer: VaerVurdert, liveTekst: string): Resultatvisning => {
    const vaerRad: TurkortData["kriterier"][1] = {
      rad: "vaer",
      merke: vaer.klasse === "darlig" ? "se-opp" : "ok",
      tekst: vaer.klasseTekst,
      detalj: [],
    };
    return {
      ...visning(vaer, vaerRad, "Ingen Tur passer 15 min.", liveTekst),
      utfall: { type: "kortesteTur", kort: kort(vaerRad), passerMedTekst: "Med 30 min eller mer passer minst én Tur." },
    };
  };

  it("god: Værsammendraget mellom Ditt søk og overskriften, over Alternativkortet", () => {
    const html = vis(medAlternativ(GOD, "Ingen Tur passer 15 min."));
    const sammendrag = html.indexOf('data-testid="vaersammendrag"');
    expect(sammendrag).toBeGreaterThan(html.indexOf('data-testid="ditt-sok"'));
    expect(sammendrag).toBeLessThan(html.indexOf("<h1"));
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf('data-testid="alternativkort"'));
    expect(html).not.toContain('data-testid="vaervarsling"');
  });

  it("dårlig: Værvarslingen over Alternativkortet, og live-teksten med tittelen", () => {
    const live = "Ingen Tur passer 15 min. Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00.";
    const html = vis(medAlternativ(DARLIG, live));
    const varsling = html.indexOf('data-testid="vaervarsling"');
    expect(varsling).toBeGreaterThan(html.indexOf('data-testid="ditt-sok"'));
    expect(varsling).toBeLessThan(html.indexOf("<h1"));
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf('data-testid="alternativkort"'));
    expect(html).not.toContain('data-testid="vaersammendrag"');
    expect(html).toContain(`data-testid="live-tekst">${live}</p>`);
  });
});
