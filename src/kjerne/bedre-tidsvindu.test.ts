import { describe, expect, it } from "vitest";
import turerJson from "../../testdata/turer.json";
import { finnBedreTidsvindu, type BedreTidsvinduInput } from "./bedre-tidsvindu";
import type { Soltider } from "./morke";
import { soltider } from "./sol";
import type { Sok } from "./sok";
import { klokkeTekst, leggTilDager, osloTilUtc } from "./tid";
import { TurdatasettSkjema } from "./turdata/skjema";
import { VAERTERSKLER, type Vaerterskler } from "./vaer/terskler";
import { TESTSCENARIOER } from "./vaer/testscenarioer";
import type { Vaerklasse, Vaermelding, Vaertime } from "./vaer/typer";
import { BedreTidsvinduSkjema, type BedreTidsvindu } from "./visning/skjema";

// Bedre tidsvindu (story 2.6, FR-19) mot Værscenarioene, testdata/turer.json og soltidene fra sol.ts.

const { turer } = TurdatasettSkjema.parse(turerJson);
const { "uj-2": uj2, "uj-3": uj3, "ingen-bedre": ingenBedre } = TESTSCENARIOER;

/** Soltidene for `dato` og dagen etter, slik serveren bygger dem. */
const solFor = (dato: string): Soltider => ({
  [dato]: soltider(dato),
  [leggTilDager(dato, 1)]: soltider(leggTilDager(dato, 1)),
});

const sok = (overstyr: Partial<Sok>): Sok => ({
  dato: "2026-11-09",
  start: "10:00",
  tilgjengeligMin: 180,
  vanskelighetsgrad: "R",
  utsikt: false,
  vann: false,
  ...overstyr,
});

/** Verdier som gir hver Værklasse med tersklene i data/vaerterskler.json. */
const VERDIER: Record<Vaerklasse, Pick<Vaertime, "nedborMmT" | "vindMs" | "tempC">> = {
  god: { nedborMmT: 0, vindMs: 2, tempC: 3 },
  middels: { nedborMmT: 1, vindMs: 2, tempC: 3 },
  darlig: { nedborMmT: 3, vindMs: 2, tempC: 3 },
  fraradet: { nedborMmT: 12, vindMs: 2, tempC: 3 },
};

/** En Værmelding for `dato` og dagen etter. `klasseFor` gir klassen per time, eller `mangler` for et hull. */
function melding(dato: string, klasseFor: (dato: string, time: number) => Vaerklasse | "mangler"): Vaermelding {
  const timer: Vaertime[] = [];
  for (const d of [dato, leggTilDager(dato, 1)]) {
    for (let h = 0; h < 24; h++) {
      const klasse = klasseFor(d, h);
      if (klasse === "mangler") continue;
      timer.push({ startUtc: osloTilUtc(d, klokkeTekst(h * 60)), ...VERDIER[klasse], symbolKode: null });
    }
  }
  return { timer };
}

const alle = (klasse: Vaerklasse) => melding("2026-11-09", () => klasse);

/** Kaller `finnBedreTidsvindu` med soltidene for Søkets dag og hele Turdatasettet som standard. */
function finn(input: Partial<BedreTidsvinduInput> & Pick<BedreTidsvinduInput, "sok" | "na" | "melding">) {
  return finnBedreTidsvindu({ klasse: "darlig", soltider: solFor(input.sok.dato), turer, ...input });
}

/** Håndlagde soltider for én dag, i norsk tid. */
const solDag = (dato: string, opp: string, ned: string): Soltider => ({
  [dato]: { oppUtc: osloTilUtc(dato, opp), nedUtc: osloTilUtc(dato, ned) },
});

/** Dårlig til 15:00 og god etter på 9. november, og god dagen etter. */
const godFra15 = () => melding("2026-11-09", (d, h) => (d === "2026-11-09" && h < 15 ? "darlig" : "god"));

