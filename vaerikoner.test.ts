import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SYMBOLKODER, vaersymbol } from "./src/kjerne/vaer/sammendrag";
import { VAERIKONER } from "./src/kjerne/vaer/vaerikoner";

// Story 2.9: METs værikoner (MIT) ligger lokalt i public/vaerikoner/ med LICENSE og KILDE.md (AD-15).
// Filnavnet er `symbol_code` med endelsen MET bruker. `VAERIKONER` i kjernen er lik filene, og `vaersymbol`
// gir bare en ikonsti for dem. Testen ligger i roten, fordi kjernen ikke kan bruke Node-moduler
// (lagregel AR-1).

const MAPPE = new URL("./public/vaerikoner/", import.meta.url);
const filer = readdirSync(MAPPE);
const svg = filer.filter((f) => f.endsWith(".svg"));

const ENDELSER = ["_day", "_night", "_polartwilight"] as const;

describe("værikonene i public/vaerikoner/", () => {
  it("har METs 83 ikoner, akkurat de som står i VAERIKONER", () => {
    expect(VAERIKONER.size).toBe(83);
    expect([...svg].sort()).toEqual([...VAERIKONER].map((k) => `${k}.svg`).sort());
  });

  it("har ikonene med alle tre endelsene der MET har én av dem", () => {
    for (const kode of VAERIKONER) {
      const uten = kode.replace(/_(day|night|polartwilight)$/, "");
      if (uten === kode) continue;
      expect(ENDELSER.map((e) => VAERIKONER.has(`${uten}${e}`)), kode).toEqual([true, true, true]);
      expect(VAERIKONER.has(uten), `${uten} finnes også uten endelse`).toBe(false);
    }
  });

  it("har bare ikonene, LICENSE og KILDE.md", () => {
    expect(filer.filter((f) => !f.endsWith(".svg")).sort()).toEqual(["KILDE.md", "LICENSE"]);
  });

  it("har MIT-lisensen fra MET og kilden med commit", () => {
    const lisens = readFileSync(new URL("LICENSE", MAPPE), "utf8");
    expect(lisens).toMatch(/^The MIT License \(MIT\)/);
    expect(lisens).toContain("Permission is hereby granted, free of charge");
    const kilde = readFileSync(new URL("KILDE.md", MAPPE), "utf8");
    expect(kilde).toContain("https://github.com/metno/weathericons");
    expect(kilde).toMatch(/Commit: `[0-9a-f]{40}`/);
  });

  it.each(SYMBOLKODER)("har et ikon for koden %s i Værsymbol-tabellen", (kode) => {
    const varianter = [`${kode}.svg`, ...ENDELSER.map((e) => `${kode}${e}.svg`), `${kode}andthunder.svg`];
    const medTorden = ENDELSER.map((e) => `${kode}andthunder${e}.svg`);
    expect([...varianter, ...medTorden].some((f) => svg.includes(f))).toBe(true);
  });

  it.each(svg)("%s har et ord, og vaersymbol peker på fila", (fil) => {
    const kode = fil.replace(/\.svg$/, "");
    expect(vaersymbol(kode)).toEqual({ ord: expect.any(String), ikonSti: `/vaerikoner/${fil}` });
  });

  it("ikonene er rene SVG-filer uten skript eller eksterne ressurser", () => {
    for (const fil of svg) {
      const tekst = readFileSync(new URL(fil, MAPPE), "utf8");
      expect(tekst, fil).toMatch(/^<svg[\s>]/);
      expect(tekst, fil).not.toMatch(/<script|<foreignObject|\son[a-z]+=|@import/i);
      const lenker = [...tekst.matchAll(/https?:\/\/[^"'\s)]+/g)].map((m) => m[0]);
      expect(lenker.filter((l) => !l.startsWith("http://www.w3.org/")), fil).toEqual([]);
    }
  });
});
