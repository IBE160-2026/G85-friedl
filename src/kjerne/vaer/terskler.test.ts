import { describe, expect, it } from "vitest";
import vaertersklerJson from "../../../data/vaerterskler.json";
import { lesVaerterskler, VAERTERSKLER } from "./terskler";

// En dyp kopi av fila, som hver test kan ødelegge på sin måte.
const kopi = () => structuredClone(vaertersklerJson) as unknown as Record<string, unknown> & {
  klasser: Record<string, unknown>[];
};

describe("VAERTERSKLER", () => {
  it("har strengeste klasse først og startverdiene fra FR-8", () => {
    expect(VAERTERSKLER).toEqual({
      versjon: 1,
      klasser: [
        { klasse: "fraradet", nedbor_mm_t_minst: 10, vind_ms_minst: 17.2, temp_c_under: null },
        { klasse: "darlig", nedbor_mm_t_minst: 2, vind_ms_minst: 10.8, temp_c_under: -10 },
        { klasse: "middels", nedbor_mm_t_minst: 0.5, vind_ms_minst: 8.0, temp_c_under: 0 },
      ],
    });
  });

  it("godtar en gyldig kopi uendret", () => {
    expect(lesVaerterskler(kopi())).toEqual(VAERTERSKLER);
  });
});

describe("lesVaerterskler avviser ugyldige terskelfiler", () => {
  const forventFeil = (data: unknown, hva: RegExp) => {
    let melding = "";
    try {
      lesVaerterskler(data);
    } catch (e) {
      melding = (e as Error).message;
    }
    expect(melding).toContain("data/vaerterskler.json");
    expect(melding).toMatch(hva);
  };

  it("ukjent nøkkel på toppnivå", () => {
    forventFeil({ ...kopi(), ekstra: true }, /ekstra/);
  });

  it("ukjent nøkkel i en klasse", () => {
    const data = kopi();
    data.klasser[1] = { ...data.klasser[1], nedbor_mm_minst: 2 };
    forventFeil(data, /nedbor_mm_minst/);
  });

  it("feil versjon", () => {
    forventFeil({ ...kopi(), versjon: 2 }, /versjon/);
  });

  it("feil rekkefølge", () => {
    const data = kopi();
    data.klasser.reverse();
    forventFeil(data, /strengeste klasse først/);
  });

  it("en klasse mangler", () => {
    const data = kopi();
    data.klasser.pop();
    forventFeil(data, /strengeste klasse først/);
  });

  it("ukjent klasse", () => {
    const data = kopi();
    data.klasser[0] = { ...data.klasser[0], klasse: "storm" };
    forventFeil(data, /expected one of "fraradet"\|"darlig"\|"middels"/);
  });

  it("en grense som mangler, i stedet for null", () => {
    const data = kopi();
    delete data.klasser[0].temp_c_under;
    forventFeil(data, /temp_c_under/);
  });

  it("en grense som ikke er et tall", () => {
    const data = kopi();
    data.klasser[2] = { ...data.klasser[2], vind_ms_minst: "8" };
    forventFeil(data, /vind_ms_minst/);
  });
});
