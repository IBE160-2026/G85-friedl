// Faste tekster i UI-et, ordrett fra EXPERIENCE.md › Faste tekster og Component Patterns.
// Tekster med domeneverdier (Turtid, klokkeslett, antall) lages i kjernen og kommer ferdige
// fra serveren: Høydemerknad, teksten under Alternativkortet, tipset ved Mørkevarsel og antallslinjen.

export const APPNAVN = "Turplanlegger";
export const OMRADE = "Moldemarka";

// --- Søk ---

export const SOK_OVERSKRIFT = "Hvor lenge vil du gå?";
export const SOK_INGRESS =
  "Si når du vil gå og hvor lang tid du har. Vi veier værmeldingen og foreslår opptil tre turer i Moldemarka som passer, og forteller hvorfor.";

export const ETIKETT = {
  turdag: "Turdag",
  starttidspunkt: "Starttidspunkt",
  tilgjengeligTid: "Tilgjengelig tid",
  vanskelighetsgrad: "Vanskelighetsgrad",
  opplevelsespreferanser: "Opplevelsespreferanser",
} as const;

export const HJELPETEKST = {
  starttidspunkt: "Hele kvarter, 06:00–22:00.",
  tilgjengeligTid: "Tid til selve turen, uten reise til og fra Startpunktet.",
  vanskelighetsgrad: "høyeste du vil gå",
  opplevelsespreferanser: "valgfritt, velg gjerne flere",
  iDagLast: "Etter kl. 22 kan du bare velge i morgen.",
} as const;

/** Vanskelighetsgrad som ord (G < B < R). */
export const VANSKELIGHETSGRAD = { G: "Enkel", B: "Middels", R: "Krevende" } as const;

export const PREFERANSE = { utsikt: "utsikt", vann: "vann" } as const;

/** Står under Starttidspunkt når verdien er «nå». */
export const NA = "nå";

export const FINN_TUR = "Finn tur";

/** Tilgjengelig navn på trinnknappene, for eksempel «Reduser Starttidspunkt med 15 min». */
export const reduserNavn = (felt: string) => `Reduser ${felt} med 15 min`;
export const okNavn = (felt: string) => `Øk ${felt} med 15 min`;

// --- Demomodus ---

export const DEMOMODUS = "DEMOMODUS";
export const VAERSCENARIO = "Værscenario:";
/** «nå» = man. 9. nov. 13:30 */
export const naErTekst = (naTekst: string) => `«nå» = ${naTekst}`;

export const UKJENT_DEMO_OVERSKRIFT = "Ukjent demo";
/** Panelet for en ukjent demo-ID. Lenkene til de gyldige demoene settes inn etter «Gyldige demoer: ». */
export const ukjentDemoTekst = (id: string) => `Ukjent demo: «${id}». Gyldige demoer: `;

// --- Resultat (brukes fra story 1.12) ---

export const ANSVARSMERKNAD =
  "Du har selv ansvaret for å vurdere forholdene. Værvurderingen er veiledende og vurderer ikke føre (snø, is, gjørme). Følg MET sine farevarsler.";

// --- Kreditering og bunntekst ---

/**
 * Krediteringen (FR-29): «Værdata: Data fra MET Norway · Turstier: Turrutebasen, Kartverket ·
 * Turer: morotur.no og Fjord Norway · Bakgrunnskart: © Kartverket». Delene med `lenke` åpner i ny fane.
 */
export const KREDITERING: readonly {
  etikett: string;
  tekst: string;
  lenke?: string;
}[] = [
  { etikett: "Værdata:", tekst: "Data fra MET Norway", lenke: "https://www.met.no/" },
  { etikett: "Turstier:", tekst: "Turrutebasen, Kartverket" },
  { etikett: "Turer:", tekst: "morotur.no og Fjord Norway" },
  { etikett: "Bakgrunnskart:", tekst: "© Kartverket", lenke: "https://www.kartverket.no/" },
];

/** Skjult tekst i lenker som åpner i ny fane, for skjermlesere. */
export const NY_FANE = " (åpnes i ny fane)";

export const BUNNTEKST = "Turplanlegger er en prototype for Moldemarka.";
