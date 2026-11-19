import { z } from "zod";
import { SokSkjema } from "../sok";
import type { Vaerklasse } from "../vaer/typer";

// Visningskontrakten (AD-3, AR-4): Resultatet slik serveren sender det og UI-et viser det.
// All visningstekst er ferdig formatert i kjernen. UI-et utleder og formaterer ingenting selv.
// Alle objekter er strenge på alle nivåer, så ekstra felt og snake_case-felt avvises.
// Faste tekster uten domeneverdier står i src/ui/tekster.ts, ikke her.

/** Ferdig formatert visningstekst. */
const Tekst = z.string().min(1);

/** Posisjon langs en stolpe, fra 0 til 1. */
export const AndelSkjema = z.number().min(0).max(1);

const Breddegrad = z.number().min(-90).max(90);
const Lengdegrad = z.number().min(-180).max(180);

/** Et punkt i WGS84. */
export const PunktSkjema = z.strictObject({ lat: Breddegrad, lon: Lengdegrad });

/** Et punkt i GeoJSON-rekkefølge: [lon, lat]. */
const GeoJsonPosisjon = z.tuple([Lengdegrad, Breddegrad]);

// Samme verdier som Vaerklasse i vaer/typer.ts. `satisfies` feiler hvis en verdi mangler eller er ekstra.
const VAERKLASSER = {
  god: "god",
  middels: "middels",
  darlig: "darlig",
  fraradet: "fraradet",
} as const satisfies { [K in Vaerklasse]: K };

export const VaerklasseSkjema = z.enum(VAERKLASSER);

// --- Kriterieradene ---

const RAD = ["tid", "vaer", "onsker", "morke"] as const;

/** En Kriterierad. `detalj` er en liste, fordi Mørke-raden har flere linjer og tipset sist. */
export const KriteriumSkjema = z.strictObject({
  rad: z.enum(RAD),
  merke: z.enum(["ok", "se-opp", "ingen"]),
  tekst: Tekst,
  detalj: z.array(Tekst),
});

const kriterium = <R extends (typeof RAD)[number]>(rad: R) =>
  KriteriumSkjema.extend({ rad: z.literal(rad) });

/** Turkort og Alternativkort: Tid, Vær, Ønsker, Mørke, i den rekkefølgen. */
const KortKriterier = z.tuple([
  kriterium("tid"),
  kriterium("vaer"),
  kriterium("onsker"),
  kriterium("morke"),
]);

/** Frarådet-kortet: Vær og Tid, i den rekkefølgen. */
const FraradetKriterier = z.tuple([kriterium("vaer"), kriterium("tid")]);

// --- Stolpene ---

/**
 * Tidsstolpen er max(Turtid, Tilgjengelig tid) lang.
 * Turforslag: `fyll` = T ÷ A og `overGrense` = 0. Alternativ: `fyll` = A ÷ T og `overGrense` = (T − A) ÷ T.
 */
export const TidsstolpeSkjema = z
  .strictObject({ fyll: AndelSkjema, overGrense: AndelSkjema })
  .refine((s) => s.fyll + s.overGrense <= 1 + 1e-9, {
    message: "fyll + overGrense kan ikke være over 1.",
    path: ["overGrense"],
  });

/** Et merke på en stolpe: posisjon og ferdig tekst, for eksempel «sol ned 15:59». */
const Stolpemerke = z.strictObject({ andel: AndelSkjema, tekst: Tekst });

/**
 * Dagslysstolpen spenner over start, slutt og solnedgang. Andelene er posisjoner langs stolpen,
 * og serveren regner dem ut.
 */
export const DagslysstolpeSkjema = z.strictObject({
  startTekst: Tekst,
  slutt: Stolpemerke,
  skumring: AndelSkjema.nullable(),
  solNed: Stolpemerke.nullable(),
  solOpp: Stolpemerke.nullable(),
});

// --- Kartet ---

/** Ruten som GeoJSON Feature med MultiLineString i [lon, lat]. */
export const RuteSkjema = z.strictObject({
  type: z.literal("Feature"),
  geometry: z.strictObject({
    type: z.literal("MultiLineString"),
    coordinates: z.array(z.array(GeoJsonPosisjon).min(2)).min(1),
  }),
  properties: z.strictObject({}),
});

export const KartSkjema = z.strictObject({
  rute: RuteSkjema,
  startpunkt: PunktSkjema,
  nummer: z.number().int().min(1).max(3),
  malpunkt: PunktSkjema.optional(),
});

// --- Kortet ---

/** Turkortet. Alternativkortet bruker samme skjema. */
export const TurkortSkjema = z.strictObject({
  turId: Tekst,
  mal: Tekst,
  fra: Tekst,
  startpunktTekst: Tekst,
  faktalinje: Tekst,
  kriterier: KortKriterier,
  tidsstolpe: TidsstolpeSkjema,
  dagslysstolpe: DagslysstolpeSkjema,
  regeltekst: Tekst,
  kartinfoboks: z.strictObject({ navn: Tekst, tekst: Tekst }),
  stokkoversiktRad: Tekst,
  lesetekst: Tekst,
  kilde: z.strictObject({ navn: Tekst, url: z.url({ protocol: /^https?$/ }) }),
  kart: KartSkjema,
});

// --- Været ---

