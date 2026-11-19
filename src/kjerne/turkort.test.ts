import { describe, expect, it } from "vitest";
import rutegeometriJson from "../../data/rutegeometri.geojson";
import turerJson from "../../testdata/turer.json";
import { anbefal, erLavtliggende, kortesteTur, type Alternativ, type RangertTur } from "./anbefaling";
import { vurderMorke, type Soltider } from "./morke";
import { soltider as beregnSoltider } from "./sol";
import type { VaerGrunnlag } from "./regeltekst";
import type { Sok } from "./sok";
import { osloTilUtc } from "./tid";
import { fraTekst, type KortInput, lagTurkort } from "./turkort";
import { RutegeometriSkjema, rutesegmentNokkel } from "./turdata/rutegeometri";
import { TurdatasettSkjema } from "./turdata/skjema";
import { turtidMin } from "./turtid";
import type { Vaerklasse } from "./vaer/typer";
import { VAERPUNKT } from "./vaerpunkt";
import { type Turkort, TurkortSkjema } from "./visning/skjema";

// Innholdet i Turkortet (story 1.9) mot testdata/turer.json og den committede rutegeometrien,
// med faste soltider (NFR-2, AD-16). Tekstene er fra EXPERIENCE.md.

const { turer } = TurdatasettSkjema.parse(turerJson);
const geometri = RutegeometriSkjema.parse(rutegeometriJson);

const DATO = "2026-11-09";
const SOLTIDER: Soltider = { [DATO]: { oppUtc: osloTilUtc(DATO, "08:30"), nedUtc: osloTilUtc(DATO, "15:59") } };
const MANGLER = { type: "mangler" } as const;

const GODE_ORD = "oppholdsvær og lite vind";
const DARLIGE_ORD = "nedbør opptil 3,5 mm/t og frisk vind";
const vurdert = (klasse: Vaerklasse, vaerord = klasse === "darlig" ? DARLIGE_ORD : GODE_ORD): VaerGrunnlag => ({
  type: "vurdert",
  klasse,
  vaerord,
  temperatur: "3–5 °C",
});

const tur = (id: string) => {
  const funnet = turer.find((t) => t.id === id);
  if (!funnet) throw new Error(`Ingen Tur med id ${id} i testdata/turer.json.`);
  return funnet;
};

const sok = (overstyr: Partial<Sok> = {}): Sok => ({
  dato: DATO,
  start: "13:30",
  tilgjengeligMin: 120,
  vanskelighetsgrad: "B",
  utsikt: false,
  vann: false,
  ...overstyr,
});

/** En RangertTur for Turen `id` med Mørkevarsel og treff regnet som i rangeringen. */
function rangert(id: string, s: Sok, soltider: Soltider = SOLTIDER): RangertTur {
  const t = tur(id);
  const tid = turtidMin(t);
  return {
    tur: t,
    turtidMin: tid,
    morkevarsel: vurderMorke(s, tid, soltider),
    treff: (s.utsikt && t.utsikt ? 1 : 0) + (s.vann && t.vann ? 1 : 0),
    lavtliggende: erLavtliggende(t),
    egnetDarligVaer: t.egnet_darlig_vaer,
  };
}

const input = (s: Sok, overstyr: Partial<KortInput> = {}): KortInput => ({
  sok: s,
  soltider: SOLTIDER,
  geometri,
  nummer: 1,
  antall: 3,
  vaer: MANGLER,
  ...overstyr,
});

const rad = (kort: Turkort, navn: Turkort["kriterier"][number]["rad"]) => {
  const funnet = kort.kriterier.find((k) => k.rad === navn);
  if (!funnet) throw new Error(`Ingen rad ${navn}.`);
  return { merke: funnet.merke, tekst: funnet.tekst, detalj: funnet.detalj };
};

/** Alle strenger i kortet, unntatt kilde-URL-en. */
function tekster(v: unknown, sti = ""): string[] {
  if (typeof v === "string") return sti === ".kilde.url" ? [] : [v];
  if (Array.isArray(v)) return v.flatMap((x, i) => tekster(x, `${sti}[${i}]`));
  if (v === null || typeof v !== "object") return [];
  return Object.entries(v).flatMap(([k, x]) => tekster(x, `${sti}.${k}`));
}

