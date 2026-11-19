import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Bakgrunnsfeil, FEILGRENSE, FLISFRIST, flisvakt, SkjultBakgrunnsfeil } from "./Bakgrunnsfeil";
import { BAKGRUNNSKART_FEIL } from "./tekster";

// Story 3.4: når bakgrunnskartet ikke laster. Leaflet kan ikke kjøres på serveren, så her testes
// flisvakten (med falske tidtakere) og teksten. At flislaget i Leaflet gir papirflaten og teksten i alle
// kartene, testes i e2e/kart.spec.ts med blokkerte fliser.

/** Attributtene i den første taggen i `html`, uavhengig av rekkefølgen. */
function attributter(html: string): Record<string, string> {
  const tagg = /^<[a-z]+([^>]*)>/.exec(html)![1];
  return Object.fromEntries([...tagg.matchAll(/([a-z-]+)="([^"]*)"/g)].map(([, navn, verdi]) => [navn, verdi]));
}
const tekst = (html: string) => html.replace(/<[^>]+>/g, "");

describe("flisvakt", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const lag = () => {
    const feilet = vi.fn();
    return { feilet, ...flisvakt(feilet) };
  };

  it("melder feilen straks når en flis feiler før noen har lastet", () => {
    const { feilet, hendelser } = lag();
    hendelser.tileloadstart();
    hendelser.tileerror();
    expect(feilet).toHaveBeenCalledTimes(1);
  });

  it(`tåler færre enn ${FEILGRENSE} feil etter at en flis har lastet, og melder ved ${FEILGRENSE}`, () => {
    const { feilet, hendelser } = lag();
    hendelser.tileloadstart();
    hendelser.tileload();
    for (let i = 1; i < FEILGRENSE; i++) hendelser.tileerror();
    expect(feilet).not.toHaveBeenCalled();
    hendelser.tileload();
    hendelser.tileerror();
    expect(feilet).toHaveBeenCalledTimes(1);
    // Flere feil melder ikke på nytt.
    hendelser.tileerror();
    expect(feilet).toHaveBeenCalledTimes(1);
  });

  it(`melder feilen når ingen flis har lastet ${FLISFRIST} ms etter den første forespørselen`, () => {
    const { feilet, hendelser } = lag();
    vi.advanceTimersByTime(FLISFRIST * 2);
    expect(feilet).not.toHaveBeenCalled();
    hendelser.tileloadstart();
    vi.advanceTimersByTime(FLISFRIST / 2);
    // Nye forespørsler flytter ikke fristen.
    hendelser.tileloadstart();
    vi.advanceTimersByTime(FLISFRIST / 2 - 1);
    expect(feilet).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(feilet).toHaveBeenCalledTimes(1);
  });

  it("den første flisen som laster, stopper fristen, og senere forespørsler starter den ikke igjen", () => {
    const { feilet, hendelser } = lag();
    hendelser.tileloadstart();
    vi.advanceTimersByTime(FLISFRIST - 1);
    hendelser.tileload();
    hendelser.tileloadstart();
    vi.advanceTimersByTime(FLISFRIST * 2);
    expect(feilet).not.toHaveBeenCalled();
  });

  it("`stopp` stopper fristen når kartet fjernes", () => {
    const { feilet, hendelser, stopp } = lag();
    hendelser.tileloadstart();
    stopp();
    vi.advanceTimersByTime(FLISFRIST * 2);
    expect(feilet).not.toHaveBeenCalled();
  });
});

describe("Bakgrunnsfeil", () => {
  it("viser teksten i en status med testid når flisene feiler", () => {
    const html = renderToString(<Bakgrunnsfeil feilet />);
    expect(attributter(html).role).toBe("status");
    expect(tekst(html)).toBe(BAKGRUNNSKART_FEIL);
    const pille = html.slice(html.indexOf("<span"));
    expect(attributter(pille)["data-testid"]).toBe("kart-bakgrunn-feil");
  });

  it("er en tom status uten teksten når flisene laster", () => {
    const html = renderToString(<Bakgrunnsfeil feilet={false} />);
    expect(attributter(html).role).toBe("status");
    expect(tekst(html)).toBe("");
    expect(html).not.toContain("kart-bakgrunn-feil");
  });
});

describe("SkjultBakgrunnsfeil", () => {
  it("har teksten bare for skjermlesere ved feil, og er tom ellers", () => {
    const feil = renderToString(<SkjultBakgrunnsfeil feilet />);
    const a = attributter(feil);
    expect(a.role).toBe("status");
    expect(a.class).toMatch(/skjult/);
    expect(tekst(feil)).toBe(BAKGRUNNSKART_FEIL);
    expect(tekst(renderToString(<SkjultBakgrunnsfeil feilet={false} />))).toBe("");
  });
});
