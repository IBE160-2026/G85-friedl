import { describe, expect, it } from "vitest";
import turerJson from "../../../testdata/turer.json";
import { erLavtliggende } from "../anbefaling";
import { lagRegeltekst, type Opplevelsespreferanse } from "../regeltekst";
import { osloTilUtc } from "../tid";
import { turtidMin } from "../turtid";
import { type Tur, TurdatasettSkjema } from "../turdata/skjema";
import { lagVaerVurdert } from "../vaer/sammendrag";
import { TESTSCENARIOER } from "../vaer/testscenarioer";
import { lagTurfakta } from "./fakta";
import { formaterteVerdier, kontrollerSprakmodelltekst, type Grunn } from "./kontroll";

// Kontrollen av Språkmodellteksten (story 4.1, FR-22) mot ekte Regeltekster fra `lagRegeltekst`, med
// været fra Værscenarioene UJ-1 og UJ-2 og Turene fra testdata/turer.json.

const { turer } = TurdatasettSkjema.parse(turerJson);

const tur = (id: string) => {
  const funnet = turer.find((t) => t.id === id);
  if (!funnet) throw new Error(`Ingen Tur med id ${id} i testdata/turer.json.`);
  return funnet;
};

/** Regelteksten for `t` med været i scenarioet `id` over hele Tilgjengelig tid fra `start` 9. november. */
function regeltekst(
  id: "uj-1" | "uj-2",
  t: Tur,
  start: string,
  tilgjengeligMin: number,
  treff: Opplevelsespreferanse[],
): string {
  const startUtc = osloTilUtc("2026-11-09", start);
  const vaer = lagVaerVurdert({
    melding: TESTSCENARIOER[id].vaermelding,
    startUtc,
    sluttUtc: startUtc + tilgjengeligMin * 60_000,
  });
  if (!vaer) throw new Error(`Værmeldingen i ${id} mangler timer.`);
  return lagRegeltekst({
    turtidMin: turtidMin(t),
    tilgjengeligMin,
    vaer: vaer.grunnlag,
    hoyestePunktMoh: t.hoyeste_punkt_moh,
    lavtliggende: erLavtliggende(t),
    egnetDarligVaer: t.egnet_darlig_vaer,
    treff,
  });
}

const DAMEFALLET = tur("tusenarsvarden-fra-damefallet");
const MOLDEVATNET = tur("moldevatnet-fra-jensgurilia");

/** UJ-1: Tusenårsvarden fra Damefallet, 13:30, 2 t, utsikt. */
const UJ1 = regeltekst("uj-1", DAMEFALLET, "13:30", 120, ["utsikt"]);
const UJ1_FAKTA = lagTurfakta(DAMEFALLET);
/** UJ-2: Moldevatnet fra Jensgurilia, 10:00, 3 t, i dårlig vær. */
const UJ2 = regeltekst("uj-2", MOLDEVATNET, "10:00", 180, []);
const MOLDEVATNET_FAKTA = lagTurfakta(MOLDEVATNET);

const UJ1_TEKST = "Turen passer tiden din godt: 1 t 32 min av 2 t, med oppholdsvær og lite vind, og fin utsikt.";
const UJ2_TEKST =
  "Turen passer tiden din: 1 t 33 min av 3 t. Det er meldt nedbør opptil 3,4 mm/t og frisk vind, men turen er " +
  "lavtliggende (340 moh) og egnet i dårlig vær.";

const grunner = (tekst: string, regel = UJ1, fakta = UJ1_FAKTA): Grunn[] => {
  const svar = kontrollerSprakmodelltekst(tekst, regel, fakta);
  return svar.godkjent ? [] : svar.grunner;
};

describe("Regeltekstene i testene", () => {
  it("er de ekte tekstene for UJ-1 og UJ-2", () => {
    expect(UJ1).toBe("passer tiden din (1 t 32 min av 2 t), oppholdsvær og lite vind, utsikt");
    expect(UJ2).toBe(
      "passer tiden din (1 t 33 min av 3 t), nedbør opptil 3,4 mm/t og frisk vind, lavtliggende tur (340 moh), " +
        "egnet i dårlig vær",
    );
  });
});