describe("I/O-matrisen (story 1.9)", () => {
  it("UJ-1 uten vær: Tusenårsvarden fra Damefallet, 13:30, 2 t, utsikt", () => {
    const s = sok({ utsikt: true });
    const kort = lagTurkort(rangert("tusenarsvarden-fra-damefallet", s), input(s));
    expect(kort.regeltekst).toBe("passer tiden din (1 t 32 min av 2 t), værdata mangler, utsikt");
    expect(rad(kort, "tid")).toEqual({ merke: "ok", tekst: "1 t 32 min av 2 t", detalj: ["gangtid, uten pauser"] });
    expect(rad(kort, "vaer")).toEqual({ merke: "ingen", tekst: "ikke vurdert", detalj: ["Værmeldingen fra MET mangler"] });
    expect(rad(kort, "onsker")).toMatchObject({ merke: "ok", tekst: "utsikt ✓" });
    expect(rad(kort, "morke")).toEqual({ merke: "ok", tekst: "tilbake 15:02", detalj: ["sola går ned 15:59"] });
    expect(kort.stokkoversiktRad).toBe("1 t 32 min uten pauser · tilbake 15:02");
    expect(kort.kriterier.map((k) => k.rad)).toEqual(["tid", "vaer", "onsker", "morke"]);
  });

  it("UJ-1: resten av kortet", () => {
    const s = sok({ utsikt: true });
    const kort = lagTurkort(rangert("tusenarsvarden-fra-damefallet", s), input(s));
    expect(kort).toMatchObject({
      turId: "tusenarsvarden-fra-damefallet",
      mal: "Tusenårsvarden",
      fra: "fra Damefallet",
      faktalinje: "5,0 km · 318 høydemeter · høyeste punkt 527 moh · Middels",
      startpunktTekst: "Startpunkt: Parkering ved Damefallet, Vardeveien",
      kartinfoboks: {
        navn: "Tusenårsvarden fra Damefallet",
        tekst: "5,0 km · Middels · Startpunkt: Parkering ved Damefallet, Vardeveien",
      },
      kilde: { navn: "morotur.no", url: "https://morotur.no/en/tur/tusenaarsvarden-fra-damefallet" },
      tidsstolpe: { fyll: 92 / 120, overGrense: 0 },
    });
    // Stolpen går fra 13:30 til solnedgang 15:59 (149 min).
    expect(kort.dagslysstolpe).toEqual({
      startTekst: "13:30",
      slutt: { andel: 92 / 149, tekst: "tilbake 15:02" },
      skumring: 119 / 149,
      solNed: { andel: 1, tekst: "sol ned 15:59" },
      solOpp: null,
    });
    expect(kort.kart.nummer).toBe(1);
    expect(kort.kart.startpunkt).toEqual({ lat: tur("tusenarsvarden-fra-damefallet").startpunkt.lat, lon: tur("tusenarsvarden-fra-damefallet").startpunkt.lon });
    expect(kort.kart).not.toHaveProperty("malpunkt");
    expect(kort.kart.rute.geometry.coordinates.length).toBeGreaterThan(0);
  });

  it("to preferanser: Tusenårsvarden fra Grua, 10:00, 2 t 30 min, utsikt og vann", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 150, utsikt: true, vann: true });
    const kort = lagTurkort(rangert("tusenarsvarden-fra-grua", s), input(s));
    expect(kort.regeltekst).toBe("passer tiden din (2 t 16 min av 2 t 30 min), værdata mangler, utsikt og vann");
    expect(rad(kort, "onsker")).toMatchObject({ merke: "ok", tekst: "utsikt ✓ · vann ✓" });
    expect(kort.fra).toBe("fra Grua");
  });

  it("én av to treffer: utsikt og vann valgt, Turen har bare utsikt", () => {
    const s = sok({ utsikt: true, vann: true });
    const kort = lagTurkort(rangert("skihytta-fra-damefallet", s), input(s));
    expect(rad(kort, "onsker")).toEqual({ merke: "ok", tekst: "utsikt ✓ · vann –", detalj: [] });
    expect(kort.regeltekst).toBe("passer tiden din (54 min av 2 t), værdata mangler, utsikt");
  });

  it("ingen treff: vann valgt, Turen har bare utsikt", () => {
    const s = sok({ vann: true });
    const kort = lagTurkort(rangert("skihytta-fra-damefallet", s), input(s));
    expect(rad(kort, "onsker")).toEqual({ merke: "ingen", tekst: "ikke vann –", detalj: ["har utsikt (ikke valgt)"] });
    expect(kort.regeltekst).toBe("passer tiden din (54 min av 2 t), værdata mangler");
  });

  it("ingen valgt: detaljen nevner det Turen har", () => {
    const s = sok();
    const kort = lagTurkort(rangert("tusenarsvarden-fra-damefallet", s), input(s));
    expect(rad(kort, "onsker")).toEqual({ merke: "ingen", tekst: "ingen valgt", detalj: ["har utsikt og vann (ikke valgt)"] });
    expect(kort.regeltekst).toBe("passer tiden din (1 t 32 min av 2 t), værdata mangler");
  });

  it("Mørkevarsel ved solnedgang: Tusenårsvarden fra Damefallet, 14:00", () => {
    const s = sok({ start: "14:00" });
    const kort = lagTurkort(rangert("tusenarsvarden-fra-damefallet", s), input(s));
    expect(rad(kort, "morke")).toEqual({
      merke: "se-opp",
      tekst: "Mørkevarsel: tilbake ca. 15:32",
      detalj: [
        "Sola går ned 15:59. Turen ender ca. 15:32 uten pauser, etter grensen 30 min før solnedgang.",
        "Lurt å ta med hodelykt.",
      ],
    });
    expect(kort.stokkoversiktRad).toBe("1 t 32 min uten pauser · tilbake 15:32");
  });

  it("Mørkevarsel ved soloppgang: start 07:00, sol opp 08:30", () => {
    const s = sok({ start: "07:00" });
    const kort = lagTurkort(rangert("tusenarsvarden-fra-damefallet", s), input(s));
    const morke = rad(kort, "morke");
    expect(morke).toEqual({
      merke: "se-opp",
      tekst: "Mørkevarsel: starter før soloppgang 08:30",
      detalj: ["Lurt å ta med hodelykt."],
    });
    expect(kort.lesetekst).toBe(
      "Turforslag 1 av 3: Tusenårsvarden fra Damefallet. Turtid: 1 t 32 min av 2 t, gangtid uten pauser. " +
        "Værklasse: ikke vurdert. Værmeldingen fra MET mangler. " +
        "Opplevelsespreferanser: ingen valgt. Har utsikt og vann (ikke valgt). " +
        "Mørkevarsel: starter før soloppgang 08:30. Lurt å ta med hodelykt.",
    );
    // Stolpen går fra 07:00 til solnedgang 15:59 (539 min), med soloppgang etter 90 min.
    expect(kort.dagslysstolpe.solOpp).toEqual({ andel: 90 / 539, tekst: "sol opp 08:30" });
    expect(kort.dagslysstolpe.solNed).toEqual({ andel: 1, tekst: "sol ned 15:59" });
  });

  it("Dagslysstolpe for en Tur som ender etter solnedgang: 15:00, ender 16:32", () => {
    const s = sok({ start: "15:00" });
    const kort = lagTurkort(rangert("tusenarsvarden-fra-damefallet", s), input(s));
    // Stolpen går fra 15:00 til slutt 16:32 (92 min). Skumring 15:29, sol ned 15:59.
    expect(kort.dagslysstolpe).toEqual({
      startTekst: "15:00",
      slutt: { andel: 1, tekst: "tilbake 16:32" },
      skumring: 29 / 92,
      solNed: { andel: 59 / 92, tekst: "sol ned 15:59" },
      solOpp: null,
    });
  });

  it("Alternativ (UJ-3): 15 min, Storlihytta fra Vardeveien", () => {
    const s = sok({ tilgjengeligMin: 15 });
    const anbefaling = anbefal(turer, s, SOLTIDER, "mangler");
    if (anbefaling.type !== "kortesteTur") throw new Error("Ventet den korteste Turen.");
    const kort = lagTurkort(anbefaling.alternativ, input(s));
    expect(kort.turId).toBe("storlihytta-fra-vardeveien");
    expect(kort.regeltekst).toBe("passer ikke tiden din: trenger 1 min mer (16 min av 15 min), værdata mangler");
    expect(rad(kort, "tid")).toEqual({ merke: "se-opp", tekst: "16 min av 15 min", detalj: ["trenger 1 min mer, uten pauser"] });
    expect(kort.tidsstolpe.fyll).toBeCloseTo(15 / 16, 12);
    expect(kort.tidsstolpe.overGrense).toBeCloseTo(1 / 16, 12);
    expect(kort.lesetekst).toBe(
      "Alternativ: Storlihytta fra Vardeveien. Turtid: 16 min av 15 min, trenger 1 min mer, uten pauser. " +
        "Værklasse: ikke vurdert. Værmeldingen fra MET mangler. " +
        "Opplevelsespreferanser: ingen valgt. Har utsikt (ikke valgt). " +
        "Mørkevarsel: ingen. Tilbake 13:46. Sola går ned 15:59.",
    );
  });
});