export const VaerSkjema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("vurdert"),
    klasse: VaerklasseSkjema,
    klasseTekst: Tekst,
    /** `null` for en ukjent symbolkode. `ikonSti` er `null` når MET ikke har ikon for koden. */
    symbol: z.strictObject({ ord: Tekst, ikonSti: Tekst.nullable() }).nullable(),
    /** «klarvær · 3–5 °C · nedbør 0 mm/t · vind opptil 4,5 m/s». */
    sammendrag: Tekst,
    /** Sammendraget uten symbolordet: «3–5 °C · nedbør 0 mm/t · vind opptil 4,5 m/s». */
    verdier: Tekst,
    tidsvindu: Tekst,
    hoydemerknad: Tekst,
    /** Bare ved dårlig: tittelen («Værvarsling: Værklasse dårlig i Tidsvinduet …») og verdiene. */
    vaervarsling: z.strictObject({ tittel: Tekst, tekst: Tekst }).optional(),
  }),
  z.strictObject({
    type: z.literal("mangler"),
    tekst: Tekst,
  }),
]);

// --- Utfallet ---

export const UtfallSkjema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("turforslag"),
    kort: z.array(TurkortSkjema).min(1).max(3),
  }),
  z.strictObject({
    type: z.literal("kortesteTur"),
    kort: TurkortSkjema,
    passerMedTekst: Tekst,
  }),
  z.strictObject({
    type: z.literal("fraradet"),
    melding: Tekst,
    kriterier: FraradetKriterier,
  }),
]);

// --- Bedre tidsvindu ---

export const BedreTidsvinduSkjema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("funnet"),
    nyttSok: SokSkjema,
    /** Teksten i Bedre tidsvindu-boksen: «I morgen fra kl. 14:00 er Værklassen god.». */
    tekst: Tekst,
    /** Dagen i Bedre tidsvindu-kortet: «I morgen, søn. 15. nov.». */
    dag: Tekst,
    /** Linjen under dagen i Bedre tidsvindu-kortet: «fra kl. 11:00 · samme 2 t, Middels». */
    detalj: Tekst,
    antallTekst: Tekst,
    knappTekst: Tekst,
  }),
  z.strictObject({
    type: z.literal("ingen"),
    tekst: Tekst,
  }),
]);

// --- Ditt søk ---

/** Søket som Resultatet gjelder for. UI-et viser «ingen» på PC når lista er tom. */
export const DittSokSkjema = z.strictObject({
  turdag: Tekst,
  starttidspunkt: Tekst,
  tilgjengeligTid: Tekst,
  vanskelighetsgrad: Tekst,
  opplevelsespreferanser: z.array(Tekst),
});

// --- Resultatvisningen ---

/**
 * Resultatvisningen. Roten håndhever tabellen i FR-6:
 * - `utfall` er `fraradet` hvis og bare hvis Værklassen er frarådet.
 * - `bedreTidsvindu` finnes hvis og bare hvis Værklassen er dårlig eller frarådet.
 * - `vaervarsling` finnes hvis og bare hvis Værklassen er dårlig.
 * Turforslagene har `kart.nummer` 1, 2, 3 i rekkefølgen de står.
 */
export const ResultatvisningSkjema = z
  .strictObject({
    resultatId: Tekst,
    sok: SokSkjema,
    justering: Tekst.optional(),
    overskrift: Tekst,
    dittSok: DittSokSkjema,
    liveTekst: Tekst,
    vaer: VaerSkjema,
    utfall: UtfallSkjema,
    bedreTidsvindu: BedreTidsvinduSkjema.optional(),
  })
  .superRefine((v, ctx) => {
    const klasse = v.vaer.type === "vurdert" ? v.vaer.klasse : null;
    const fraradet = klasse === "fraradet";
    const darlig = klasse === "darlig";

    if ((v.utfall.type === "fraradet") !== fraradet) {
      ctx.addIssue({
        code: "custom",
        path: ["utfall", "type"],
        message: fraradet
          ? "FR-6: ved Værklasse frarådet er utfallet fraradet."
          : "FR-6: utfallet er fraradet bare ved Værklasse frarådet.",
      });
    }

    if ((v.bedreTidsvindu !== undefined) !== (darlig || fraradet)) {
      ctx.addIssue({
        code: "custom",
        path: ["bedreTidsvindu"],
        message:
          darlig || fraradet
            ? "FR-6: Bedre tidsvindu mangler ved Værklasse dårlig eller frarådet."
            : "FR-6: Bedre tidsvindu finnes bare ved Værklasse dårlig eller frarådet.",
      });
    }

    if (v.vaer.type === "vurdert" && (v.vaer.vaervarsling !== undefined) !== darlig) {
      ctx.addIssue({
        code: "custom",
        path: ["vaer", "vaervarsling"],
        message: darlig
          ? "FR-6: Værvarsling mangler ved Værklasse dårlig."
          : "FR-6: Værvarsling finnes bare ved Værklasse dårlig.",
      });
    }

    if (v.utfall.type === "turforslag") {
      v.utfall.kort.forEach((kort, i) => {
        if (kort.kart.nummer !== i + 1) {
          ctx.addIssue({
            code: "custom",
            path: ["utfall", "kort", i, "kart", "nummer"],
            message: `Turforslag ${i + 1} skal ha kart.nummer ${i + 1}, men har ${kort.kart.nummer}.`,
          });
        }
      });
    }
  });

export type Resultatvisning = z.infer<typeof ResultatvisningSkjema>;
export type Turkort = z.infer<typeof TurkortSkjema>;
export type Kriterium = z.infer<typeof KriteriumSkjema>;
export type Utfall = z.infer<typeof UtfallSkjema>;
export type Vaer = z.infer<typeof VaerSkjema>;
export type BedreTidsvindu = z.infer<typeof BedreTidsvinduSkjema>;
export type Kart = z.infer<typeof KartSkjema>;
export type DittSok = z.infer<typeof DittSokSkjema>;
