import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Lagreglene fra AD-1 (AR-1): avhengighetene peker innover.
// Flat config slår ikke sammen to objekter som setter samme regel for samme fil:
// det siste vinner. Derfor setter hvert filmønster under hele mønsterlista si selv.
// Regexene fanger både "@/…" og relative stier ("../ui/x", "./../server/y"),
// og for side også filendelse og "/index" ("@/server/side.js", "@/server/side/index").

const MELDING = "Lagregel AR-1 (AD-1)";

// Starten på en sti til en mappe rett under src/: "@/", "../", "./../../" osv.
const FRA_SRC = "^(@/|(\\./)?(\\.\\./)+)";
// Valgfri "/index" og filendelse etter "side".
const SIDE_SLUTT = "(/index)?(\\.[cm]?[jt]sx?)?$";

const kjerneImporterer = {
  regex: `${FRA_SRC}(server|app|ui)(/|$)`,
  message: `${MELDING}: src/kjerne/ importerer ikke fra src/server/, src/app/ eller src/ui/. Kjernen får alt som argumenter.`,
};

const kjerneNodeModuler = {
  regex: "^(node:.*|process|fs|fs/promises|http|https|net|child_process)$",
  message: `${MELDING}: src/kjerne/ bruker ikke Node-moduler. Skallet gjør I/O og sender inn det kjernen trenger.`,
};

const kjerneBareTyper = {
  regex: `${FRA_SRC}kjerne(/|$)`,
  allowTypeImports: true,
  message: `${MELDING}: visningen (src/app/ og src/ui/) importerer bare typer fra src/kjerne/. Bruk «import type».`,
};

// Ingen egen regel for MET-adapteren src/server/vaer/met.ts (AR-10): den er skjermet fra nettleseren
// av de eksisterende reglene ingentingFraServer (src/ui/ og src/app/), serverUtenomSide
// (src/app/page.tsx) og kjerneImporterer (src/kjerne/). Testet i lagregler.test.ts.
const ingentingFraServer = {
  regex: `${FRA_SRC}server(/|$)`,
  message: `${MELDING}: visningen importerer ikke fra src/server/. Bare src/app/page.tsx kan importere src/server/side.`,
};

const serverUtenomSide = {
  regex: `${FRA_SRC}server(?!/side${SIDE_SLUTT})(/|$)`,
  message: `${MELDING}: src/app/page.tsx importerer bare src/server/side fra skallet.`,
};

const side = {
  regex: `${FRA_SRC}server/side${SIDE_SLUTT}`,
  message: `${MELDING}: bare src/app/page.tsx importerer src/server/side.`,
};

// Inne i src/server/ peker "./side" og "../side" på src/server/side.
const sideRelativtISkallet = {
  regex: `^(\\./|(\\./)?(\\.\\./)+)side${SIDE_SLUTT}`,
  message: side.message,
};

const skalletIkkeVisning = {
  regex: `${FRA_SRC}(ui|app)(/|$)`,
  message: `${MELDING}: src/server/ importerer ikke fra src/ui/ eller src/app/. Avhengighetene peker innover.`,
};

const apiIkkeUi = {
  regex: `${FRA_SRC}ui(/|$)`,
  message: `${MELDING}: src/app/api/ importerer ikke fra src/ui/. Route handlers kaller skallet.`,
};

const importregel = (...patterns) => ({
  "@typescript-eslint/no-restricted-imports": ["error", { patterns }],
});

const KLOKKE = `${MELDING}: src/kjerne/ leser ikke klokka. «Nå» kommer som argument fra src/server/miljo.ts.`;
const NETT = `${MELDING}: src/kjerne/ bruker ikke nettverk. Skallet henter data og sender dem inn.`;
const PROSESS = `${MELDING}: src/kjerne/ leser ikke process. Skallet sender inn det kjernen trenger.`;

// AD-14: siden rendres dynamisk, og ingenting caches med "use cache" (også "use cache: remote" o.l.).
// Står både i det globale objektet for src/** og i kjerneobjektet, fordi kjernens
// no-restricted-syntax ellers ville overstyre den. Et nytt objekt som setter no-restricted-syntax
// for filer under src/, må også ta med ingenUseCache i lista si, ellers forsvinner regelen der.
const ingenUseCache = {
  selector: "ExpressionStatement[directive=/^use cache/]",
  message: "Lagregel AD-14: \"use cache\" brukes ikke. Siden rendres dynamisk per forespørsel.",
};