describe("Vær-raden og Regelteksten med vær (story 2.7)", () => {
  it("god, UJ-1: ok, «Værklasse god» og værordene med temperatur", () => {
    const s = sok({ utsikt: true });
    const kort = lagTurkort(rangert("tusenarsvarden-fra-damefallet", s), input(s, { vaer: vurdert("god") }));
    expect(rad(kort, "vaer")).toEqual({ merke: "ok", tekst: "Værklasse god", detalj: [`${GODE_ORD} · 3–5 °C`] });
    expect(kort.regeltekst).toBe("passer tiden din (1 t 32 min av 2 t), oppholdsvær og lite vind, utsikt");
    expect(kort.lesetekst).toContain("Værklasse: god. Oppholdsvær og lite vind, 3–5 °C. Opplevelsespreferanser");
  });

  it("middels: ok og «Værklasse middels»", () => {
    const s = sok();
    const ord = "noe nedbør og lite vind";
    const kort = lagTurkort(rangert("bergsvatnet", s), input(s, { vaer: vurdert("middels", ord) }));
    expect(rad(kort, "vaer")).toEqual({ merke: "ok", tekst: "Værklasse middels", detalj: [`${ord} · 3–5 °C`] });
  });

  it("god, lav og egnet Tur: ingen del 3 eller 4", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 180 });
    const kort = lagTurkort(rangert("moldevatnet-fra-jensgurilia", s), input(s, { vaer: vurdert("god") }));
    expect(kort.regeltekst).toBe("passer tiden din (1 t 33 min av 3 t), oppholdsvær og lite vind");
    expect(rad(kort, "vaer").detalj).toEqual(["oppholdsvær og lite vind · 3–5 °C"]);
  });

  it("dårlig, UJ-2: Moldevatnet fra Jensgurilia, 340 moh og egnet", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 180, vanskelighetsgrad: "R" });
    const kort = lagTurkort(rangert("moldevatnet-fra-jensgurilia", s), input(s, { vaer: vurdert("darlig") }));
    expect(kort.regeltekst).toBe(
      "passer tiden din (1 t 33 min av 3 t), nedbør opptil 3,5 mm/t og frisk vind, lavtliggende tur (340 moh), " +
        "egnet i dårlig vær",
    );
    expect(rad(kort, "vaer")).toEqual({
      merke: "se-opp",
      tekst: "Værklasse dårlig",
      detalj: [
        "nedbør opptil 3,5 mm/t og frisk vind · 3–5 °C",
        "Øverst fordi: lavtliggende tur (340 moh), egnet i dårlig vær",
      ],
    });
    expect(kort.lesetekst).toContain(
      "Værklasse: dårlig. Nedbør opptil 3,5 mm/t og frisk vind, 3–5 °C. " +
        "Øverst fordi: lavtliggende tur (340 moh), egnet i dårlig vær. Opplevelsespreferanser",
    );
  });

  it("dårlig, høy Tur og egnet ukjent: verken del 3 eller 4, og ingen «Øverst fordi»", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 180, utsikt: true });
    const kort = lagTurkort(rangert("tusenarsvarden-fra-grua", s), input(s, { vaer: vurdert("darlig") }));
    expect(kort.regeltekst).toBe(`passer tiden din (2 t 16 min av 3 t), ${DARLIGE_ORD}, utsikt`);
    expect(rad(kort, "vaer")).toEqual({
      merke: "se-opp",
      tekst: "Værklasse dårlig",
      detalj: [`${DARLIGE_ORD} · 3–5 °C`],
    });
  });

  it("dårlig, lav Tur med egnet ukjent: bare lavtliggende tur", () => {
    const s = sok();
    const kort = lagTurkort(rangert("storlihytta-fra-museet", s), input(s, { vaer: vurdert("darlig") }));
    expect(kort.regeltekst.endsWith(`${DARLIGE_ORD}, lavtliggende tur (270 moh)`)).toBe(true);
    expect(rad(kort, "vaer").detalj).toEqual([`${DARLIGE_ORD} · 3–5 °C`, "Øverst fordi: lavtliggende tur (270 moh)"]);
  });

  it("frarådet: se-opp, «Værklasse frarådet» og uten «Øverst fordi»", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 180 });
    const ord = "lite nedbør og sterk kuling, vind opp mot 19 m/s";
    const kort = lagTurkort(rangert("moldevatnet-fra-jensgurilia", s), input(s, { vaer: vurdert("fraradet", ord) }));
    expect(rad(kort, "vaer")).toEqual({ merke: "se-opp", tekst: "Værklasse frarådet", detalj: [`${ord} · 3–5 °C`] });
    expect(kort.regeltekst).toBe(`passer tiden din (1 t 33 min av 3 t), ${ord}`);
  });

  it("Alternativkortet i dårlig vær har del 3 i Regelteksten, men ikke «Øverst fordi»", () => {
    const s = sok({ tilgjengeligMin: 15 });
    const anbefaling = anbefal(turer, s, SOLTIDER, "darlig");
    if (anbefaling.type !== "kortesteTur") throw new Error("Ventet den korteste Turen.");
    const kort = lagTurkort(anbefaling.alternativ, input(s, { vaer: vurdert("darlig") }));
    expect(kort.turId).toBe("storlihytta-fra-vardeveien");
    expect(kort.regeltekst).toBe(
      `passer ikke tiden din: trenger 1 min mer (16 min av 15 min), ${DARLIGE_ORD}, lavtliggende tur (301 moh)`,
    );
    expect(rad(kort, "vaer")).toEqual({
      merke: "se-opp",
      tekst: "Værklasse dårlig",
      detalj: [`${DARLIGE_ORD} · 3–5 °C`],
    });
  });

  it("Alternativkortet i dårlig vær med en lav og egnet Tur: del 3 og 4 fra Turdatasettet", () => {
    const s = sok({ tilgjengeligMin: 15 });
    const alternativ = kortesteTur([tur("moldevatnet-fra-jensgurilia")], s, SOLTIDER);
    const kort = lagTurkort(alternativ, input(s, { vaer: vurdert("darlig") }));
    expect(kort.regeltekst).toBe(
      `passer ikke tiden din: trenger 1 t 18 min mer (1 t 33 min av 15 min), ${DARLIGE_ORD}, ` +
        "lavtliggende tur (340 moh), egnet i dårlig vær",
    );
    expect(rad(kort, "vaer").detalj).toEqual([`${DARLIGE_ORD} · 3–5 °C`]);
  });

  it("lesteksten bruker «, » i stedet for «·», også i dårlig vær", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 180 });
    const kort = lagTurkort(rangert("moldevatnet-fra-jensgurilia", s), input(s, { vaer: vurdert("darlig") }));
    expect(kort.lesetekst).not.toContain("·");
    expect(kort.lesetekst).toContain("Værklasse: dårlig. Nedbør opptil 3,5 mm/t og frisk vind, 3–5 °C.");
  });

  it("mangler gir samme Regeltekst og Vær-rad som før, også for en lav og egnet Tur", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 180 });
    const kort = lagTurkort(rangert("moldevatnet-fra-jensgurilia", s), input(s));
    expect(kort.regeltekst).toBe("passer tiden din (1 t 33 min av 3 t), værdata mangler");
    expect(rad(kort, "vaer")).toEqual({
      merke: "ingen",
      tekst: "ikke vurdert",
      detalj: ["Værmeldingen fra MET mangler"],
    });
  });

  describe("alle Værklasser over et lite rutenett av Søk", () => {
    const KLASSER: Vaerklasse[] = ["god", "middels", "darlig", "fraradet"];
    const alle: { kort: Turkort; kandidat: RangertTur | Alternativ; input: KortInput }[] = [];
    for (const klasse of KLASSER) {
      for (const start of ["08:15", "13:30", "15:00"]) {
        for (const tilgjengeligMin of [15, 60, 180, 300]) {
          for (const utsikt of [false, true]) {
            const s = sok({ start, tilgjengeligMin, vanskelighetsgrad: "R", utsikt });
            const anbefaling = anbefal(turer, s, SOLTIDER, klasse);
            const kandidater = anbefaling.type === "turforslag" ? anbefaling.forslag : [anbefaling.alternativ];
            kandidater.forEach((kandidat, i) => {
              const inn = input(s, { nummer: i + 1, antall: kandidater.length, vaer: vurdert(klasse) });
              alle.push({ kort: lagTurkort(kandidat, inn), kandidat, input: inn });
            });
          }
        }
      }
    }

    it("validerer mot TurkortSkjema", () => {
      expect(alle.length).toBeGreaterThan(40);
      expect(alle.filter(({ kort }) => !TurkortSkjema.safeParse(kort).success)).toEqual([]);
    });

    it("ingen tekst inneholder «trygg» eller «trygt», og Regelteksten har ikke temperatur", () => {
      const strenger = new Set(alle.flatMap(({ kort }) => tekster(kort)));
      expect([...strenger].filter((t) => /trygg|trygt/i.test(t))).toEqual([]);
      expect(alle.filter(({ kort }) => kort.regeltekst.includes("°C"))).toEqual([]);
    });

    it("Vær-raden er ok ved god og middels og se-opp ved dårlig og frarådet", () => {
      for (const { kort, input: inn } of alle) {
        const klasse = inn.vaer.type === "vurdert" ? inn.vaer.klasse : null;
        expect(kort.kriterier[1].merke).toBe(klasse === "god" || klasse === "middels" ? "ok" : "se-opp");
      }
    });

    it("«Øverst fordi» følger Turdatasettet, bare for Turforslag i dårlig vær", () => {
      expect(alle.some(({ kort }) => kort.kriterier[1].detalj.some((d) => d.startsWith("Øverst fordi: ")))).toBe(true);
      for (const { kort, kandidat, input: inn } of alle) {
        const { hoyeste_punkt_moh: hoyde, egnet_darlig_vaer: egnet } = kandidat.tur;
        const deler = [
          ...(hoyde < VAERPUNKT.hoydeMoh ? [`lavtliggende tur (${hoyde} moh)`] : []),
          ...(egnet === true ? ["egnet i dårlig vær"] : []),
        ];
        const darlig = inn.vaer.type === "vurdert" && inn.vaer.klasse === "darlig";
        const forventet = darlig && !("trengerMerMin" in kandidat) && deler.length > 0;
        expect(kort.kriterier[1].detalj.slice(1)).toEqual(forventet ? [`Øverst fordi: ${deler.join(", ")}`] : []);
      }
    });

    it("lesteksten har ikke «·»", () => {
      expect(alle.filter(({ kort }) => kort.lesetekst.includes("·"))).toEqual([]);
    });

    it("samme input gir samme kort", () => {
      for (const { kort, kandidat, input: inn } of alle) expect(lagTurkort(kandidat, inn)).toEqual(kort);
    });
  });
});