describe("formaterteVerdier", () => {
  it("UJ-1: Turtid og Tilgjengelig tid", () => {
    expect(formaterteVerdier(UJ1)).toEqual(["1 t 32 min", "2 t"]);
  });

  it("UJ-2: varighetene, nedbøren og høyeste punkt", () => {
    expect(formaterteVerdier(UJ2)).toEqual(["1 t 33 min", "3 t", "3,4 mm/t", "340 moh"]);
  });

  it("uten vær: bare varighetene", () => {
    const tekst = lagRegeltekst({
      turtidMin: 92,
      tilgjengeligMin: 120,
      vaer: { type: "mangler" },
      hoyestePunktMoh: 527,
      lavtliggende: false,
      egnetDarligVaer: null,
      treff: ["utsikt"],
    });
    expect(tekst).toBe("passer tiden din (1 t 32 min av 2 t), værdata mangler, utsikt");
    expect(formaterteVerdier(tekst)).toEqual(["1 t 32 min", "2 t"]);
  });

  it("Alternativet: også det som mangler, og like verdier bare én gang", () => {
    const tekst = lagRegeltekst({
      turtidMin: 136,
      tilgjengeligMin: 60,
      vaer: { type: "mangler" },
      hoyestePunktMoh: 527,
      lavtliggende: false,
      egnetDarligVaer: null,
      treff: [],
    });
    expect(tekst).toBe("passer ikke tiden din: trenger 1 t 16 min mer (2 t 16 min av 1 t), værdata mangler");
    expect(formaterteVerdier(tekst)).toEqual(["1 t 16 min", "2 t 16 min", "1 t"]);
    expect(formaterteVerdier("16 min av 15 min, og 16 min")).toEqual(["16 min", "15 min"]);
  });

  it("målinger med enhet, intervaller og minus", () => {
    expect(formaterteVerdier("nedbør 3,5 mm/t, vind opptil 9,2 m/s, 3–5 °C, −2 til 1 °C og 340 moh")).toEqual([
      "3,5 mm/t",
      "9,2 m/s",
      "3–5 °C",
      "−2 til 1 °C",
      "340 moh",
    ]);
  });
});

