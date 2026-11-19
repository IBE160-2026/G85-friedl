import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KartFeilgrense, KartLaster } from "./KartLaster";

// Story 3.1: lasteren for kartet. På serveren står bare den tomme kartflaten. Feilgrensen viser den
// samme tomme flaten hvis kartet ikke kan lastes (for eksempel en del av koden som ikke kan hentes),
// så resten av Resultatet står. Feilgrenser virker ikke i renderToString, så feiltilstanden testes ved
// å kalle feilgrensen direkte, slik React gjør når et barn kaster.

const TOM_FLATE = /^<div class="[^"]*flate[^"]*" data-testid="kart-laster"><\/div>$/;
const TOM_STATISK_FLATE = /^<div class="[^"]*statisk[^"]*" data-testid="kart-statisk-laster"><\/div>$/;

describe("KartLaster", () => {
  it("rendrer bare den tomme kartflaten på serveren, uten Leaflet", () => {
    const html = renderToString(<KartLaster kort={[]} valgt={0} />);
    expect(html).toMatch(TOM_FLATE);
    expect(html).not.toContain("leaflet");
  });

  it("rendrer den tomme statiske flaten på serveren i statisk modus (story 3.2)", () => {
    const html = renderToString(<KartLaster kort={[]} valgt={0} statisk />);
    expect(html).toMatch(TOM_STATISK_FLATE);
    expect(html).not.toContain("leaflet");
  });
});

describe("KartFeilgrense", () => {
  it("viser barna når ingenting feiler", () => {
    const html = renderToString(
      <KartFeilgrense>
        <p>kartet</p>
      </KartFeilgrense>,
    );
    expect(html).toBe("<p>kartet</p>");
  });

  it("bytter til den tomme kartflaten når et barn kaster, for eksempel når lastingen feiler", () => {
    const tilstand = KartFeilgrense.getDerivedStateFromError();
    expect(tilstand).toEqual({ feil: true });

    const grense = new KartFeilgrense({ children: <p>kartet</p> });
    grense.state = tilstand;
    const html = renderToString(<>{grense.render()}</>);
    expect(html).toMatch(TOM_FLATE);
    expect(html).not.toContain("kartet");
  });

  it("bytter til den tomme statiske flaten når det statiske kartet feiler", () => {
    const grense = new KartFeilgrense({ children: <p>kartet</p>, statisk: true });
    grense.state = KartFeilgrense.getDerivedStateFromError();
    const html = renderToString(<>{grense.render()}</>);
    expect(html).toMatch(TOM_STATISK_FLATE);
  });
});
