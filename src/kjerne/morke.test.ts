import { describe, expect, it } from "vitest";
import turerJson from "../../testdata/turer.json";
import { filtrerTurer } from "./filtrering";
import { TIPS, vurderMorke, type Soltider } from "./morke";
import { osloTilUtc } from "./tid";
import { TurdatasettSkjema } from "./turdata/skjema";
import { turtidMin } from "./turtid";

// FR-21 med faste soltider som input (NFR-2), og UJ-1 mot testdata/turer.json (AD-16).

const { turer } = TurdatasettSkjema.parse(turerJson);
const tur = (id: string) => {
  const funnet = turer.find((t) => t.id === id);
  if (!funnet) throw new Error(`Ingen Tur med id ${id} i testdata/turer.json.`);
  return funnet;
};

const fasteSoltider = (dato: string, opp: string, ned: string): Soltider => ({
  [dato]: { oppUtc: osloTilUtc(dato, opp), nedUtc: osloTilUtc(dato, ned) },
});

const DATO = "2026-11-09";
const NED_16 = fasteSoltider(DATO, "08:30", "16:00");

describe("vurderMorke: solnedgang (FR-21)", () => {
  it("med solnedgang 16:00 får en Tur som ender 15:30, ikke Mørkevarsel", () => {
    expect(vurderMorke({ dato: DATO, start: "15:00" }, 30, NED_16)).toBeNull();
  });

  it("en Tur som ender 15:31, får Mørkevarsel med klokkeslett og tipset", () => {
    expect(vurderMorke({ dato: DATO, start: "15:00" }, 31, NED_16)).toEqual({
      arsak: "solnedgang",
      tidspunktUtc: osloTilUtc(DATO, "16:00"),
      klokkeslett: "16:00",
      tips: "Lurt å ta med hodelykt.",
    });
  });

  it("en Tur som ender etter solnedgang, får også Mørkevarsel", () => {
    expect(vurderMorke({ dato: DATO, start: "15:45" }, 60, NED_16)?.arsak).toBe("solnedgang");
  });
});

describe("vurderMorke: soloppgang (FR-21)", () => {
  const OPP_0830 = fasteSoltider(DATO, "08:30", "15:59");

  it("en Tur som starter før soloppgang, får Mørkevarsel med klokkeslettet for soloppgang", () => {
    expect(vurderMorke({ dato: DATO, start: "08:15" }, 30, OPP_0830)).toEqual({
      arsak: "soloppgang",
      tidspunktUtc: osloTilUtc(DATO, "08:30"),
      klokkeslett: "08:30",
      tips: TIPS,
    });
  });

  it("en Tur som starter ved soloppgang, får ikke Mørkevarsel", () => {
    expect(vurderMorke({ dato: DATO, start: "08:30" }, 30, OPP_0830)).toBeNull();
  });

  it("slår begge reglene inn, gjelder solnedgang", () => {
    // Starter 09:45 før soloppgang 10:00 og ender 10:45, etter grensen 10:30 før solnedgang 11:00.
    const kortDag = fasteSoltider(DATO, "10:00", "11:00");
    expect(vurderMorke({ dato: DATO, start: "09:45" }, 60, kortDag)?.arsak).toBe("solnedgang");
  });
});

describe("vurderMorke: Turdagen", () => {
  it("en Tur over midnatt bruker soltidene for Turdagen, ikke for datoen den ender", () => {
    const sommer: Soltider = {
      ...fasteSoltider("2026-06-21", "03:28", "23:37"),
      ...fasteSoltider("2026-06-22", "03:28", "23:59"),
    };
    // 22:00 + 3 t = 01:00 den 22. juni. Turdagen er 21. juni, så solnedgangen er 23:37.
    expect(vurderMorke({ dato: "2026-06-21", start: "22:00" }, 180, sommer)).toMatchObject({
      arsak: "solnedgang",
      klokkeslett: "23:37",
    });
  });

  it("kaster når soltidene for Turdagen mangler", () => {
    expect(() => vurderMorke({ dato: "2026-11-10", start: "10:00" }, 30, NED_16)).toThrow(/2026-11-10/);
  });

  it("bruker Oslo-tid også rundt sommertidsskiftet", () => {
    // 29. mars 2026 går klokka fra 02:00 til 03:00. Starttidspunktet er Oslo-tid.
    const skift = fasteSoltider("2026-03-29", "07:10", "20:05");
    expect(vurderMorke({ dato: "2026-03-29", start: "19:30" }, 5, skift)).toBeNull();
    expect(vurderMorke({ dato: "2026-03-29", start: "19:30" }, 6, skift)?.klokkeslett).toBe("20:05");
  });
});

describe("UJ-1 kl. 15:00 9. november, 1 t, Middels, utsikt (FR-21)", () => {
  const sok = { dato: DATO, start: "15:00" };
  const uj1 = fasteSoltider(DATO, "08:30", "15:59");

  it.each([
    ["storlihytta-fra-vardeveien", null],
    ["skihytta-fra-damefallet", "15:59"],
    ["bergsvatnet", "15:59"],
  ])("%s: Mørkevarsel %s", (id, klokkeslett) => {
    const varsel = vurderMorke(sok, turtidMin(tur(id)), uj1);
    expect(varsel?.klokkeslett ?? null).toBe(klokkeslett);
  });

  it("Turer med Mørkevarsel er fortsatt med etter filtreringen, som ikke vet om mørket", () => {
    const passer = filtrerTurer(turer, { tilgjengeligMin: 60, vanskelighetsgrad: "B" });
    const medVarsel = passer.filter(({ turtidMin: tid }) => vurderMorke(sok, tid, uj1) !== null);
    expect(medVarsel.length).toBeGreaterThan(0);
    expect(passer.map(({ tur: t }) => t.id)).toEqual(
      expect.arrayContaining(["skihytta-fra-damefallet", "bergsvatnet", "storlihytta-fra-vardeveien"]),
    );
  });
});
