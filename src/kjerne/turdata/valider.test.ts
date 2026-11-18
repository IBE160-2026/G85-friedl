import { describe, expect, it } from "vitest";
import rutegeometriJson from "../../../data/rutegeometri.geojson";
import turerJson from "../../../data/turer-moldemarka.json";
import testturerJson from "../../../testdata/turer.json";
import { RutegeometriSkjema } from "./rutegeometri";
import { validerTurdatasett, type Avvik } from "./valider";

// FR-27 mot det ekte Turdatasettet og den committede rutegeometrien, og mot ødelagte kopier.

const geometri = RutegeometriSkjema.parse(rutegeometriJson);

type Datasett = typeof turerJson;
type Tur = Datasett["turer"][number];

/** En dyp kopi av Turdatasettet, som hver test kan ødelegge på sin måte. */
const kopi = (): Datasett => structuredClone(turerJson);

function tur(data: Datasett, id: string): Tur & Record<string, unknown> {
  const funnet = data.turer.find((t) => t.id === id);
  if (!funnet) throw new Error(`Ingen Tur med id ${id}.`);
  return funnet as Tur & Record<string, unknown>;
}

const valider = (data: unknown) => validerTurdatasett(data, geometri);

/** Zod-stien til et felt i Turen med denne id-en, med plassen regnet ut fra Turdatasettet. */
function sti(id: string, felt?: string): string {
  const indeks = turerJson.turer.findIndex((t) => t.id === id);
  if (indeks < 0) throw new Error(`Ingen Tur med id ${id}.`);
  return felt ? `turer.${indeks}.${felt}` : `turer.${indeks}`;
}

/** Ett grovt anslag: 1 meter i breddegrad. */
const GRAD_PER_METER = 1 / 111_195;

function forventSkjemafeil(avvik: Avvik[], sti: string, turId?: string) {
  expect(avvik.length).toBeGreaterThan(0);
  expect(avvik.every((a) => a.regel === "skjema")).toBe(true);
  const treff = avvik.find((a) => a.melding.startsWith(`${sti}:`));
  expect(treff, `ingen skjemafeil på ${sti} i ${JSON.stringify(avvik)}`).toBeDefined();
  if (turId) expect(treff?.turId).toBe(turId);
}

describe("de ekte dataene", () => {
  it("den faste kopien testdata/turer.json består også FR-27", () => {
    expect(validerTurdatasett(testturerJson, geometri)).toEqual([]);
  });

  it("rutegeometrien er gyldig og har begge Rutesegmentene med rutenummer 1506_MM_0312", () => {
    const navn = geometri.features
      .filter((f) => f.properties.rutenummer === "1506_MM_0312")
      .map((f) => f.properties.rutenavn);
    expect(navn).toEqual(["Vardenveien", "Øverlandsvatnet_Bergsvatnet"]);
  });

  it("Turdatasettet har ingen avvik", () => {
    expect(valider(turerJson)).toEqual([]);
  });

  it("en uendret kopi har ingen avvik", () => {
    expect(valider(kopi())).toEqual([]);
  });
});

describe("skjema: ugyldig felt eller verdi", () => {
  it("ukjent gradering", () => {
    const data = kopi();
    tur(data, "tusten").gradering = "X";
    forventSkjemafeil(valider(data), sti("tusten", "gradering"), "tusten");
  });

  it("manglende kilde", () => {
    const data = kopi();
    Reflect.deleteProperty(tur(data, "bergsvatnet"), "kilde");
    forventSkjemafeil(valider(data), sti("bergsvatnet", "kilde"), "bergsvatnet");
  });

  it("ekstra felt", () => {
    const data = kopi();
    tur(data, "midtveishuken").vanskelighet = "Enkel";
    const avvik = valider(data);
    forventSkjemafeil(avvik, sti("midtveishuken"), "midtveishuken");
    expect(avvik[0].melding).toContain("vanskelighet");
  });

  it("ekstra felt i Startpunktet", () => {
    const data = kopi();
    (tur(data, "tusten").startpunkt as Record<string, unknown>).hoyde = 100;
    forventSkjemafeil(valider(data), sti("tusten", "startpunkt"), "tusten");
  });

  it("breddegrad utenfor -90–90", () => {
    const data = kopi();
    tur(data, "tusten").startpunkt.lat = 95;
    forventSkjemafeil(valider(data), sti("tusten", "startpunkt.lat"), "tusten");
  });

  it("duplisert id", () => {
    const data = kopi();
    tur(data, "tusten").id = "bergsvatnet";
    forventSkjemafeil(valider(data), sti("tusten", "id"), "bergsvatnet");
  });

  it("gradering_tekst som ikke passer til graderingen", () => {
    const data = kopi();
    tur(data, "tusten").gradering_tekst = "Enkel";
    forventSkjemafeil(valider(data), sti("tusten", "gradering_tekst"));
  });

  it("lengde_km_totalt som ikke stemmer med retning", () => {
    const data = kopi();
    tur(data, "tusten").lengde_km_totalt = 4.48;
    forventSkjemafeil(valider(data), sti("tusten", "lengde_km_totalt"));
  });

  it("kilde som ikke er http eller https", () => {
    const data = kopi();
    tur(data, "tusten").kilde = "ftp://morotur.no/tusten";
    forventSkjemafeil(valider(data), sti("tusten", "kilde"));
  });

  it("ugyldig Adkomst", () => {
    const data = kopi();
    tur(data, "bergsvatnet").adkomst = { lengde_m: -5, beskrivelse: "Grusveien." };
    forventSkjemafeil(valider(data), sti("bergsvatnet", "adkomst.lengde_m"));
  });

  it("godtar et gyldig Målpunkt og avviser et ufullstendig", () => {
    const data = kopi();
    tur(data, "tusten").mal_punkt = { lat: 62.77, lon: 7.29, koordinatkilde: "Kartverket" };
    expect(valider(data)).toEqual([]);

    tur(data, "tusten").mal_punkt = { lat: 62.77, lon: 7.29 };
    forventSkjemafeil(valider(data), sti("tusten", "mal_punkt.koordinatkilde"));
  });

  it("id som ikke er kebab-case", () => {
    const data = kopi();
    tur(data, "tusten").id = "Tusten";
    forventSkjemafeil(valider(data), sti("tusten", "id"), "Tusten");
  });

  it("manglende merknad", () => {
    const data = kopi();
    Reflect.deleteProperty(tur(data, "tusten"), "merknad");
    forventSkjemafeil(valider(data), sti("tusten", "merknad"), "tusten");
  });

  it("oppdatert som ikke er en ISO-dato", () => {
    forventSkjemafeil(valider({ ...kopi(), oppdatert: "9. november" }), "oppdatert");
  });

  it("ekstra felt på toppnivå", () => {
    forventSkjemafeil(valider({ ...kopi(), versjon: 2 }), "(roten)");
  });

  it("ikke et objekt", () => {
    forventSkjemafeil(valider(null), "(roten)");
  });
});

