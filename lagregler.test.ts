import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

// Lagreglene (AR-1, AD-1 og AD-14) i eslint.config.mjs testes her, slik at de ikke kan råtne i stillhet.
// Filene finnes ikke; lintText bruker filePath bare til å velge konfigurasjon.

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: import.meta.dirname });
});

async function lagregelfeil(filePath: string, kode: string): Promise<string[]> {
  const [resultat] = await eslint.lintText(kode, { filePath });
  return resultat.messages
    .filter((m) => m.severity === 2 && m.message.includes("Lagregel"))
    .map((m) => m.message);
}

async function forventBrudd(filePath: string, kode: string) {
  const feil = await lagregelfeil(filePath, kode);
  expect(feil, `${filePath}: ${kode}`).toHaveLength(1);
}

async function forventOk(filePath: string, kode: string) {
  const [resultat] = await eslint.lintText(kode, { filePath });
  const feil = resultat.messages.filter((m) => m.severity === 2);
  expect(feil, `${filePath}: ${kode}`).toEqual([]);
}

describe("lagregler: src/kjerne/", () => {
  const fil = "src/kjerne/midlertidig.ts";

  it.each([
    "import { x } from '@/server/x';\nexport const y = x;",
    "import { x } from '../ui/x';\nexport const y = x;",
    "import { x } from '@/app/x';\nexport const y = x;",
    "import { x } from '../server/side';\nexport const y = x;",
    "import { x } from '../app/x';\nexport const y = x;",
    "import { x } from './../server/x';\nexport const y = x;",
    "export { x } from '@/server/x';",
  ])("forbyr import fra et ytre lag: %s", async (kode) => {
    await forventBrudd(fil, kode);
  });

  it("forbyr relativ import fra en undermappe", async () => {
    await forventBrudd("src/kjerne/visning/midlertidig.ts", "import { x } from '../../ui/x';\nexport const y = x;");
  });

  it.each([
    "export const svar = fetch('https://example.com');",
    "export const nokkel = process.env.ANTHROPIC_API_KEY;",
    "export const na = Date.now();",
    "export const na = new Date();",
    "export const na = Date();",
    "export const na = Date['now']();",
    "export const na = new Date(...[]);",
    "export const na = globalThis.Date.now();",
    "export const na = Temporal.Now.instant();",
    "export const na = performance.now();",
    "export const svar = globalThis.fetch('https://example.com');",
    "export const nokkel = globalThis.process.env.ANTHROPIC_API_KEY;",
  ])("forbyr %s", async (kode) => {
    await forventBrudd(fil, kode);
  });

  it.each([
    "import process from 'node:process';\nexport const e = process.env;",
    "import process from 'process';\nexport const e = process.env;",
    "import { readFileSync } from 'fs';\nexport const f = readFileSync;",
    "import { readFile } from 'fs/promises';\nexport const f = readFile;",
    "import { request } from 'node:https';\nexport const f = request;",
  ])("forbyr Node-modul: %s", async (kode) => {
    await forventBrudd(fil, kode);
  });

  it("tillater new Date(0) og import fra kjernen", async () => {
    await forventOk(fil, "import { z } from 'zod';\nimport { a } from './a';\nexport const t = new Date(0);\nexport const s = z.string();\nexport const b = a;");
  });
});

describe("lagregler: visningen importerer bare typer fra kjernen", () => {
  it.each(["src/ui/X.tsx", "src/app/page.tsx", "src/app/layout.tsx"])(
    "%s: verdiimport fra @/kjerne feiler",
    async (fil) => {
      await forventBrudd(fil, "import { SokSkjema } from '@/kjerne/sok';\nexport const s = SokSkjema;");
    },
  );

  it("src/ui/X.tsx: relativ verdiimport fra kjernen feiler", async () => {
    await forventBrudd("src/ui/X.tsx", "import { SokSkjema } from '../kjerne/sok';\nexport const s = SokSkjema;");
  });

  it.each(["src/ui/X.tsx", "src/app/page.tsx"])("%s: import type går gjennom", async (fil) => {
    await forventOk(fil, "import type { Sok } from '@/kjerne/sok';\nexport type S = Sok;");
  });

  it("src/app/api/sok/route.ts: verdiimport fra kjernen er lov", async () => {
    await forventOk("src/app/api/sok/route.ts", "import { SokSkjema } from '@/kjerne/sok';\nexport const s = SokSkjema;");
  });
});