function funnet(svar: BedreTidsvindu | null) {
  if (svar?.type !== "funnet") throw new Error(`Ventet funnet, fikk ${JSON.stringify(svar)}.`);
  return svar;
}

describe("de navngitte eksemplene", () => {
  it("UJ-2: i morgen fra kl. 14:00, 5 Turer, «Bruk 14:00»", () => {
    const s = sok({ utsikt: true });
    const svar = funnet(finn({ sok: s, na: uj2.na, melding: uj2.vaermelding }));
    expect(svar.nyttSok).toEqual({ ...s, dato: "2026-11-09", start: "14:00" });
    expect(svar.tekst).toBe("I morgen fra kl. 14:00 er Værklassen god.");
    expect(svar.dag).toBe("I morgen, man. 9. nov.");
    expect(svar.detalj).toBe("fra kl. 14:00 · samme 3 t, Krevende");
    expect(svar.antallTekst).toBe("5 Turer passer før mørket.");
    expect(svar.knappTekst).toBe("Bruk 14:00");
  });

  it("UJ-3: frarådet i dag gir i morgen 11:00, «Bruk i morgen 11:00»", () => {
    const s = sok({ dato: "2026-11-14", tilgjengeligMin: 120, vanskelighetsgrad: "B" });
    const svar = funnet(finn({ sok: s, klasse: "fraradet", na: uj3.na, melding: uj3.vaermelding }));
    expect(svar.nyttSok).toEqual({ ...s, dato: "2026-11-15", start: "11:00" });
    expect(svar.tekst).toMatch(/^I morgen fra kl\. 11:00 er Værklassen /);
    expect(svar.dag).toBe("I morgen, søn. 15. nov.");
    expect(svar.detalj).toBe("fra kl. 11:00 · samme 2 t, Middels");
    expect(svar.antallTekst).toBe("7 Turer passer før mørket.");
    expect(svar.knappTekst).toBe("Bruk i morgen 11:00");
  });

  it("dårlig til 15:00 og god etter: i dag 15:00, 1 Tur", () => {
    const svar = funnet(finn({ sok: sok({}), na: osloTilUtc("2026-11-09", "08:00"), melding: godFra15() }));
    expect(svar.nyttSok.dato).toBe("2026-11-09");
    expect(svar.nyttSok.start).toBe("15:00");
    expect(svar.tekst).toBe("I dag fra kl. 15:00 er Værklassen god.");
    expect(svar.dag).toBe("I dag, man. 9. nov.");
    expect(svar.detalj).toBe("fra kl. 15:00 · samme 3 t, Krevende");
    expect(svar.antallTekst).toBe("1 Tur passer før mørket.");
    expect(svar.knappTekst).toBe("Bruk 15:00");
  });

  it("ingen-bedre, Søk i dag: «… i dag eller i morgen.»", () => {
    const s = sok({ tilgjengeligMin: 120, vanskelighetsgrad: "B" });
    expect(finn({ sok: s, na: ingenBedre.na, melding: ingenBedre.vaermelding })).toEqual({
      type: "ingen",
      tekst: "Det finnes ikke noe bedre tidsvindu i dagslys i dag eller i morgen.",
    });
  });
});

