import { varighet } from "./format";

// Regelteksten (FR-20, Regeltekst-mønsteret i EXPERIENCE.md). Delene står i fast rekkefølge,
// skilt med «, », med liten forbokstav og uten punktum til slutt. Teksten nevner bare regler som
// slo inn, og samme input gir samme tekst. Delene for dårlig vær (lavtliggende tur, egnet i dårlig
// vær) og værordene kommer i story 2.7. Story 2.5 la bare `lavtliggende` og `egnetDarligVaer` til i
// `RangertTur`.

/** Opplevelsespreferansene i fast rekkefølge (FR-5). */
export const OPPLEVELSESPREFERANSER = ["utsikt", "vann"] as const;

export type Opplevelsespreferanse = (typeof OPPLEVELSESPREFERANSER)[number];

/**
 * Været slik kortet og Regelteksten får det. Bare `mangler` finnes til story 2.7 legger til
 * `vurdert` med Værklasse og værord.
 */
export type VaerGrunnlag = { type: "mangler" };

export type RegeltekstInput = {
  turtidMin: number;
  tilgjengeligMin: number;
  vaer: VaerGrunnlag;
  /** De valgte Opplevelsespreferansene Turen treffer. Rekkefølgen her betyr ikke noe. */
  treff: readonly Opplevelsespreferanse[];
};

/** «1 t 32 min av 2 t»: Turtid av Tilgjengelig tid. */
export function tidAvTilgjengelig(turtidMin: number, tilgjengeligMin: number): string {
  return `${varighet(turtidMin)} av ${varighet(tilgjengeligMin)}`;
}

/** Del 1: Tid. Turtid over Tilgjengelig tid gir teksten for Alternativkortet. */
function tidDel(turtidMin: number, tilgjengeligMin: number): string {
  const tid = tidAvTilgjengelig(turtidMin, tilgjengeligMin);
  if (turtidMin <= tilgjengeligMin) return `passer tiden din (${tid})`;
  return `passer ikke tiden din: trenger ${varighet(turtidMin - tilgjengeligMin)} mer (${tid})`;
}

/** Del 2: Vær. */
function vaerDel(vaer: VaerGrunnlag): string {
  switch (vaer.type) {
    case "mangler":
      return "værdata mangler";
  }
}

/** Del 5: Opplevelsespreferansene som treffer, i rekkefølgen utsikt, vann, eller `null`. */
function preferanseDel(treff: readonly Opplevelsespreferanse[]): string | null {
  const iRekkefolge = OPPLEVELSESPREFERANSER.filter((p) => treff.includes(p));
  return iRekkefolge.length > 0 ? iRekkefolge.join(" og ") : null;
}

/**
 * Regelteksten for et Turforslag eller et Alternativ, for eksempel
 * «passer tiden din (1 t 32 min av 2 t), værdata mangler, utsikt».
 */
export function lagRegeltekst({ turtidMin, tilgjengeligMin, vaer, treff }: RegeltekstInput): string {
  return [tidDel(turtidMin, tilgjengeligMin), vaerDel(vaer), preferanseDel(treff)]
    .filter((del): del is string => del !== null)
    .join(", ");
}
