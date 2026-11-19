import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Kartkort } from "./kart-data";
import { Kartmerke, Kartutsnitt } from "./Kartutsnitt";

// Story 3.2: Kartutsnittet og merket nederst på det statiske kartet. Skallet rendres alltid, men kartet i
// det monteres bare under 1200 px, og det vet bare nettleseren. På serveren står derfor bare skallet.
// Selve utsnittet i nettleseren testes i e2e/kart.spec.ts.

const KORT: Kartkort = {
  turId: "tur-1",
  kart: {
    rute: {
      type: "Feature",
      geometry: { type: "MultiLineString", coordinates: [[[7.16, 62.75], [7.18, 62.77]]] },
      properties: {},
    },
    startpunkt: { lat: 62.75, lon: 7.16 },
    nummer: 1,
  },
};

describe("Kartutsnitt", () => {
  it("er én knapp «Vis på kartet» med merket, og lenken «© Kartverket» står utenfor knappen", () => {
    const html = renderToString(
      <Kartutsnitt kort={KORT} merke="Turforslag 1 av 3" onVisPaKartet={() => {}} medKart />,
    );
    expect(html.match(/<button /g)).toHaveLength(1);
    expect(html).toMatch(/<button [^>]*aria-label="Vis på kartet"/);
    const knapp = html.slice(html.indexOf("<button"), html.indexOf("</button>"));
    expect(knapp).toContain(">Turforslag 1 av 3</span>");
    expect(knapp).not.toMatch(/<a |tabindex/);
    expect(html.slice(html.indexOf("</button>"))).toMatch(/<a [^>]*href="https:\/\/www\.kartverket\.no\/"/);
  });

  it("monterer ikke kartet på serveren, men skallet står, så kortet har samme høyde", () => {
    for (const medKart of [true, false]) {
      const html = renderToString(
        <Kartutsnitt kort={KORT} merke="Alternativ" onVisPaKartet={() => {}} medKart={medKart} />,
      );
      expect(html).toContain('data-testid="kartutsnitt"');
      expect(html).not.toMatch(/kart-statisk|leaflet/);
    }
  });
});

describe("Kartmerke", () => {
  it("er «omtrentlig rute · © Kartverket», med «© Kartverket» som lenke i ny fane", () => {
    const html = renderToString(<Kartmerke rute />);
    const tekst = html.replace(/<[^>]+>/g, "");
    expect(tekst).toBe("omtrentlig rute · © Kartverket (åpnes i ny fane)");
    expect(html).toMatch(/<a [^>]*href="https:\/\/www\.kartverket\.no\/" target="_blank" rel="noopener noreferrer"/);
    // «omtrentlig rute ·» står utenfor lenken og er pynt for skjermlesere.
    const rutedel = /<span[^>]*aria-hidden="true"[^>]*><svg[^>]*>.*<\/svg>omtrentlig rute(<!-- -->)? · <\/span><a /;
    expect(html).toMatch(rutedel);
    expect(html.match(/<a /g)).toHaveLength(1);
  });

  it("er bare «© Kartverket» uten rute (Frarådet-kortet)", () => {
    const html = renderToString(<Kartmerke rute={false} />);
    expect(html.replace(/<[^>]+>/g, "")).toBe("© Kartverket (åpnes i ny fane)");
    expect(html).not.toContain("omtrentlig rute");
  });
});
