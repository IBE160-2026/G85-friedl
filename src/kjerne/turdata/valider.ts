import { avstand, avstandTilLinjer, storsteHull, type Linje } from "./geometri";
import { rutesegmentNokkel, type Rutegeometri } from "./rutegeometri";
import { TurdatasettSkjema, type Tur } from "./skjema";

// FR-27: den automatiske kontrollen av Turdatasettet. Skjemaet tar felt og verdier (også
// høydemeter), og geometrisjekkene tar Rutesegmenter, hull og Startpunkt. Geometrisjekkene
// kjøres bare når skjemaet godtar dataene. En tom liste betyr at datasettet er gyldig.

/** Største tillatte hull mellom linjebitene i en Tur. */
export const MAKS_HULL_M = 50;
/** Største tillatte avstand fra Startpunktet til Turens linjer, pluss Adkomstens lengde. */
export const MAKS_STARTAVSTAND_M = 200;
/** To Startpunkter med ulike navn skal ligge minst så langt fra hverandre. */
export const MIN_AVSTAND_ULIKE_STARTPUNKTER_M = 100;

export type Avvik = {
  regel: "skjema" | "ukjent-rutesegment" | "hull" | "startpunkt" | "ulikt-startpunkt";
  turId?: string;
  melding: string;
};

const meter = (m: number) => `${Math.round(m)} m`;

/** turId for en skjemafeil under `turer[i]`, hvis Turen har en id. */
function turIdFraSti(data: unknown, sti: readonly PropertyKey[]): string | undefined {
  if (sti[0] !== "turer" || typeof sti[1] !== "number") return undefined;
  const turer = (data as { turer?: unknown } | null)?.turer;
  const tur = Array.isArray(turer) ? (turer[sti[1]] as { id?: unknown } | undefined) : undefined;
  return typeof tur?.id === "string" ? tur.id : undefined;
}

function startpunktLikt(a: Tur["startpunkt"], b: Tur["startpunkt"]): boolean {
  return a.navn === b.navn && a.lat === b.lat && a.lon === b.lon && a.koordinatkilde === b.koordinatkilde;
}

export function validerTurdatasett(data: unknown, geometri: Rutegeometri): Avvik[] {
  const resultat = TurdatasettSkjema.safeParse(data);
  if (!resultat.success) {
    return resultat.error.issues.map((issue) => {
      const turId = turIdFraSti(data, issue.path);
      const sti = issue.path.map(String).join(".") || "(roten)";
      return { regel: "skjema", ...(turId !== undefined && { turId }), melding: `${sti}: ${issue.message}` };
    });
  }

  const linjerPerSegment = new Map<string, Linje[]>(
    geometri.features.map((f) => [rutesegmentNokkel(f.properties), f.geometry.coordinates]),
  );
  const avvik: Avvik[] = [];

  for (const tur of resultat.data.turer) {
    const linjer: Linje[] = [];
    let ukjent = false;
    for (const segment of tur.rutesegmenter) {
      const segmentLinjer = linjerPerSegment.get(rutesegmentNokkel(segment));
      if (segmentLinjer === undefined) {
        ukjent = true;
        avvik.push({
          regel: "ukjent-rutesegment",
          turId: tur.id,
          melding: `Rutesegmentet ${segment.rutenummer} «${segment.rutenavn}» finnes ikke i rutegeometrien.`,
        });
      } else {
        linjer.push(...segmentLinjer);
      }
    }
    // Uten alle linjene ville hull og Startpunkt gi følgefeil.
    if (ukjent) continue;

    const hull = storsteHull(linjer);
    if (hull > MAKS_HULL_M) {
      avvik.push({
        regel: "hull",
        turId: tur.id,
        melding: `Største hull mellom linjebitene er ${meter(hull)}, grensen er ${MAKS_HULL_M} m.`,
      });
    }

    const grense = MAKS_STARTAVSTAND_M + (tur.adkomst?.lengde_m ?? 0);
    const startavstand = avstandTilLinjer(tur.startpunkt, linjer);
    if (startavstand > grense) {
      avvik.push({
        regel: "startpunkt",
        turId: tur.id,
        melding:
          `Startpunktet «${tur.startpunkt.navn}» ligger ${meter(startavstand)} fra Turens linjer, grensen er ${grense} m` +
          (tur.adkomst ? ` (Adkomst ${tur.adkomst.lengde_m} m + ${MAKS_STARTAVSTAND_M} m).` : "."),
      });
    }
  }

  // Samme sted, samme Startpunkt: like navn krever identisk Startpunkt.
  const forstePerNavn = new Map<string, Tur>();
  for (const tur of resultat.data.turer) {
    const forste = forstePerNavn.get(tur.startpunkt.navn);
    if (forste === undefined) {
      forstePerNavn.set(tur.startpunkt.navn, tur);
    } else if (!startpunktLikt(forste.startpunkt, tur.startpunkt)) {
      avvik.push({
        regel: "ulikt-startpunkt",
        turId: tur.id,
        melding: `Startpunktet «${tur.startpunkt.navn}» er ikke identisk med Startpunktet i ${forste.id}.`,
      });
    }
  }

  // Og omvendt: to ulike navn så nær hverandre er trolig samme sted.
  const forste = [...forstePerNavn.values()];
  for (let i = 0; i < forste.length; i++) {
    for (let j = i + 1; j < forste.length; j++) {
      const a = forste[i].startpunkt;
      const b = forste[j].startpunkt;
      const d = avstand(a, b);
      if (d < MIN_AVSTAND_ULIKE_STARTPUNKTER_M) {
        avvik.push({
          regel: "ulikt-startpunkt",
          turId: forste[j].id,
          melding: `Startpunktene «${a.navn}» og «${b.navn}» ligger ${meter(d)} fra hverandre, men har ulike navn.`,
        });
      }
    }
  }

  return avvik;
}