describe("Mål og «fra …»", () => {
  it.each([
    ["tusenarsvarden-fra-damefallet", "fra Damefallet"],
    ["varden-fra-sentrum", "via Den grønne korridor"],
    ["tusenarsvarden-om-moldedalen", "rundtur om Moldedalen"],
    ["midtveishuken", "rundt Øverlandsvatnet"],
    ["bergsvatnet", "fra Turparkering i Jensgurilia, Nordbyen"],
  ])("%s: «%s»", (id, fra) => {
    expect(fraTekst(tur(id))).toBe(fra);
  });

  it("tar bare bort Målet når navnet fortsetter med mellomrom", () => {
    const startpunkt = { navn: "Kaia i Molde sentrum", lat: 62.74, lon: 7.16, koordinatkilde: "test" };
    expect(fraTekst({ navn: "Vardenes rundtur", mal: "Varden", startpunkt })).toBe("fra Kaia i Molde sentrum");
    expect(fraTekst({ navn: "Varden rundt", mal: "Varden", startpunkt })).toBe("rundt");
  });
});

describe("kartet", () => {
  it("ruten er Turens Rutesegmenter i rekkefølge, i [lon, lat]", () => {
    const s = sok({ vanskelighetsgrad: "R", tilgjengeligMin: 300 });
    const t = tur("tusenarsvarden-om-moldedalen");
    const forventet = t.rutesegmenter.flatMap((segment) => {
      const feature = geometri.features.find(
        (f) => rutesegmentNokkel(f.properties) === rutesegmentNokkel(segment),
      );
      if (!feature) throw new Error(`Mangler ${segment.rutenummer}.`);
      return feature.geometry.coordinates;
    });
    const kort = lagTurkort(rangert(t.id, s), input(s));
    expect(kort.kart.rute.geometry.coordinates).toEqual(forventet);
  });
});