describe("skjema: høydemeter", () => {
  it("målt stigning 25 m fra hoydemeter", () => {
    const data = kopi();
    const t = tur(data, "tusten");
    t.hoydemeter_kontroll = { status: "kontrollert", malt_m: t.hoydemeter + 25 };
    forventSkjemafeil(valider(data), sti("tusten", "hoydemeter_kontroll.malt_m"), "tusten");
  });

  it("målt stigning 21 m fra hoydemeter", () => {
    const data = kopi();
    const t = tur(data, "tusten");
    t.hoydemeter_kontroll = { status: "kontrollert", malt_m: t.hoydemeter - 21 };
    forventSkjemafeil(valider(data), sti("tusten", "hoydemeter_kontroll.malt_m"), "tusten");
  });

  it("målt stigning nøyaktig 20 m fra hoydemeter er godkjent", () => {
    const data = kopi();
    const t = tur(data, "tusten");
    t.hoydemeter_kontroll = { status: "kontrollert", malt_m: t.hoydemeter - 20 };
    expect(valider(data)).toEqual([]);
  });

  it("status som verken er kontrollert eller anslag", () => {
    const data = kopi();
    tur(data, "tusten").hoydemeter_kontroll = { status: "ukjent" } as Tur["hoydemeter_kontroll"];
    forventSkjemafeil(valider(data), sti("tusten", "hoydemeter_kontroll.status"), "tusten");
  });

  it("kontrollert uten malt_m", () => {
    const data = kopi();
    tur(data, "tusten").hoydemeter_kontroll = { status: "kontrollert" } as Tur["hoydemeter_kontroll"];
    forventSkjemafeil(valider(data), sti("tusten", "hoydemeter_kontroll.malt_m"));
  });
});