// AD-7: src/kjerne/tid.ts er eneste bruker av @date-fns/tz. Grunnregelen no-restricted-imports
// brukes, så sperren ikke kolliderer med @typescript-eslint/no-restricted-imports i lagreglene over.
const TIDSSONE = "Lagregel AD-7: bare src/kjerne/tid.ts bruker @date-fns/tz. Bruk Oslo-hjelperne der.";

// new TZDate() leser klokka, og new TZDate('Europe/Oslo') og TZDate.tz('Europe/Oslo') gjør det
// samme i en gitt sone. Regelen fanger bare disse klokkelesingene: new TZDate(2026, 10, 9) har to
// argumenter, men ingen sone. En manglende sone fanges av tidssone.test.ts.
const TZDATE_KLOKKE = `${KLOKKE} (new TZDate med færre enn to argumenter)`;

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Standard i eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ikke app-kode:
    "_bmad/**",
    "_bmad-output/**",
    ".logs/**",
    ".claude/**",
    "data/**",
    "test-results/**",
    "playwright-report/**",
  ]),

  // Alle filer: ingen importerer src/server/side (unntak for page.tsx under).
  {
    name: "lagregler/side",
    rules: importregel(side),
  },

  // Hele src/: ingen "use cache" (flettet inn i kjerneobjektet under).
  {
    name: "lagregler/cache",
    files: ["src/**"],
    rules: {
      "no-restricted-syntax": ["error", ingenUseCache],
    },
  },

  {
    name: "lagregler/kjerne",
    files: ["src/kjerne/**"],
    rules: {
      ...importregel(kjerneImporterer, kjerneNodeModuler),
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: NETT },
        { name: "process", message: PROSESS },
        { name: "performance", message: KLOKKE },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: KLOKKE },
        { object: "Temporal", property: "Now", message: KLOKKE },
        { object: "globalThis", property: "fetch", message: NETT },
        { object: "globalThis", property: "process", message: PROSESS },
        { object: "globalThis", property: "Date", message: KLOKKE },
        { object: "globalThis", property: "performance", message: KLOKKE },
        { object: "globalThis", property: "Temporal", message: KLOKKE },
      ],
      "no-restricted-syntax": [
        "error",
        ingenUseCache,
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: `${KLOKKE} (new Date() uten argument)`,
        },
        {
          selector: "NewExpression[callee.name='Date'] > SpreadElement",
          message: `${KLOKKE} (new Date(...) kan bli uten argument)`,
        },
        {
          selector: "CallExpression[callee.name='Date']",
          message: `${KLOKKE} (Date())`,
        },
        {
          selector: "NewExpression[callee.name='TZDate'][arguments.length<2]",
          message: TZDATE_KLOKKE,
        },
        {
          selector: "NewExpression[callee.name='TZDate'][arguments.length>=2] > SpreadElement",
          message: `${KLOKKE} (new TZDate(...) kan bli uten argument)`,
        },
        {
          selector: "CallExpression[callee.object.name='TZDate'][callee.property.name='tz'][arguments.length<2]",
          message: `${KLOKKE} (TZDate.tz med færre enn to argumenter)`,
        },
      ],
    },
  },

  {
    name: "lagregler/tidssone",
    ignores: ["src/kjerne/tid.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "@date-fns/tz", message: TIDSSONE }],
          patterns: [{ group: ["@date-fns/tz/*"], message: TIDSSONE }],
        },
      ],
    },
  },

  {
    name: "lagregler/skall",
    files: ["src/server/**"],
    rules: importregel(side, sideRelativtISkallet, skalletIkkeVisning),
  },

  {
    name: "lagregler/api",
    files: ["src/app/api/**"],
    rules: importregel(side, apiIkkeUi),
  },

  {
    name: "lagregler/ui",
    files: ["src/ui/**"],
    rules: importregel(kjerneBareTyper, ingentingFraServer),
  },

  {
    name: "lagregler/app",
    files: ["src/app/**"],
    ignores: ["src/app/api/**", "src/app/page.tsx"],
    rules: importregel(kjerneBareTyper, ingentingFraServer),
  },

  {
    name: "lagregler/page",
    files: ["src/app/page.tsx"],
    rules: importregel(kjerneBareTyper, serverUtenomSide),
  },
]);

export default eslintConfig;