describe("kontrollerSprakmodelltekst", () => {
  it("godkjent: UJ-1-teksten med verdiene ordrett", () => {
    expect(kontrollerSprakmodelltekst(UJ1_TEKST, UJ1, UJ1_FAKTA)).toEqual({ godkjent: true });
  });

  it("UJ-2: godkjent ordrett med «3,4 mm/t» og «340 moh»", () => {
    expect(kontrollerSprakmodelltekst(UJ2_TEKST, UJ2, MOLDEVATNET_FAKTA)).toEqual({ godkjent: true });
  });

  it("regel 1, mangler verdi: uten «1 t 32 min»", () => {
    const tekst = "Turen passer godt innenfor tiden din på 2 t, med oppholdsvær og lite vind, og fin utsikt.";
    expect(kontrollerSprakmodelltekst(tekst, UJ1, UJ1_FAKTA)).toEqual({
      godkjent: false,
      grunner: [{ type: "mangler-verdi", verdi: "1 t 32 min" }],
    });
  });

  it("regel 1: «2 t» inne i «2 t 30 min» teller ikke som verdien «2 t»", () => {
    const tekst = "Turen tar 1 t 32 min av 2 t 30 min, med oppholdsvær og lite vind.";
    expect(grunner(tekst)).toContainEqual({ type: "mangler-verdi", verdi: "2 t" });
  });

  it("regel 1, mellomrom: NBSP og smalt NBSP i «1 t 32 min» er godkjent", () => {
    expect(grunner(UJ1_TEKST.replace("1 t 32 min", "1 t 32 min"))).toEqual([]);
  });

  it("regel 1: bindestrek og tankestrek i intervaller er like", () => {
    const regel = "oppholdsvær og lite vind, 3–5 °C";
    expect(grunner("Oppholdsvær, lite vind og 3-5 °C.", regel, [])).toEqual([]);
    expect(grunner("Oppholdsvær, lite vind og 3–5 °C.", regel, [])).toEqual([]);
  });

  it("regel 2, ukjent tall: «7 km» når fakta har 6,45 km", () => {
    const tekst = UJ2_TEKST.replace("Turen passer", "Turen på 7 km passer");
    expect(kontrollerSprakmodelltekst(tekst, UJ2, MOLDEVATNET_FAKTA)).toEqual({
      godkjent: false,
      grunner: [{ type: "ukjent-tall", tall: "7" }],
    });
  });

  it("regel 2: tall fra fakta er godkjent", () => {
    const regel = regeltekst("uj-1", MOLDEVATNET, "13:30", 120, []);
    expect(regel).toBe("passer tiden din (1 t 33 min av 2 t), oppholdsvær og lite vind");
    const tekst =
      "Turen passer tiden din: 1 t 33 min av 2 t, med oppholdsvær og lite vind. Den er 6,45 km og når 340 moh.";
    expect(kontrollerSprakmodelltekst(tekst, regel, MOLDEVATNET_FAKTA)).toEqual({ godkjent: true });
  });

  it("regel 2: tall uten enhet fra Regelteksten og fakta er godkjent", () => {
    expect(grunner("1 t 32 min av 2 t, altså 1 og 32, med oppholdsvær og lite vind.")).toEqual([]);
    expect(grunner(`${UJ2_TEKST} Tallet 340 og 152.`, UJ2, MOLDEVATNET_FAKTA)).toEqual([]);
  });

  it.each([
    ["152 km", "152"],
    ["340 m/s", "340"],
    ["32 km", "32"],
    ["340 m", "340"],
    ["1 t", "1"],
  ])("regel 2: tall med feil enhet, «%s»", (frase, tall) => {
    expect(grunner(`${UJ2_TEKST} Og ${frase}.`, UJ2, MOLDEVATNET_FAKTA)).toEqual([{ type: "ukjent-tall", tall }]);
  });

  it.each([
    ["−340 moh", "−340"],
    ["-7", "−7"],
    ["-340", "−340"],
  ])("regel 2: fortegnet teller, «%s»", (frase, tall) => {
    expect(grunner(`${UJ2_TEKST} Og ${frase}.`, UJ2, MOLDEVATNET_FAKTA)).toEqual([{ type: "ukjent-tall", tall }]);
  });

  it.each([
    ["3.4", "3.4"],
    ["6.45 km", "6.45"],
    ["1.000", "1.000"],
    ["6,450", "6,450"],
    ["13.30", "13.30"],
    ["½", "½"],
    ["1½", "1½"],
    ["m²", "²"],
    ["７", "７"],
  ])("regel 2: desimalkomma og vanlige sifre, «%s» er ukjent", (frase, tall) => {
    expect(grunner(`${UJ2_TEKST} Og ${frase}.`, UJ2, MOLDEVATNET_FAKTA)).toEqual([{ type: "ukjent-tall", tall }]);
  });

  it("regel 2: «3.4 mm/t» er ikke verdien «3,4 mm/t»", () => {
    expect(grunner(UJ2_TEKST.replace("3,4 mm/t", "3.4 mm/t"), UJ2, MOLDEVATNET_FAKTA)).toEqual([
      { type: "mangler-verdi", verdi: "3,4 mm/t" },
      { type: "ukjent-tall", tall: "3.4" },
    ]);
  });

  it("regel 2: like tall gir én grunn, «3,5» og «3.5» to", () => {
    expect(grunner(`${UJ2_TEKST} 7 og 7, 3,5 og 3.5.`, UJ2, MOLDEVATNET_FAKTA)).toEqual([
      { type: "ukjent-tall", tall: "7" },
      { type: "ukjent-tall", tall: "3,5" },
      { type: "ukjent-tall", tall: "3.5" },
    ]);
  });

  it("regel 1 og 2: negativt temperaturspenn med bindestrek som minus", () => {
    const regel = "oppholdsvær og lite vind, −2 til 1 °C";
    expect(formaterteVerdier(regel)).toEqual(["−2 til 1 °C"]);
    expect(grunner("Oppholdsvær, lite vind og -2 til 1 °C.", regel, [])).toEqual([]);
    expect(grunner("Oppholdsvær, lite vind og 2 til 1 °C.", regel, [])).toEqual([
      { type: "mangler-verdi", verdi: "−2 til 1 °C" },
      { type: "ukjent-tall", tall: "2" },
      { type: "ukjent-tall", tall: "1" },
    ]);
  });

  it("regel 1 og 2: intervall i Regelteksten med ekte fakta", () => {
    const regel = "passer tiden din (1 t 33 min av 3 t), oppholdsvær og lite vind, 3–5 °C";
    const tekst = "Turen på 6,45 km passer: 1 t 33 min av 3 t, oppholdsvær, lite vind og 3–5 °C.";
    expect(grunner(tekst, regel, MOLDEVATNET_FAKTA)).toEqual([]);
    expect(grunner(tekst.replace("3–5 °C", "5 °C"), regel, MOLDEVATNET_FAKTA)).toEqual([
      { type: "mangler-verdi", verdi: "3–5 °C" },
      { type: "ukjent-tall", tall: "5" },
    ]);
  });

  it("regel 1: kortere verdi inne i en lengre teller ikke («16 min» i «1 t 16 min»)", () => {
    const regel = "passer ikke tiden din: trenger 16 min mer (1 t 16 min av 1 t)";
    expect(grunner("Du trenger 16 min mer: 1 t 16 min av 1 t.", regel, [])).toEqual([]);
    expect(grunner("Den tar 1 t 16 min av 1 t.", regel, [])).toEqual([{ type: "mangler-verdi", verdi: "16 min" }]);
  });

  it("normalisering: myk bindestrek og tegn uten bredde tas bort", () => {
    expect(grunner(UJ1_TEKST.replace("1 t 32 min", "1 t 3­2​ min").replace("2 t,", "2﻿ t,"))).toEqual([]);
  });

  it.each(["", "   "])("tom tekst «%s»: alle verdiene mangler", (tekst) => {
    expect(grunner(tekst)).toEqual([
      { type: "mangler-verdi", verdi: "1 t 32 min" },
      { type: "mangler-verdi", verdi: "2 t" },
    ]);
  });

  it("tekst uten tall mot en Regeltekst med verdier: alle verdiene mangler", () => {
    expect(grunner("Turen passer tiden din, med oppholdsvær og lite vind.", UJ2, MOLDEVATNET_FAKTA)).toEqual(
      formaterteVerdier(UJ2).map((verdi) => ({ type: "mangler-verdi", verdi })),
    );
  });

  it.each(["halvannen time", "to timer", "en time", "et minutt", "ti minutter", "tjuefem minutter", "femten min"])(
    "regel 3, tid med ord: «%s»",
    (frase) => {
      expect(grunner(`${UJ1_TEKST} Det tar ${frase}.`)).toEqual([{ type: "tall-med-ord", frase }]);
    },
  );

  it.each(["Fem km", "tre millimeter", "hundre høydemeter", "en mil", "et par timer", "tre døgn"])(
    "regel 3, mengde eller tid med ord: «%s»",
    (frase) => {
      expect(grunner(`${UJ1_TEKST} Det er ${frase}.`)).toEqual([{ type: "tall-med-ord", frase }]);
    },
  );

  it.each(["en halv time", "Ett kvarter", "et kvarters gange", "halvtimen", "halv"])(
    "regel 3, brøkord gir hele frasen: «%s»",
    (frase) => {
      const forventet = frase === "et kvarters gange" ? "et kvarters" : frase;
      expect(grunner(`${UJ1_TEKST} Det tar ${frase}.`)).toEqual([{ type: "tall-med-ord", frase: forventet }]);
    },
  );

  it("regel 3: grunnene står i tekstrekkefølge", () => {
    expect(grunner(`${UJ1_TEKST} Først to timer, så en halv time, så tre km.`)).toEqual([
      { type: "tall-med-ord", frase: "to timer" },
      { type: "tall-med-ord", frase: "en halv time" },
      { type: "tall-med-ord", frase: "tre km" },
    ]);
  });

  it("regel 3, lov ord: «en fin Tur», «en Tur» og «ett Startpunkt»", () => {
    expect(grunner(`${UJ1_TEKST} Det er en fin Tur, en Tur med ett Startpunkt, og to vann.`)).toEqual([]);
  });

  it.each([
    ["trygg tur", "trygg"],
    ["Trygt", "Trygt"],
    ["TRYGGE stier", "TRYGGE"],
    ["tryggere", "tryggere"],
    ["tryggest", "tryggest"],
    ["utrygg", "utrygg"],
    ["Utrygt", "Utrygt"],
    ["utrygge", "utrygge"],
  ])("regel 4, forbudt ord: «%s»", (frase, ord) => {
    expect(grunner(`${UJ1_TEKST} ${frase}.`)).toEqual([{ type: "forbudt-ord", ord }]);
  });

  it("regel 4: bare hele ord, så «tryggheten» er lov", () => {
    expect(grunner(`${UJ1_TEKST} Tryggheten er god.`)).toEqual([]);
  });

  it("flere feil: mangler verdi og «trygt» gir begge grunnene", () => {
    const tekst = "Turen er trygt innenfor 2 t, med oppholdsvær og lite vind.";
    expect(kontrollerSprakmodelltekst(tekst, UJ1, UJ1_FAKTA)).toEqual({
      godkjent: false,
      grunner: [{ type: "mangler-verdi", verdi: "1 t 32 min" }, { type: "forbudt-ord", ord: "trygt" }],
    });
  });
});
