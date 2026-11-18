import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// tokens.css skal ha hver token fra frontmatteren i DESIGN.md, med samme verdi.
// Navnet er --{gruppe}-{nøkkel}[-{egenskap}] i kebab-case. En referanse {gruppe.nøkkel} til en enkel
// token blir var(--gruppe-nøkkel), og en referanse til en sammensatt typografitoken blir navnet alene.

const DESIGN = new URL("../../_bmad-output/planning-artifacts/ux/DESIGN.md", import.meta.url);
const TOKENS = new URL("./tokens.css", import.meta.url);

type Tre = { [nokkel: string]: string | Tre };

/** Leser frontmatteren i DESIGN.md. Den er YAML med kart og skalarer, og lister hoppes over. */
function lesFrontmatter(md: string): Tre {
  const [, fm] = md.split(/^---$/m);
  const rot: Tre = {};
  const stakk: { innrykk: number; obj: Tre }[] = [{ innrykk: -1, obj: rot }];
  for (const linje of fm.split("\n")) {
    if (!linje.trim() || /^\s*- /.test(linje)) continue;
    const m = /^( *)('[^']*'|[^:]+):\s*(.*)$/.exec(linje);
    if (!m) continue;
    const innrykk = m[1].length;
    const nokkel = m[2].replace(/^'|'$/g, "");
    while (stakk[stakk.length - 1].innrykk >= innrykk) stakk.pop();
    const forelder = stakk[stakk.length - 1].obj;
    if (m[3] === "") {
      const barn: Tre = {};
      forelder[nokkel] = barn;
      stakk.push({ innrykk, obj: barn });
    } else {
      forelder[nokkel] = m[3].replace(/^'(.*)'$/, "$1").replace(/^"(.*)"$/, "$1");
    }
  }
  return rot;
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const cssNavn = (sti: string[]) => `--${sti.map(kebab).join("-")}`;

const frontmatter = lesFrontmatter(readFileSync(DESIGN, "utf8"));
const GRUPPER = ["colors", "typography", "rounded", "spacing", "components"] as const;

function forventetVerdi(verdi: string): string {
  return verdi.replace(/\{([^}]+)\}/g, (_, ref: string) => {
    const sti = ref.split(".");
    const mal = sti.reduce<string | Tre | undefined>(
      (o, k) => (typeof o === "object" ? o[k] : undefined),
      frontmatter,
    );
    if (mal === undefined) throw new Error(`DESIGN.md refererer til en token som ikke finnes: {${ref}}`);
    return typeof mal === "string" ? `var(${cssNavn(sti)})` : sti[sti.length - 1];
  });
}

/** Alle tokens som [CSS-navn, forventet verdi]. */
const tokens: [string, string][] = GRUPPER.flatMap((gruppe) => {
  const tre = frontmatter[gruppe];
  if (typeof tre !== "object") throw new Error(`DESIGN.md mangler gruppen ${gruppe}`);
  return Object.entries(tre).flatMap(([nokkel, v]): [string, string][] =>
    typeof v === "string"
      ? [[cssNavn([gruppe, nokkel]), forventetVerdi(v)]]
      : Object.entries(v).map(([egenskap, v2]): [string, string] => {
          if (typeof v2 !== "string") throw new Error(`${gruppe}.${nokkel}.${egenskap} er for dypt`);
          return [cssNavn([gruppe, nokkel, egenskap]), forventetVerdi(v2)];
        }),
  );
});

const css = readFileSync(TOKENS, "utf8");
const variabler = new Map([...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

describe("tokens.css", () => {
  it("leser tokens fra alle gruppene i DESIGN.md", () => {
    expect(tokens.length).toBeGreaterThan(100);
    expect(tokens).toContainEqual(["--colors-forest", "#1F4A38"]);
    expect(tokens).toContainEqual(["--spacing-touch-min", "44px"]);
    expect(tokens).toContainEqual(["--components-segmentvelger-selected-background", "var(--colors-forest)"]);
    expect(tokens).toContainEqual(["--components-ditt-sok-label-typography", "overline"]);
  });

  it.each(tokens)("har %s: %s", (navn, verdi) => {
    expect(variabler.get(navn)).toBe(verdi);
  });

  it("har ingen variabler som ikke er tokens", () => {
    const kjente = new Set(tokens.map(([navn]) => navn));
    expect([...variabler.keys()].filter((navn) => !kjente.has(navn))).toEqual([]);
  });
});
