import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Tegnforklaring } from "./Tegnforklaring";

// Story 3.1: tegnforklaringen i kartet. Ingen Tur i dagens Turdatasett har Mål, så Mål-delen testes her
// og ikke i e2e. Kartet bruker `harMal` fra kart-data.ts (testet der) til å velge.

describe("Tegnforklaringen", () => {
  it("har Startpunkt og «omtrentlig rute», uten Mål, når ingen kort har Mål", () => {
    const html = renderToString(<Tegnforklaring harMal={false} />);
    expect(html).toMatch(/>1<\/span>Startpunkt<\/span>/);
    expect(html).toContain("omtrentlig rute</span>");
    expect(html).not.toContain("Mål");
    expect(html).not.toContain("tegnforklaring-mal");
  });

  it("har Mål mellom Startpunkt og «omtrentlig rute» når minst ett kort har Mål", () => {
    const html = renderToString(<Tegnforklaring harMal />);
    const plasser = ["Startpunkt", 'data-testid="tegnforklaring-mal"', "Mål", "omtrentlig rute"].map((d) =>
      html.indexOf(d),
    );
    expect(plasser.every((p) => p >= 0), JSON.stringify(plasser)).toBe(true);
    expect([...plasser].sort((a, b) => a - b)).toEqual(plasser);
    expect(html).toMatch(/<svg[^>]*><path d="M0,-8 L7,5 L-7,5 Z"><\/path><\/svg>Mål/);
  });

  it("er skjult for skjermlesere, fordi kortene har alt kartet viser", () => {
    expect(renderToString(<Tegnforklaring harMal />)).toMatch(/^<div[^>]*aria-hidden="true"/);
  });
});