describe("ingen og antall", () => {
  it("Turdag i morgen og ingenting bedre: «… i dagslys i morgen.», og dagen etter prøves ikke", () => {
    const s = sok({ dato: "2026-11-10" });
    const m = melding("2026-11-10", (d) => (d === "2026-11-10" ? "darlig" : "god"));
    expect(finn({ sok: s, na: osloTilUtc("2026-11-09", "10:00"), melding: m })).toEqual({
      type: "ingen",
      tekst: "Det finnes ikke noe bedre tidsvindu i dagslys i morgen.",
    });
  });

  it("et bedre vindu der ingen Tur rekker ned før mørket, vises likevel", () => {
    // Solnedgang 15:30: siste kandidat er 15:00, og der rekker ingen Tur å bli ferdig før 15:00.
    const soltider = solDag("2026-11-09", "08:00", "15:30");
    const na = osloTilUtc("2026-11-09", "08:00");
    const svar = funnet(finn({ sok: sok({}), na, melding: godFra15(), soltider }));
    expect(svar.nyttSok.start).toBe("15:00");
    expect(svar.antallTekst).toBe("Ingen Tur passer før mørket.");
  });

  it("antallet er bare Turene som består filtreringen (Vanskelighetsgrad og Tilgjengelig tid)", () => {
    // Solnedgang 23:00: fra 15:00 rekker alle Turene ned før mørket, så bare filtreringen avgjør.
    const soltider = solDag("2026-11-09", "06:00", "23:00");
    const na = osloTilUtc("2026-11-09", "08:00");
    const alleTurer = funnet(finn({ sok: sok({ tilgjengeligMin: 300 }), na, melding: godFra15(), soltider }));
    expect(alleTurer.antallTekst).toBe("12 Turer passer før mørket.");
    // Lett og 1 t: de fem lette Turene er 16, 33, 43, 54 og 62 min, så 62 min faller bort på tiden.
    const s = sok({ tilgjengeligMin: 60, vanskelighetsgrad: "G" });
    const lette = funnet(finn({ sok: s, na, melding: godFra15(), soltider }));
    expect(lette.antallTekst).toBe("4 Turer passer før mørket.");
  });

  it("antallet bruker filtreringen, men ikke Opplevelsespreferansene", () => {
    const na = osloTilUtc("2026-11-09", "08:00");
    const med = funnet(finn({ sok: sok({ utsikt: true, vann: true }), na, melding: godFra15() }));
    const uten = funnet(finn({ sok: sok({}), na, melding: godFra15() }));
    expect(med.antallTekst).toBe(uten.antallTekst);
    expect(med.nyttSok.utsikt && med.nyttSok.vann).toBe(true);
  });
});

