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

// --- Resultat ---

export const ANSVARSMERKNAD =
  "Du har selv ansvaret for å vurdere forholdene. Værvurderingen er veiledende og vurderer ikke føre (snø, is, gjørme). Følg MET sine farevarsler.";

/** Overlinjene skrives i versaler av CSS (typography.overline), så skjermlesere leser vanlige ord. */
export const DITT_SOK = "Ditt søk";
export const ENDRE_SOK = "Endre søk";
/** Står i Ditt søk på PC når ingen Opplevelsespreferanse er valgt. */
export const INGEN_PREFERANSE = "ingen";
/** Flere Opplevelsespreferanser i Ditt søk: «utsikt og vann». */
export const preferanseliste = (preferanser: readonly string[]) => preferanser.join(" og ");

/** Værmangel-linjen (FR-13): tittelen i fet skrift, og forklaringen etter. */
export const VAERMANGEL = {
  tittel: "Været er ikke vurdert.",
  tekst: "Vi fikk ikke hentet Værmeldingen fra MET.",
} as const;

export const PASSER_FORDI = "Passer fordi";
export const BEGRUNNELSE = "Begrunnelse";
/** Begrunnelsen ordrett, i anførselstegn. */
export const sitat = (tekst: string) => `«${tekst}»`;

/** Ved Nummerstempelet: «1 av 3» over «Turforslag». */
export const TURFORSLAG = "Turforslag";
export const plassTekst = (nummer: number, antall: number) => `${nummer} av ${antall}`;

/** Foran kildens navn i kildelenken: «Kilde: morotur.no». */
export const KILDE = "Kilde:";

/** De korte etikettene på Kriterieradene, som får plass ved 360 px. */
export const RADETIKETT = { tid: "Tid", vaer: "Vær", onsker: "Ønsker", morke: "Mørke" } as const;
/** Det tilgjengelige navnet på Kriterieradene, med PRD-begrepene (EXPERIENCE.md › Voice and Tone). */
export const RADNAVN = {
  tid: "Turtid",
  vaer: "Værklasse",
  onsker: "Opplevelsespreferanser",
  morke: "Mørkevarsel",
} as const;
/** Tekstalternativet til Kriteriemerket (UX-DR24). */
export const MERKENAVN = { ok: "passer", "se-opp": "se opp", ingen: "ikke vurdert" } as const;
/** Skjult tekst for haken i en tekstlinje: «utsikt ✓» leses «utsikt: ja». */
export const HAKE_TEKST = ": ja";

/** Begrunnelsen på mobil og nettbrett er én kursiv linje: «Begrunnelse: «…»» (UX-DR27). */
export const BEGRUNNELSE_LINJE = "Begrunnelse:";

/**
 * Ditt søk på mobil og nettbrett er én linje av de ferdige feltene, skilt med « · », for eksempel
 * «I dag · 13:30 · 2 t · Middels · utsikt». Uten valgt Opplevelsespreferanse utelates det leddet.
 */
export const DITT_SOK_SKILLE = " · ";
export const dittSokLinje = (ledd: readonly string[]) => ledd.join(DITT_SOK_SKILLE);

// --- Stokken (mobil og nettbrett) ---

/** Det tilgjengelige navnet på Stokken: «Turforslag 1 av 3». */
export const stokkNavn = (nummer: number, antall: number) => `${TURFORSLAG} ${plassTekst(nummer, antall)}`;
/** Synlig tekst på «Neste»-knappen i Stokknavigasjonen. */
export const NESTE_TUR = "Neste tur";
/** Tilgjengelige navn på knappene i Stokknavigasjonen (UX-DR32). */
export const FORRIGE_TURFORSLAG = "Forrige Turforslag";
export const NESTE_TURFORSLAG = "Neste Turforslag";
/** Overskriften på Stokkoversikten, etter antall kort. Ved ett kort vises ingen Stokkoversikt. */
export const STOKKOVERSIKT = { 2: "Begge i stokken", 3: "Alle tre i stokken" } as const;

/** Plassholder for Alternativ og frarådet til visningene kommer i story 1.14 og 2.10. */
export const RESULTAT_KOMMER = "Visningen av dette Resultatet kommer snart.";

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
