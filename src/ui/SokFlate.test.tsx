import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Sidedata } from "@/kjerne/visning/sidedata";
import { SokFlate } from "./SokFlate";

// Komponenttest for Søk-flaten med sidedata etter 22:00, som ingen demo har.
// Flaten rendres på serveren og sjekkes i HTML-en, uten nettleser.

const STARTTIDER = Array.from({ length: 65 }, (_, i) => {
  const min = 6 * 60 + i * 15;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
});

function skjema(iDagLast: boolean): Sidedata["skjema"] {
  return {
    turdager: [
      {
        dato: "2026-11-09",
        etikett: "I dag",
        last: iDagLast,
        startvalg: STARTTIDER.map((verdi) => ({ verdi, last: iDagLast || verdi < "13:30" })),
      },
      {
        dato: "2026-11-10",
        etikett: "I morgen",
        last: false,
        startvalg: STARTTIDER.map((verdi) => ({ verdi, last: false })),
      },
    ],
    tilgjengeligTid: [
      { verdi: 15, etikett: "15 min" },
      { verdi: 120, etikett: "2 t" },
      { verdi: 300, etikett: "5 t" },
    ],
    standardSok: {
      dato: iDagLast ? "2026-11-10" : "2026-11-09",
      start: iDagLast ? "10:00" : "13:30",
      tilgjengeligMin: 120,
      vanskelighetsgrad: "B",
      utsikt: false,
      vann: false,
    },
  };
}

/** Startpunktene og telleteksten fra sidedataene (story 3.3). Søk-kartet viser dem bare på PC i nettleseren. */
const SOKKART = {
  startpunkter: [
    { navn: "Startpunkt A", kortnavn: "A", lat: 62.74, lon: 7.15 },
    { navn: "Startpunkt B", kortnavn: "B", lat: 62.76, lon: 7.27 },
  ],
  telletekst: "3 Turer fra 2 Startpunkter",
};

/** Knappen med det tilgjengelige navnet `navn`, som HTML. */
const knapp = (html: string, navn: string) => {
  const treff = [...html.matchAll(/<button[^>]*>/g)].map((m) => m[0]).filter((b) => b.includes(`aria-label="${navn}"`));
  if (treff.length !== 1) throw new Error(`Fant ${treff.length} knapper med navnet ${navn}`);
  return treff[0];
};

/** Radioknappen med verdien `verdi`, som HTML. */
const radio = (html: string, verdi: string) => {
  const treff = html.match(new RegExp(`<input[^>]*type="radio"[^>]*value="${verdi}"[^>]*/?>`));
  if (!treff) throw new Error(`Fant ikke radioknappen ${verdi}`);
  return treff[0];
};

describe("SokFlate etter 22:00", () => {
  const html = renderToString(<SokFlate demoId={null} sprakmodell={false} skjema={skjema(true)} {...SOKKART} />);

  it("låser «I dag» og velger «I morgen»", () => {
    expect(radio(html, "2026-11-09")).toMatch(/\sdisabled=""/);
    expect(radio(html, "2026-11-09")).not.toMatch(/\schecked=""/);
    expect(radio(html, "2026-11-10")).toMatch(/\schecked=""/);
    expect(radio(html, "2026-11-10")).not.toMatch(/\sdisabled=""/);
  });

  it("forklarer låsen under Turdag", () => {
    expect(html).toContain("Etter kl. 22 kan du bare velge i morgen.");
  });

  it("står på 10:00 i morgen uten «nå» og uten låste tider", () => {
    expect(html).toMatch(/<option value="10:00" selected="">10:00<\/option>/);
    expect(html).not.toMatch(/<option[^>]*disabled/);
    expect(html).not.toMatch(/>nå</);
  });
});

describe("SokFlate før 22:00", () => {
  const html = renderToString(<SokFlate demoId={null} sprakmodell={false} skjema={skjema(false)} {...SOKKART} />);

  it("velger «I dag» uten forklaring om låsen", () => {
    expect(radio(html, "2026-11-09")).toMatch(/\schecked=""/);
    expect(radio(html, "2026-11-09")).not.toMatch(/\sdisabled=""/);
    expect(html).not.toContain("Etter kl. 22");
  });

  it("viser «nå» under standard-Starttidspunktet og låser tidene før", () => {
    expect(html).toMatch(/<option value="13:30" selected="">13:30<\/option>/);
    expect(html).toMatch(/<option value="13:15" disabled="">13:15<\/option>/);
    expect(html).toMatch(/>nå</);
  });

  it("gir trinnknappene navn og låser − ved første valg som ikke er låst", () => {
    expect(knapp(html, "Reduser Starttidspunkt med 15 min")).toMatch(/\saria-disabled="true"/);
    expect(knapp(html, "Øk Starttidspunkt med 15 min")).not.toMatch(/\saria-disabled=/);
    expect(knapp(html, "Reduser Tilgjengelig tid med 15 min")).not.toMatch(/\saria-disabled=/);
    expect(knapp(html, "Øk Tilgjengelig tid med 15 min")).not.toMatch(/\saria-disabled=/);
  });

  it("har det tomme live-området på plass før Resultatet kommer", () => {
    expect(html).toMatch(/<div[^>]*aria-live="polite"[^>]*><\/div>/);
    expect(html).toContain("Hvor lenge vil du gå?");
  });

  it("har radiogrupper, avkrysningsbokser og «Finn tur» som aldri er låst", () => {
    expect(html.match(/role="radiogroup"/g)).toHaveLength(2);
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html).toMatch(/<button type="submit"(?![^>]*disabled)[^>]*>Finn tur<\/button>/);
  });
});

describe("SokFlate og Søk-kartet (story 3.3)", () => {
  const html = renderToString(<SokFlate demoId={null} sprakmodell={false} skjema={skjema(false)} {...SOKKART} />);

  it("rendrer bare den tomme kartflaten på serveren, uten Leaflet og uten kartregionen", () => {
    const tomFlate = /<div class="[^"]*kart[^"]*"><div class="[^"]*flate[^"]*fyll[^"]*" data-testid="sok-kart-laster">/;
    expect(html).toMatch(tomFlate);
    expect(html).not.toContain('data-testid="sok-kart"');
    expect(html).not.toContain('role="region"');
    expect(html).not.toContain("leaflet");
    expect(html).not.toContain(SOKKART.telletekst);
  });

  it("har verken kart eller tom kartflate uten Startpunkter", () => {
    const tom = renderToString(<SokFlate demoId={null} sprakmodell={false} skjema={skjema(false)} startpunkter={[]} telletekst="0 Turer" />);
    expect(tom).not.toContain("sok-kart");
    expect(tom).not.toContain('role="region"');
  });

  it("har Skjemakortet i en egen kolonne, så PC kan sette kartet ved siden av", () => {
    expect(html).toMatch(/<div class="[^"]*skjemakolonne[^"]*"><h1/);
  });
});
