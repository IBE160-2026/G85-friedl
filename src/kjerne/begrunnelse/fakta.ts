import { km, meter } from "../format";
import { fraTekst } from "../turkort";
import type { Tur } from "../turdata/skjema";

// Fakta om Turen for Språkmodellteksten (FR-22, AD-12). En fast liste med felt, ferdig formatert med
// format.ts på samme måte som faktalinjen og Startpunkt-teksten i Turkortet, så tallene er like.
// Språkmodellen får bare Regelteksten og denne lista, og kontrollen godtar tall som står her.

/**
 * Fakta om Turen i fast rekkefølge: navn, Mål og «fra …», lengde totalt, høydemeter, høyeste punkt,
 * Vanskelighetsgrad, Startpunkt og Adkomst når den finnes. For eksempel
 * «Lengde totalt: 6,45 km» og «Høyeste punkt: 340 moh».
 */
export function lagTurfakta(tur: Tur): readonly string[] {
  return [
    `Navn: ${tur.navn}`,
    `Mål: ${tur.mal}, ${fraTekst(tur)}`,
    `Lengde totalt: ${km(tur.lengde_km_totalt)}`,
    `Stigning: ${meter(tur.hoydemeter)} høydemeter`,
    `Høyeste punkt: ${meter(tur.hoyeste_punkt_moh)} moh`,
    `Vanskelighetsgrad: ${tur.gradering_tekst}`,
    `Startpunkt: ${tur.startpunkt.navn}`,
    ...(tur.adkomst ? [`Adkomst: ca. ${meter(tur.adkomst.lengde_m)} m`] : []),
  ];
}