describe("Startpunkt, Adkomst og kilde", () => {
  it("Startpunkt med Adkomst og Fjord Norway som kilde", () => {
    const s = sok({ tilgjengeligMin: 300 });
    const kort = lagTurkort(rangert("varden-fra-sentrum", s), input(s));
    expect(kort.startpunktTekst).toBe("Startpunkt: Kaia i Molde sentrum (Adkomst ca. 1900 m)");
    expect(kort.faktalinje).toBe("8,8 km · 407 høydemeter · høyeste punkt 407 moh · Middels");
    expect(kort.kilde.navn).toBe("Fjord Norway");
  });

  it("Storlihytta fra Romsdalsmuseet: «3,46 km» og Adkomst ca. 500 m", () => {
    const s = sok();
    const kort = lagTurkort(rangert("storlihytta-fra-museet", s), input(s));
    expect(kort.startpunktTekst).toBe("Startpunkt: Parkering ved Romsdalsmuseet (Adkomst ca. 500 m)");
    expect(kort.faktalinje.startsWith("3,46 km · ")).toBe(true);
  });

  it("malpunkt er med når mal_punkt finnes", () => {
    const s = sok();
    const k = rangert("bergsvatnet", s);
    const medMal = { ...k, tur: { ...k.tur, mal_punkt: { lat: 62.78, lon: 7.18, koordinatkilde: "test" } } };
    expect(lagTurkort(medMal, input(s)).kart.malpunkt).toEqual({ lat: 62.78, lon: 7.18 });
  });
});