describe("Rutesegmenter og geometri", () => {
  it("ukjent Rutesegment: rutenummeret finnes, men ikke med dette rutenavnet", () => {
    const data = kopi();
    tur(data, "storlihytta-fra-vardeveien").rutesegmenter[1] = { rutenummer: "1506_MM_0312", rutenavn: "Feil" };
    expect(valider(data)).toEqual([
      {
        regel: "ukjent-rutesegment",
        turId: "storlihytta-fra-vardeveien",
        melding: expect.stringContaining("1506_MM_0312 «Feil»"),
      },
    ]);
  });

  it("geometrisjekkene kjøres ikke når skjemaet avviser dataene", () => {
    const data = kopi();
    tur(data, "tusten").rutesegmenter[0] = { rutenummer: "1506_MM_0312", rutenavn: "Feil" };
    tur(data, "tusten").gradering = "X";
    expect(valider(data).map((a) => a.regel)).toEqual(["skjema"]);
  });

  it("hull: to Rutesegmenter som ligger langt fra hverandre", () => {
    const data = kopi();
    tur(data, "tusten").rutesegmenter.push({ rutenummer: "1506_MM_0310", rutenavn: "Storlihytta_Varden" });
    const avvik = valider(data);
    expect(avvik).toEqual([{ regel: "hull", turId: "tusten", melding: expect.any(String) }]);
    const malt = Number(/er (\d+) m/.exec(avvik[0].melding)?.[1]);
    expect(malt).toBeGreaterThan(50);
  });

  describe("grensen på 50 m for hull, med en liten rutegeometri", () => {
    // To Rutesegmenter på en rett linje østover fra Startpunktet til Tusten, med et hull imellom.
    const start = tur(kopi(), "tusten").startpunkt;
    const mLon = 1 / (111_195 * Math.cos((start.lat * Math.PI) / 180));
    const p = (ost: number): [number, number] => [start.lon + ost * mLon, start.lat];
    const feature = (rutenavn: string, linje: [number, number][]) => ({
      type: "Feature" as const,
      properties: { rutenummer: "test", rutenavn },
      geometry: { type: "MultiLineString" as const, coordinates: [linje] },
    });
    const medHull = (hull: number) => {
      const liten = RutegeometriSkjema.parse({
        type: "FeatureCollection",
        features: [feature("a", [p(0), p(500)]), feature("b", [p(500 + hull), p(1000)])],
      });
      const data = kopi();
      const t = tur(data, "tusten");
      t.rutesegmenter = [
        { rutenummer: "test", rutenavn: "a" },
        { rutenummer: "test", rutenavn: "b" },
      ];
      return validerTurdatasett({ ...data, turer: [t] }, liten);
    };

    it("hull på ca. 60 m gir avvik", () => {
      expect(medHull(60)).toEqual([
        { regel: "hull", turId: "tusten", melding: expect.stringContaining("er 60 m, grensen er 50 m") },
      ]);
    });

    it("hull på ca. 40 m er godkjent", () => {
      expect(medHull(40)).toEqual([]);
    });
  });

  it("Startpunkt flyttet ca. 300 m uten Adkomst", () => {
    const data = kopi();
    tur(data, "tusten").startpunkt.lat -= 300 * GRAD_PER_METER;
    expect(valider(data)).toEqual([
      { regel: "startpunkt", turId: "tusten", melding: expect.stringMatching(/ligger \d+ m .* grensen er 200 m\.$/) },
    ]);
  });

  it("Adkomst redusert så avstanden er over Adkomst + 200 m", () => {
    const data = kopi();
    tur(data, "varden-fra-sentrum").adkomst!.lengde_m = 800;
    expect(valider(data)).toEqual([
      {
        regel: "startpunkt",
        turId: "varden-fra-sentrum",
        melding: expect.stringContaining("grensen er 1000 m (Adkomst 800 m + 200 m)"),
      },
    ]);
  });

  it("Adkomst fjernet fra en Tur som trenger den", () => {
    const data = kopi();
    Reflect.deleteProperty(tur(data, "storlihytta-fra-museet"), "adkomst");
    expect(valider(data).map((a) => [a.regel, a.turId])).toEqual([["startpunkt", "storlihytta-fra-museet"]]);
  });
});

describe("samme sted, samme Startpunkt", () => {
  it("samme navn, annen lon", () => {
    const data = kopi();
    tur(data, "tusenarsvarden-fra-damefallet").startpunkt.lon += 0.0005;
    expect(valider(data)).toEqual([
      {
        regel: "ulikt-startpunkt",
        turId: "tusenarsvarden-fra-damefallet",
        melding: expect.stringContaining("skihytta-fra-damefallet"),
      },
    ]);
  });

  it("samme navn, annen koordinatkilde", () => {
    const data = kopi();
    tur(data, "midtveishuken").startpunkt.koordinatkilde = "Norgeskart";
    expect(valider(data).map((a) => [a.regel, a.turId])).toEqual([["ulikt-startpunkt", "midtveishuken"]]);
  });

  it("ulike navn på samme sted", () => {
    const data = kopi();
    tur(data, "tusenarsvarden-fra-damefallet").startpunkt.navn = "Damefallet";
    expect(valider(data)).toEqual([
      {
        regel: "ulikt-startpunkt",
        turId: "tusenarsvarden-fra-damefallet",
        melding: expect.stringContaining("ligger 0 m fra hverandre"),
      },
    ]);
  });

  it("ulike navn ca. 50 m fra hverandre", () => {
    const data = kopi();
    const startpunkt = tur(data, "tusenarsvarden-fra-damefallet").startpunkt;
    startpunkt.navn = "Damefallet";
    startpunkt.lat += 50 * GRAD_PER_METER;
    expect(valider(data)).toEqual([
      {
        regel: "ulikt-startpunkt",
        turId: "tusenarsvarden-fra-damefallet",
        melding: expect.stringContaining("ligger 50 m fra hverandre"),
      },
    ]);
  });
});

describe("RutegeometriSkjema", () => {
  it("avviser to Features med samme rutenummer og rutenavn", () => {
    const [forste] = geometri.features;
    const resultat = RutegeometriSkjema.safeParse({ type: "FeatureCollection", features: [forste, forste] });
    expect(resultat.success).toBe(false);
    expect(resultat.error?.issues[0].path).toEqual(["features", 1, "properties"]);
  });
});
