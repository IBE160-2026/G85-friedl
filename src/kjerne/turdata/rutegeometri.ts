import { z } from "zod";

// Rutegeometrien (AD-10): data/rutegeometri.geojson, laget av scripts/konverter-rutegeometri.ts
// fra Turrutebasen. WGS84 i [lon, lat], ett Feature<MultiLineString> per Rutesegment.

const Lengdegrad = z.number().min(-180).max(180);
const Breddegrad = z.number().min(-90).max(90);

/** Et punkt i GeoJSON-rekkefølge: [lon, lat]. */
const Posisjon = z.tuple([Lengdegrad, Breddegrad]);

/** En linje med minst to punkter. */
export const LinjeSkjema = z.array(Posisjon).min(2);

/** Et Rutesegment i Turrutebasen. Rutenummer alene er ikke unikt (1506_MM_0312 har to rutenavn). */
export const RutesegmentSkjema = z.strictObject({
  rutenummer: z.string().min(1),
  rutenavn: z.string().min(1),
});

const RutesegmentFeature = z.strictObject({
  type: z.literal("Feature"),
  properties: RutesegmentSkjema,
  geometry: z.strictObject({
    type: z.literal("MultiLineString"),
    coordinates: z.array(LinjeSkjema).min(1),
  }),
});

export type Rutesegment = z.infer<typeof RutesegmentSkjema>;
export type Linje = z.infer<typeof LinjeSkjema>;

/** Nøkkelen til et Rutesegment: rutenummer og rutenavn sammen. */
export function rutesegmentNokkel({ rutenummer, rutenavn }: Rutesegment): string {
  return JSON.stringify([rutenummer, rutenavn]);
}

export const RutegeometriSkjema = z
  .strictObject({
    type: z.literal("FeatureCollection"),
    features: z.array(RutesegmentFeature).min(1),
  })
  .superRefine((geometri, ctx) => {
    const sett = new Set<string>();
    geometri.features.forEach((feature, i) => {
      const nokkel = rutesegmentNokkel(feature.properties);
      if (sett.has(nokkel)) {
        ctx.addIssue({
          code: "custom",
          path: ["features", i, "properties"],
          message: `Rutesegmentet ${feature.properties.rutenummer} ${feature.properties.rutenavn} finnes flere ganger.`,
        });
      }
      sett.add(nokkel);
    });
  });

export type Rutegeometri = z.infer<typeof RutegeometriSkjema>;