describe("lesetekst (UX-DR43)", () => {
  it("Turforslag: nummer, navn, Turtid og radene med PRD-begrepene", () => {
    const s = sok({ utsikt: true });
    const kort = lagTurkort(rangert("tusenarsvarden-fra-damefallet", s), input(s, { nummer: 1, antall: 3 }));
    expect(kort.lesetekst).toBe(
      "Turforslag 1 av 3: Tusenårsvarden fra Damefallet. Turtid: 1 t 32 min av 2 t, gangtid uten pauser. " +
        "Værklasse: ikke vurdert. Værmeldingen fra MET mangler. " +
        "Opplevelsespreferanser: utsikt: ja. Har vann (ikke valgt). " +
        "Mørkevarsel: ingen. Tilbake 15:02. Sola går ned 15:59.",
    );
  });

  it("Mørkevarsel leses med klokkeslett og tipset", () => {
    const s = sok({ start: "15:00", tilgjengeligMin: 60, utsikt: true, vann: true });
    const kort = lagTurkort(rangert("skihytta-fra-damefallet", s), input(s, { nummer: 2, antall: 3 }));
    expect(kort.lesetekst).toBe(
      "Turforslag 2 av 3: Skihytta fra Damefallet. Turtid: 54 min av 1 t, gangtid uten pauser. " +
        "Værklasse: ikke vurdert. Værmeldingen fra MET mangler. " +
        "Opplevelsespreferanser: utsikt: ja, vann: nei. " +
        "Mørkevarsel: tilbake ca. 15:54. " +
        "Sola går ned 15:59. Turen ender ca. 15:54 uten pauser, etter grensen 30 min før solnedgang. " +
        "Lurt å ta med hodelykt.",
    );
  });
});