describe("kandidatene", () => {
  /** Timene på `dato` som gir funnet når bare den timen er god, med Søket på dagen etter «nå». */
  function kandidattimer(dato: string, sol?: Soltider): number[] {
    const na = osloTilUtc(leggTilDager(dato, -1), "12:00");
    const treff: number[] = [];
    for (let time = 0; time < 24; time++) {
      const m = melding(dato, (d, h) => (d === dato && h === time ? "god" : "darlig"));
      const svar = finn({ sok: sok({ dato, tilgjengeligMin: 15 }), na, melding: m, ...(sol && { soltider: sol }) });
      if (svar?.type === "funnet") {
        expect(svar.nyttSok.start).toBe(klokkeTekst(time * 60));
        treff.push(time);
      }
    }
    return treff;
  }

  const fra = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

  it("9. november: 09:00–15:00", () => {
    expect(kandidattimer("2026-11-09")).toEqual(fra(9, 15));
  });

  it("21. juni: 06:00–22:00", () => {
    expect(kandidattimer("2026-06-21")).toEqual(fra(6, 22));
  });

  it("grensene: soloppgang 09:00 er med, og siste time er solnedgang − 30 min eller tidligere", () => {
    const dato = "2026-11-09";
    const sol = (ned: string): Soltider => ({
      [dato]: { oppUtc: osloTilUtc(dato, "09:00"), nedUtc: osloTilUtc(dato, ned) },
    });
    expect(kandidattimer(dato, sol("16:29"))).toEqual(fra(9, 15));
    expect(kandidattimer(dato, sol("16:30"))).toEqual(fra(9, 16));
  });

  it("soloppgang 09:01 tar bort 09:00", () => {
    expect(kandidattimer("2026-11-09", solDag("2026-11-09", "09:01", "16:29"))).toEqual(fra(10, 15));
  });

  it("tidligst går foran best innen én dag: middels 10:00 før god 12:00", () => {
    const m = melding("2026-11-09", (d, h) => {
      if (d !== "2026-11-09") return "darlig";
      return h === 10 ? "middels" : h === 12 ? "god" : "darlig";
    });
    const na = osloTilUtc("2026-11-09", "06:00");
    const svar = funnet(finn({ sok: sok({ tilgjengeligMin: 15 }), na, melding: m }));
    expect(svar.nyttSok.start).toBe("10:00");
    expect(svar.tekst).toBe("I dag fra kl. 10:00 er Værklassen middels.");
  });

  it("soltidene for i morgen mangler: kaster når i morgen prøves, men leses ikke ved treff i dag", () => {
    const na = osloTilUtc("2026-11-09", "06:00");
    const bareIDag = solDag("2026-11-09", "08:30", "15:59");
    expect(() => finn({ sok: sok({}), na, melding: alle("darlig"), soltider: bareIDag })).toThrow(/2026-11-10/);
    expect(funnet(finn({ sok: sok({}), na, melding: godFra15(), soltider: bareIDag })).nyttSok.start).toBe("15:00");
  });

  it("alle timer på Turdagen prøves, også de før Søkets Starttidspunkt", () => {
    const m = melding("2026-11-09", (d, h) => (d === "2026-11-09" && h === 10 ? "god" : "darlig"));
    const s = sok({ start: "13:00", tilgjengeligMin: 15 });
    const svar = funnet(finn({ sok: s, na: osloTilUtc("2026-11-09", "06:00"), melding: m }));
    expect(svar.nyttSok.start).toBe("10:00");
  });

  it("passert: ved 12:10 prøves ikke 12:00, men 13:00", () => {
    const m = melding("2026-11-09", (d, h) => (d === "2026-11-09" && (h === 12 || h === 13) ? "god" : "darlig"));
    const s = sok({ start: "12:15", tilgjengeligMin: 15 });
    expect(funnet(finn({ sok: s, na: osloTilUtc("2026-11-09", "12:10"), melding: m })).nyttSok.start).toBe("13:00");
  });

  it("lik «nå» er ikke passert: ved 12:00 prøves 12:00", () => {
    const m = melding("2026-11-09", (d, h) => (d === "2026-11-09" && (h === 12 || h === 13) ? "god" : "darlig"));
    const s = sok({ start: "12:00", tilgjengeligMin: 15 });
    expect(funnet(finn({ sok: s, na: osloTilUtc("2026-11-09", "12:00"), melding: m })).nyttSok.start).toBe("12:00");
  });

  it("et vindu som overlapper en manglende time, hoppes over, og neste time prøves", () => {
    // 09 dårlig, 10 god, 11 mangler, 12 og 13 god: 10:00 og 11:00 overlapper 11 og gir `mangler`.
    const m = melding("2026-11-09", (d, h) => {
      if (d !== "2026-11-09") return "god";
      if (h === 11) return "mangler";
      return h >= 10 ? "god" : "darlig";
    });
    const s = sok({ tilgjengeligMin: 120 });
    expect(funnet(finn({ sok: s, na: osloTilUtc("2026-11-09", "06:00"), melding: m })).nyttSok.start).toBe("12:00");
  });

  it("første treff vinner: i dag går foran i morgen", () => {
    const m = melding("2026-11-09", (d, h) => (d === "2026-11-09" ? (h === 15 ? "middels" : "darlig") : "god"));
    const s = sok({ tilgjengeligMin: 15 });
    const svar = funnet(finn({ sok: s, na: osloTilUtc("2026-11-09", "08:00"), melding: m }));
    expect(svar.nyttSok).toEqual({ ...s, start: "15:00" });
    expect(svar.tekst).toBe("I dag fra kl. 15:00 er Værklassen middels.");
  });
});

