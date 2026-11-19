import { afterEach, describe, expect, it, vi } from "vitest";
import { lagStandardSok, type Sok } from "@/kjerne/sok";
import { ApiFeilSkjema, UgyldigSokFeilSkjema, UkjentDemoFeilSkjema } from "@/kjerne/visning/feil";
import { type Resultatvisning, ResultatvisningSkjema } from "@/kjerne/visning/skjema";
import { DEMO_IDER } from "@/server/vaer/scenarioer";
import { POST } from "./route";

// Kontrakttesten for POST /api/sok (story 1.10, AR-7): hver demo-ID og hver rad i I/O-matrisen,
// med handleren kalt direkte. Alle svar valideres mot skjemaene. Ingen test kaller MET eller Anthropic.

const kast = vi.hoisted(() => ({ pa: false }));

vi.mock("@/kjerne/anbefaling", async (importOriginal) => {
  const ekte = await importOriginal<typeof import("@/kjerne/anbefaling")>();
  return {
    ...ekte,
    anbefal: (...args: Parameters<typeof ekte.anbefal>) => {
      if (kast.pa) throw new Error("Kjernen kastet (test).");
      return ekte.anbefal(...args);
    },
  };
});

afterEach(() => {
  kast.pa = false;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const UJ1: Sok = {
  dato: "2026-11-09",
  start: "13:30",
  tilgjengeligMin: 120,
  vanskelighetsgrad: "B",
  utsikt: true,
  vann: false,
};

function post(body: unknown, demo: string | null = "uten-vaer"): Promise<Response> {
  const url = demo === null ? "http://localhost/api/sok" : `http://localhost/api/sok?demo=${encodeURIComponent(demo)}`;
  return POST(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function resultat(svar: Response): Promise<Resultatvisning> {
  expect(svar.status).toBe(200);
  const json: unknown = await svar.json();
  const lest = ResultatvisningSkjema.safeParse(json);
  expect(lest.error?.issues).toBeUndefined();
  return lest.data as Resultatvisning;
}

/** Alle nøkler i et JSON-tre. */
function nokler(v: unknown): string[] {
  if (Array.isArray(v)) return v.flatMap(nokler);
  if (v === null || typeof v !== "object") return [];
  return Object.entries(v).flatMap(([k, x]) => [k, ...nokler(x)]);
}

describe("kontrakt: POST /api/sok for hver demo-ID", () => {
  it.each(DEMO_IDER)("%s gir en Resultatvisning uten snake_case", async (demoId) => {
    const svar = await post(UJ1, demoId);
    const tekst = await svar.clone().text();
    const v = await resultat(svar);
    expect(nokler(JSON.parse(tekst)).filter((k) => k.includes("_"))).toEqual([]);
    // Fram til story 2.8 kobler inn Værklassen, er været «ikke vurdert» også i demoene med Værmelding.
    expect(v.vaer.type).toBe("mangler");
  });
});

describe("I/O-matrisen (story 1.10)", () => {
  it("UJ-1 uten vær: tre Turforslag med kart.nummer 1–3 og Værmeldingen mangler", async () => {
    const v = await resultat(await post(UJ1));
    expect(v.overskrift).toBe("Tre Turforslag som passer tiden din");
    expect(v.liveTekst).toBe(v.overskrift);
    expect(v.justering).toBeUndefined();
    expect(v.sok).toEqual(UJ1);
    expect(v.vaer).toEqual({
      type: "mangler",
      tekst: "Været er ikke vurdert. Vi fikk ikke hentet Værmeldingen fra MET.",
    });
    expect(v.dittSok).toEqual({
      turdag: "I dag, man. 9. nov.",
      starttidspunkt: "13:30",
      tilgjengeligTid: "2 t",
      vanskelighetsgrad: "Middels",
      opplevelsespreferanser: ["utsikt"],
    });
    expect(v.utfall.type).toBe("turforslag");
    if (v.utfall.type !== "turforslag") return;
    expect(v.utfall.kort.map((k) => k.kart.nummer)).toEqual([1, 2, 3]);
    expect(v.utfall.kort.every((k) => k.kriterier[1].tekst === "ikke vurdert")).toBe(true);
    expect(v.resultatId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("gir en ny resultatId for hvert Søk", async () => {
    const a = await resultat(await post(UJ1));
    const b = await resultat(await post(UJ1));
    expect(a.resultatId).not.toBe(b.resultatId);
    expect({ ...a, resultatId: "" }).toEqual({ ...b, resultatId: "" });
  });

  it("UJ-3: 15 min gir den korteste Turen som Alternativ", async () => {
    const v = await resultat(await post({ ...UJ1, tilgjengeligMin: 15 }));
    expect(v.overskrift).toBe("Ingen Tur passer 15 min.");
    expect(v.liveTekst).toBe(v.overskrift);
    expect(v.utfall.type).toBe("kortesteTur");
    if (v.utfall.type !== "kortesteTur") return;
    expect(v.utfall.kort.turId).toBe("storlihytta-fra-vardeveien");
    expect(v.utfall.kort.kart.nummer).toBe(1);
    expect(v.utfall.passerMedTekst).toBe("Med 30 min eller mer passer minst én Tur.");
    expect(v.dittSok.tilgjengeligTid).toBe("15 min");
  });

  it("passert tid: 12:00 flyttes til 13:30 med justering, ikke 400", async () => {
    const v = await resultat(await post({ ...UJ1, start: "12:00" }));
    expect(v.sok.start).toBe("13:30");
    expect(v.justering).toBe("Flyttet til 13:30, fordi 12:00 har passert.");
    expect(v.dittSok.starttidspunkt).toBe("13:30");
  });

  it("i morgen: Ditt søk sier «I morgen» med datoen", async () => {
    const v = await resultat(await post({ ...UJ1, dato: "2026-11-10", start: "10:00", vanskelighetsgrad: "R", vann: true }));
    expect(v.dittSok).toEqual({
      turdag: "I morgen, tir. 10. nov.",
      starttidspunkt: "10:00",
      tilgjengeligTid: "2 t",
      vanskelighetsgrad: "Krevende",
      opplevelsespreferanser: ["utsikt", "vann"],
    });
  });

  it.each([
    ["ekstra felt", { ...UJ1, ekstra: 1 }, "ekstra"],
    ["start 13:10", { ...UJ1, start: "13:10" }, "start"],
    ["snake_case-felt", { ...UJ1, tilgjengelig_min: 120 }, ""],
    ["Tilgjengelig tid utenfor steg", { ...UJ1, tilgjengeligMin: 100 }, "tilgjengeligMin"],
    ["manglende felt", { dato: "2026-11-09" }, "start"],
    ["ikke et objekt", [1, 2], ""],
  ])("ugyldig Søk (%s) gir 400 ugyldig-sok", async (_navn, body, forventet) => {
    const svar = await post(body);
    expect(svar.status).toBe(400);
    const json: unknown = await svar.json();
    expect(UgyldigSokFeilSkjema.safeParse(json).success).toBe(true);
    const feil = UgyldigSokFeilSkjema.parse(json);
    expect(feil.detaljer.length).toBeGreaterThan(0);
    // En ekstra nøkkel står på roten (sti ""), med nøkkelen i meldingen.
    if (forventet) expect(JSON.stringify(feil.detaljer)).toContain(forventet);
  });

  it("ugyldig JSON gir 400 ugyldig-sok", async () => {
    const svar = await post("{ikke json");
    expect(svar.status).toBe(400);
    expect(UgyldigSokFeilSkjema.parse(await svar.json()).detaljer).toEqual([
      { sti: "", melding: "Søket er ikke gyldig JSON." },
    ]);
  });

  it.each(["finnes-ikke", ""])("ukjent demo «%s» gir 400 ukjent-demo med de gyldige ID-ene", async (demo) => {
    const svar = await post(UJ1, demo);
    expect(svar.status).toBe(400);
    const json: unknown = await svar.json();
    expect(UkjentDemoFeilSkjema.safeParse(json).success).toBe(true);
    expect(json).toEqual({ feil: "ukjent-demo", gyldigeDemoIder: [...DEMO_IDER] });
    expect(ApiFeilSkjema.safeParse(json).success).toBe(true);
  });

  it("uventet feil: kjernen kaster, og svaret er 500 med console.error", async () => {
    const feillogg = vi.spyOn(console, "error").mockImplementation(() => {});
    kast.pa = true;
    const svar = await post(UJ1);
    expect(svar.status).toBe(500);
    // Tom kropp: feildetaljer lekker aldri ut til klienten.
    expect(await svar.text()).toBe("");
    expect(feillogg).toHaveBeenCalledTimes(1);
  });

  it("uten demo: systemklokka og Resultat etter FR-13", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T09:07:00+01:00"));
    const sok = { ...lagStandardSok(Date.now()), utsikt: true };
    expect(sok.start).toBe("09:15");

    const v = await resultat(await post(sok, null));
    expect(v.sok).toEqual(sok);
    expect(v.justering).toBeUndefined();
    expect(v.dittSok.turdag).toBe("I dag, tor. 12. nov.");
    expect(v.vaer.type).toBe("mangler");
    expect(v.utfall.type).toBe("turforslag");
    expect(v.bedreTidsvindu).toBeUndefined();
  });

  it("uten demo: et Søk for scenarioets dag er ukjent dato og settes tilbake til standard", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T09:07:00+01:00"));
    const v = await resultat(await post(UJ1, null));
    expect(v.sok.dato).toBe("2026-11-12");
    expect(v.justering).toBe("Turdagen er ikke i dag eller i morgen, så Søket er satt tilbake til standard.");
  });
});
