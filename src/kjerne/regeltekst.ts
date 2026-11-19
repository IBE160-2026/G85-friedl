import { meter, varighet } from "./format";
import type { Vaerklasse } from "./vaer/typer";

// Regelteksten (FR-20, Regeltekst-mønsteret i EXPERIENCE.md). Delene står i fast rekkefølge,
// skilt med «, », med liten forbokstav og uten punktum til slutt. Teksten nevner bare regler som
// slo inn, og samme input gir samme tekst. Teksten har ikke temperatur: den står i Værsammendraget og
// i Vær-raden. Delene for dårlig vær (3 og 4) kommer bare ved Værklasse dårlig, og bare når regelen
// slo inn.

/** Opplevelsespreferansene i fast rekkefølge (FR-5). */
export const OPPLEVELSESPREFERANSER = ["utsikt", "vann"] as const;

export type Opplevelsespreferanse = (typeof OPPLEVELSESPREFERANSER)[number];

/**
 * Været slik kortet og Regelteksten får det. `vurdert` har Værklassen for Tidsvinduet, værordene
 * («oppholdsvær og lite vind») og temperaturspennet («3–5 °C»), ferdig formatert.
 */
export type VaerGrunnlag =
  | { type: "mangler" }
  | { type: "vurdert"; klasse: Vaerklasse; vaerord: string; temperatur: string };

export type RegeltekstInput = {
  turtidMin: number;
  tilgjengeligMin: number;
  vaer: VaerGrunnlag;
  /** Turens høyeste punkt i moh. Står i del 3. */
  hoyestePunktMoh: number;
  /** Turen er en Lavtliggende tur. */
  lavtliggende: boolean;
  /** Egnet i dårlig vær fra Turdatasettet. `null` er ukjent. */
  egnetDarligVaer: boolean | null;
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
    case "vurdert":
      return vaer.vaerord;
  }
}

/**
 * Del 3 og 4: «lavtliggende tur (H moh)» og «egnet i dårlig vær», i den rekkefølgen. Bare ved
 * Værklasse dårlig, og bare de som slo inn. Vær-raden bruker de samme delene i «Øverst fordi: …».
 */
export function darligVaerDeler(
  input: Pick<RegeltekstInput, "vaer" | "hoyestePunktMoh" | "lavtliggende" | "egnetDarligVaer">,
): string[] {
  if (input.vaer.type !== "vurdert" || input.vaer.klasse !== "darlig") return [];
  const deler: string[] = [];
  if (input.lavtliggende) deler.push(`lavtliggende tur (${meter(input.hoyestePunktMoh)} moh)`);
  if (input.egnetDarligVaer === true) deler.push("egnet i dårlig vær");
  return deler;
}

/** Del 5: Opplevelsespreferansene som treffer, i rekkefølgen utsikt, vann, eller `null`. */
function preferanseDel(treff: readonly Opplevelsespreferanse[]): string | null {
  const iRekkefolge = OPPLEVELSESPREFERANSER.filter((p) => treff.includes(p));
  return iRekkefolge.length > 0 ? iRekkefolge.join(" og ") : null;
}

/**
 * Regelteksten for et Turforslag eller et Alternativ, for eksempel
 * «passer tiden din (1 t 32 min av 2 t), oppholdsvær og lite vind, utsikt».
 */
export function lagRegeltekst(input: RegeltekstInput): string {
  const { turtidMin, tilgjengeligMin, vaer, treff } = input;
  return [tidDel(turtidMin, tilgjengeligMin), vaerDel(vaer), ...darligVaerDeler(input), preferanseDel(treff)]
    .filter((del): del is string => del !== null)
    .join(", ");
}
