import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Forbudene i UX-DR46 og ordene UX-DR47 forbyr (story 1.15). Visningen (src/ui/ og src/app/) har ingen
// popup, varsler, deling, posisjon, lagring i nettleseren, innlogging eller noe som bare vises ved
// hover. Tekstene sier aldri «trygg» eller «trygt», og ingen feilmelding er «Oops» eller «Noe gikk galt».
// Filene leses med fs og sjekkes med RegExp, så testen ikke avhenger av grep på maskinen.
// Testfilene er unntatt, fordi de kan nevne et forbudt mønster for å sjekke at det mangler.

const ROT = fileURLToPath(new URL("../../", import.meta.url));
const ENDELSER = /\.(ts|tsx|js|jsx|mjs|css)$/;
const TESTFIL = /\.test\.[cm]?[jt]sx?$/;

type Fil = { sti: string; tekst: string };

/** Alle kildefiler under mappene, rekursivt, uten testfiler. */
function les(...mapper: string[]): Fil[] {
  return mapper.flatMap((mappe) =>
    readdirSync(join(ROT, mappe), { recursive: true, encoding: "utf8" })
      .filter((navn) => ENDELSER.test(navn) && !TESTFIL.test(navn))
      .map((navn) => {
        const full = join(ROT, mappe, navn);
        return { sti: relative(ROT, full), tekst: readFileSync(full, "utf8") };
      }),
  );
}

/** Linjene som treffer `monster`, som «sti:linje: tekst». */
function treff(filer: readonly Fil[], monster: RegExp): string[] {
  return filer.flatMap(({ sti, tekst }) =>
    tekst
      .split("\n")
      .map((linje, i) => ({ linje, nr: i + 1 }))
      .filter(({ linje }) => monster.test(linje))
      .map(({ linje, nr }) => `${sti}:${nr}: ${linje.trim()}`),
  );
}

/**
 * Strenglitteralene i en kildefil. Kommentarer matches også, slik at en strek eller et anførselstegn
 * i en kommentar ikke starter en streng, men de kastes.
 */
function strenger(tekst: string): string[] {
  const TOKEN = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g;
  return [...tekst.matchAll(TOKEN)].map((m) => m[0]).filter((t) => !t.startsWith("//") && !t.startsWith("/*"));
}

const VISNING = les("src/ui", "src/app");
const KODE = VISNING.filter((f) => !f.sti.endsWith(".css"));
const CSS = VISNING.filter((f) => f.sti.endsWith(".css"));

describe("forbud i visningen (UX-DR46)", () => {
  it("filene som sjekkes, finnes", () => {
    expect(KODE.length).toBeGreaterThan(10);
    expect(CSS.length).toBeGreaterThan(10);
    expect(KODE.some((f) => f.sti === join("src", "ui", "tekster.ts"))).toBe(true);
  });

  it.each([
    ["dialog eller popup", /<dialog|["'](alert)?dialog["']|showModal|window\.open|\b(alert|confirm|prompt)\(/],
    ["varsler (Notification)", /\bNotification\b|PushManager|serviceWorker/],
    ["deling", /navigator\.share|navigator\.clipboard/],
    ["posisjon", /geolocation|getCurrentPosition|watchPosition/],
    ["lagring i nettleseren", /localStorage|sessionStorage|indexedDB|document\.cookie/],
    ["innlogging", /logg (inn|ut)|innlogging|\blog ?in\b|\bsign ?in\b|passord|type=["']password/i],
  ])("ingen %s", (_navn, monster) => {
    expect(treff(KODE, monster)).toEqual([]);
  });

  it("ingen title-attributter eller SVG-<title>, som bare vises ved hover", () => {
    expect(treff(KODE, /\btitle=|<title\b/)).toEqual([]);
  });

  it("ingen :hover i CSS", () => {
    expect(treff(CSS, /:hover/)).toEqual([]);
  });
});

describe("ord som ikke brukes (UX-DR47)", () => {
  const FORBUDT = /trygg|trygt|\boops\b|noe gikk galt/i;
  const KJERNE = les("src/kjerne").filter((f) => !f.sti.endsWith(".css"));

  it("src/ui/tekster.ts har ingen av ordene", () => {
    const tekster = KODE.filter((f) => f.sti === join("src", "ui", "tekster.ts"));
    expect(tekster).toHaveLength(1);
    expect(treff(tekster, FORBUDT)).toEqual([]);
  });

  it("strengene i src/kjerne/ har ingen av ordene", () => {
    const alle = KJERNE.flatMap((f) => strenger(f.tekst).map((s) => `${f.sti}: ${s}`));
    expect(alle.length).toBeGreaterThan(50);
    expect(alle.filter((s) => FORBUDT.test(s))).toEqual([]);
  });
});