describe("hva som er bedre", () => {
  const na = osloTilUtc("2026-11-09", "06:00");

  it("frarådet → dårlig er bedre", () => {
    const svar = funnet(finn({ sok: sok({}), klasse: "fraradet", na, melding: alle("darlig") }));
    expect(svar.nyttSok.start).toBe("09:00");
    expect(svar.tekst).toBe("I dag fra kl. 09:00 er Værklassen dårlig.");
  });

  it("dårlig → dårlig er ikke bedre", () => {
    expect(finn({ sok: sok({}), klasse: "darlig", na, melding: alle("darlig") })?.type).toBe("ingen");
  });

  it("dårlig → frarådet er verre, ikke bedre", () => {
    expect(finn({ sok: sok({}), klasse: "darlig", na, melding: alle("fraradet") })?.type).toBe("ingen");
  });

  it("dårlig: frarådet før 12:00 og god etter gir 12:00", () => {
    const m = melding("2026-11-09", (d, h) => (d === "2026-11-09" && h < 12 ? "fraradet" : "god"));
    expect(funnet(finn({ sok: sok({ tilgjengeligMin: 15 }), na, melding: m })).nyttSok.start).toBe("12:00");
  });

  it("egne terskler endrer svaret: 3 mm/t er middels når dårlig først gjelder fra 5 mm/t", () => {
    const terskler: Vaerterskler = {
      ...VAERTERSKLER,
      klasser: VAERTERSKLER.klasser.map((k) => (k.klasse === "darlig" ? { ...k, nedbor_mm_t_minst: 5 } : k)),
    };
    expect(finn({ sok: sok({}), na, melding: alle("darlig") })?.type).toBe("ingen");
    const svar = funnet(finn({ sok: sok({}), na, melding: alle("darlig"), terskler }));
    expect(svar.tekst).toBe("I dag fra kl. 09:00 er Værklassen middels.");
  });

  it("frarådet → frarådet er ikke bedre", () => {
    expect(finn({ sok: sok({}), klasse: "fraradet", na, melding: alle("fraradet") })?.type).toBe("ingen");
  });

  it.each(["god", "middels", "mangler"] as const)("%s gir null", (klasse) => {
    expect(finn({ sok: sok({}), klasse, na, melding: alle("god") })).toBeNull();
  });
});

describe("forutsetningen", () => {
  it.each(["2026-11-08", "2026-11-11"])("kaster når Turdag %s verken er i dag eller i morgen", (dato) => {
    const na = osloTilUtc("2026-11-09", "06:00");
    expect(() => finn({ sok: sok({ dato }), na, melding: alle("god") })).toThrow(/ikke normalisert/);
  });
});

describe("skjemaet", () => {
  it("funnet og ingen, i dag og i morgen, består BedreTidsvinduSkjema", () => {
    const iDag = osloTilUtc("2026-11-09", "08:00");
    const kveldenFor = osloTilUtc("2026-11-08", "20:00");
    const svar: (BedreTidsvindu | null)[] = [
      finn({ sok: sok({}), na: iDag, melding: godFra15() }),
      finn({ sok: sok({}), klasse: "fraradet", na: iDag, melding: alle("darlig") }),
      finn({ sok: sok({ utsikt: true }), na: uj2.na, melding: uj2.vaermelding }),
      finn({ sok: sok({ dato: "2026-11-14" }), klasse: "fraradet", na: uj3.na, melding: uj3.vaermelding }),
      finn({ sok: sok({}), na: iDag, melding: alle("darlig") }),
      finn({ sok: sok({}), na: kveldenFor, melding: alle("darlig") }),
      finn({ sok: sok({}), na: ingenBedre.na, melding: ingenBedre.vaermelding }),
    ];
    expect(svar.map((r) => r?.type)).toEqual(["funnet", "funnet", "funnet", "funnet", "ingen", "ingen", "ingen"]);
    for (const r of svar) expect(BedreTidsvinduSkjema.parse(r)).toEqual(r);
  });
});