// Over 1000 kort med hele ruten: valideringen tar flere sekunder når hele suiten kjører parallelt.
describe("hele testdatasettet over et rutenett av Søk", { timeout: 30_000 }, () => {
  const STARTER = ["06:00", "07:00", "08:15", "10:00", "12:00", "13:30", "14:00", "15:00", "15:45", "17:00", "20:00", "22:00"];
  const TILGJENGELIG = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300];
  const GRADER: Sok["vanskelighetsgrad"][] = ["G", "B", "R"];
  const PREFERANSER = [
    { utsikt: false, vann: false },
    { utsikt: true, vann: false },
    { utsikt: false, vann: true },
    { utsikt: true, vann: true },
  ];
  const SOMMER = "2026-06-21";
  const DATOER: [string, Soltider][] = [
    [DATO, SOLTIDER],
    [SOMMER, { [SOMMER]: beregnSoltider(SOMMER) }],
  ];

  const alle: { navn: string; kort: Turkort; kandidat: RangertTur | Alternativ; input: KortInput }[] = [];
  for (const [dato, soltider] of DATOER) {
    for (const start of STARTER) {
      for (const tilgjengeligMin of TILGJENGELIG) {
        for (const vanskelighetsgrad of GRADER) {
          for (const pref of PREFERANSER) {
            const s = sok({ dato, start, tilgjengeligMin, vanskelighetsgrad, ...pref });
            const anbefaling = anbefal(turer, s, soltider, "mangler");
            const kandidater = anbefaling.type === "turforslag" ? anbefaling.forslag : [anbefaling.alternativ];
            kandidater.forEach((kandidat, i) => {
              const inn = input(s, { soltider, nummer: i + 1, antall: kandidater.length });
              alle.push({ navn: `${JSON.stringify(s)} #${i + 1}`, kort: lagTurkort(kandidat, inn), kandidat, input: inn });
            });
          }
        }
      }
    }
  }

  it("lager mange kort, både Turforslag og Alternativ, med og uten Mørkevarsel", () => {
    expect(alle.length).toBeGreaterThan(1000);
    expect(alle.some((a) => "trengerMerMin" in a.kandidat)).toBe(true);
    expect(alle.some((a) => a.kandidat.morkevarsel?.arsak === "solnedgang")).toBe(true);
    expect(alle.some((a) => a.kandidat.morkevarsel?.arsak === "soloppgang")).toBe(true);
    expect(alle.some((a) => a.kandidat.morkevarsel === null)).toBe(true);
  });

  it("alle kort validerer mot TurkortSkjema", () => {
    const feil = alle.flatMap(({ navn, kort }) => {
      const svar = TurkortSkjema.safeParse(kort);
      return svar.success ? [] : [`${navn}: ${JSON.stringify(svar.error.issues)}`];
    });
    expect(feil).toEqual([]);
  });

  it("ingen tekst inneholder «trygg» eller «trygt», punktum som desimaltegn eller 12-timersklokke", () => {
    const strenger = new Set(alle.flatMap(({ kort }) => tekster(kort)));
    const feil = [...strenger].filter(
      (t) => /trygg|trygt/i.test(t) || /\d\.\d/.test(t) || /\b(am|pm)\b/i.test(t) || /\b\d:\d\d\b/.test(t),
    );
    expect(feil).toEqual([]);
  });

  it("hver Turtid i kortet er formatert som varighet, aldri bare minutter over 59", () => {
    const strenger = new Set(alle.flatMap(({ kort }) => tekster(kort)));
    expect([...strenger].filter((t) => /\b([6-9]\d|\d{3,}) min\b/.test(t))).toEqual([]);
  });

  it("samme input gir samme kort", () => {
    for (const { kort, kandidat, input: inn } of alle.slice(0, 200)) {
      expect(lagTurkort(kandidat, inn)).toEqual(kort);
    }
  });

  it("Tid-raden er se-opp bare på Alternativkortet, og Mørke-raden er se-opp bare ved Mørkevarsel", () => {
    for (const { kort, kandidat } of alle) {
      expect(kort.kriterier[0].merke).toBe("trengerMerMin" in kandidat ? "se-opp" : "ok");
      expect(kort.kriterier[3].merke).toBe(kandidat.morkevarsel ? "se-opp" : "ok");
      expect(kort.kriterier[1]).toMatchObject({ merke: "ingen", tekst: "ikke vurdert" });
    }
  });
});

describe("kast", () => {
  it("kaster når soltidene for Turdagen mangler", () => {
    const s = sok();
    expect(() => lagTurkort(rangert("bergsvatnet", s), input(s, { soltider: {} }))).toThrow(/Soltidene mangler/);
  });

  it("kaster når et Rutesegment mangler i rutegeometrien", () => {
    const s = sok();
    const tom = { type: "FeatureCollection" as const, features: [geometri.features[0]] };
    const k = rangert("tusten", s);
    expect(() => lagTurkort(k, input(s, { geometri: tom }))).toThrow(/finnes ikke i rutegeometrien/);
  });
});
