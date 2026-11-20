import { z } from "zod";
import { RutesegmentSkjema } from "./rutegeometri";

// Turdatasettet (AD-9, FR-26): data/turer-moldemarka.json. Feltnavnene står uendret som i fila,
// også snake_case. Alle objekter er strenge, så ekstra og feilstavede felt avvises.
// Geometrisjekkene i FR-27 (Rutesegmenter, hull og Startpunkt) ligger i valider.ts.

const Tekst = z.string().min(1);
const Breddegrad = z.number().min(-90).max(90);
const Lengdegrad = z.number().min(-180).max(180);

/** Største tillatte avvik mellom `hoydemeter` og målt stigning (FR-27). */
export const MAKS_HOYDEAVVIK_M = 20;

/** Toleransen for `lengde_km_totalt` mot `lengde_km_kilde` og `retning`. */
const LENGDETOLERANSE_KM = 0.005;

/** Vanskelighetsgraden som tekst, slik Turdatasettet og Søket viser den. */
export const GRADERINGSTEKST = { G: "Enkel", B: "Middels", R: "Krevende" } as const;

/** Lengdefaktor per retning: en vei går fram og tilbake, så hele turen er dobbelt så lang. */
const LENGDEFAKTOR = { en_vei: 2, tur_retur: 1, rundtur: 1 } as const;

const StartpunktSkjema = z.strictObject({
  navn: Tekst,
  /** Det korte navnet ved prikken på Søk-kartet, som i skissen pc-1 («Tusten skisenter»). */
  kortnavn: Tekst,
  lat: Breddegrad,
  lon: Lengdegrad,
  koordinatkilde: Tekst,
});

const MalPunktSkjema = z.strictObject({
  lat: Breddegrad,
  lon: Lengdegrad,
  koordinatkilde: Tekst,
});

const HoydemeterKontrollSkjema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("kontrollert"), malt_m: z.number().min(0) }),
  z.strictObject({ status: z.literal("anslag") }),
]);

const AdkomstSkjema = z.strictObject({
  lengde_m: z.number().positive(),
  beskrivelse: Tekst,
});

export const TurSkjema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id skal være små bokstaver, tall og bindestrek."),
    navn: Tekst,
    mal: Tekst,
    startpunkt: StartpunktSkjema,
    mal_punkt: MalPunktSkjema.optional(),
    retning: z.enum(["en_vei", "tur_retur", "rundtur"]),
    lengde_km_kilde: z.number().positive(),
    lengde_km_totalt: z.number().positive(),
    hoydemeter: z.number().int().min(0),
    hoydemeter_kontroll: HoydemeterKontrollSkjema,
    hoyeste_punkt_moh: z.number().min(0),
    gradering: z.enum(["G", "B", "R"]),
    gradering_tekst: z.enum(["Enkel", "Middels", "Krevende"]),
    utsikt: z.boolean(),
    vann: z.boolean(),
    historie: z.boolean(),
    egnet_darlig_vaer: z.boolean().nullable(),
    rutesegmenter: z.array(RutesegmentSkjema).min(1),
    adkomst: AdkomstSkjema.optional(),
    kilde: z.url({ protocol: /^https?$/ }),
    merknad: Tekst,
  })
  .superRefine((tur, ctx) => {
    const tekst = GRADERINGSTEKST[tur.gradering];
    if (tur.gradering_tekst !== tekst) {
      ctx.addIssue({
        code: "custom",
        path: ["gradering_tekst"],
        message: `gradering ${tur.gradering} skal ha gradering_tekst «${tekst}», ikke «${tur.gradering_tekst}».`,
      });
    }

    const forventet = tur.lengde_km_kilde * LENGDEFAKTOR[tur.retning];
    if (Math.abs(tur.lengde_km_totalt - forventet) > LENGDETOLERANSE_KM) {
      ctx.addIssue({
        code: "custom",
        path: ["lengde_km_totalt"],
        message: `retning ${tur.retning} gir lengde_km_totalt ${forventet} km, ikke ${tur.lengde_km_totalt} km.`,
      });
    }

    const kontroll = tur.hoydemeter_kontroll;
    if (kontroll.status === "kontrollert" && Math.abs(kontroll.malt_m - tur.hoydemeter) > MAKS_HOYDEAVVIK_M) {
      ctx.addIssue({
        code: "custom",
        path: ["hoydemeter_kontroll", "malt_m"],
        message: `målt stigning ${kontroll.malt_m} m avviker mer enn ${MAKS_HOYDEAVVIK_M} m fra hoydemeter ${tur.hoydemeter} m.`,
      });
    }
  });

export const TurdatasettSkjema = z
  .strictObject({
    omrade: Tekst,
    oppdatert: z.iso.date(),
    beskrivelse: Tekst,
    turer: z.array(TurSkjema).min(1),
  })
  .superRefine((datasett, ctx) => {
    const sett = new Set<string>();
    datasett.turer.forEach((tur, i) => {
      if (sett.has(tur.id)) {
        ctx.addIssue({ code: "custom", path: ["turer", i, "id"], message: `id «${tur.id}» finnes flere ganger.` });
      }
      sett.add(tur.id);
    });
  });

export type Tur = z.infer<typeof TurSkjema>;
export type Turdatasett = z.infer<typeof TurdatasettSkjema>;