describe("lagregler: src/server/side", () => {
  const sideImport = "import { lagSidedata } from '@/server/side';\nexport const f = lagSidedata;";

  it.each(["src/ui/X.tsx", "src/app/api/sok/route.ts", "src/app/layout.tsx", "src/kjerne/a.ts", "src/server/sok.ts"])(
    "%s: import av @/server/side feiler",
    async (fil) => {
      await forventBrudd(fil, sideImport);
    },
  );

  it("src/server/sok.ts: relativ import av ./side feiler", async () => {
    await forventBrudd("src/server/sok.ts", "import { lagSidedata } from './side';\nexport const f = lagSidedata;");
  });

  it("src/app/page.tsx: import av @/server/side går gjennom", async () => {
    await forventOk("src/app/page.tsx", sideImport);
    await forventOk("src/app/page.tsx", "import { lagSidedata } from '../server/side';\nexport const f = lagSidedata;");
  });

  it.each([
    ["src/ui/X.tsx", "@/server/side.js"],
    ["src/ui/X.tsx", "@/server/side/index"],
    ["src/app/api/sok/route.ts", "@/server/side.js"],
    ["src/app/api/sok/route.ts", "./../../../server/side"],
    ["src/server/vaer/a.ts", "../side"],
    ["src/server/vaer/a.ts", "./../side.ts"],
  ])("%s: import av %s feiler", async (fil, sti) => {
    await forventBrudd(fil, `import { lagSidedata } from '${sti}';\nexport const f = lagSidedata;`);
  });

  it("src/app/page.tsx: side med endelse eller /index går gjennom", async () => {
    await forventOk("src/app/page.tsx", "import { lagSidedata } from '@/server/side.ts';\nexport const f = lagSidedata;");
    await forventOk("src/app/page.tsx", "import { lagSidedata } from '@/server/side/index';\nexport const f = lagSidedata;");
  });

  it("src/app/page.tsx: annet fra src/server/ feiler", async () => {
    await forventBrudd("src/app/page.tsx", "import { lagMiljo } from '@/server/miljo';\nexport const f = lagMiljo;");
    await forventBrudd("src/app/page.tsx", "import { x } from '@/server/sidedata';\nexport const f = x;");
  });

  it("src/ui/X.tsx: ingenting fra src/server/, heller ikke typer", async () => {
    await forventBrudd("src/ui/X.tsx", "import { lagMiljo } from '@/server/miljo';\nexport const f = lagMiljo;");
    await forventBrudd("src/ui/X.tsx", "import type { Miljo } from '@/server/miljo';\nexport type M = Miljo;");
  });

  it("src/app/layout.tsx: ingenting fra src/server/, heller ikke typer", async () => {
    await forventBrudd("src/app/layout.tsx", "import { lagMiljo } from '@/server/miljo';\nexport const f = lagMiljo;");
    await forventBrudd("src/app/layout.tsx", "import type { Miljo } from '@/server/miljo';\nexport type M = Miljo;");
  });

  it("src/app/api/sok/route.ts: andre skallmoduler er lov", async () => {
    await forventOk("src/app/api/sok/route.ts", "import { sok } from '@/server/sok';\nexport const f = sok;");
  });
});

describe("lagregler: skallet og API-et importerer ikke visningen", () => {
  it.each([
    ["src/server/sok.ts", "@/ui/X"],
    ["src/server/sok.ts", "@/app/page"],
    ["src/server/vaer/met.ts", "../../ui/X"],
    ["src/app/api/sok/route.ts", "@/ui/X"],
    ["src/app/api/sok/route.ts", "../../../ui/X"],
  ])("%s: import av %s feiler", async (fil, sti) => {
    await forventBrudd(fil, `import { X } from '${sti}';\nexport const f = X;`);
  });

  it("src/server/sok.ts: kjernen er lov", async () => {
    await forventOk("src/server/sok.ts", "import { SokSkjema } from '@/kjerne/sok';\nexport const s = SokSkjema;");
  });
});

describe("lagregler: ingen \"use cache\" (AD-14)", () => {
  it.each(["src/app/x.tsx", "src/kjerne/x.ts", "src/server/x.ts", "src/ui/X.tsx", "src/app/api/sok/route.ts"])(
    "%s: \"use cache\" øverst i fila feiler",
    async (fil) => {
      await forventBrudd(fil, '"use cache";\nexport const x = 1;');
    },
  );

  it.each(["src/app/x.tsx", "src/kjerne/x.ts", "src/app/api/sok/route.ts"])("%s: \"use cache\" i en funksjon feiler", async (fil) => {
    await forventBrudd(fil, 'export async function f() {\n  "use cache";\n  return 1;\n}');
  });

  it("src/app/x.tsx: \"use cache: remote\" feiler", async () => {
    await forventBrudd("src/app/x.tsx", '"use cache: remote";\nexport const x = 1;');
  });

  it("src/kjerne/x.ts: kjernens egne syntaksregler gjelder fortsatt", async () => {
    await forventBrudd("src/kjerne/x.ts", "export const na = new Date();");
  });

  it.each(["src/app/x.tsx", "src/ui/X.tsx"])("%s: \"use client\" går gjennom", async (fil) => {
    await forventOk(fil, '"use client";\nexport const x = 1;');
  });

  it("src/app/x.tsx: strengen \"use cache\" som verdi går gjennom", async () => {
    await forventOk("src/app/x.tsx", 'export const x = "use cache";');
  });
});
