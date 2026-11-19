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

/** Skjult etikett foran Tidsvinduet i Værsammendraget, for skjermlesere. */
export const TIDSVINDU = "Tidsvindu";

/** Værvarslingen (UX-DR19): forklaringen om rekkefølgen i Stokken, under verdiene. */
export const VAERVARSLING_FORKLARING =
  "Derfor står lavtliggende Turer og Turer som er egnet i dårlig vær øverst i stokken.";

export const PASSER_FORDI = "Passer fordi";
export const BEGRUNNELSE = "Begrunnelse";
/** Begrunnelsen ordrett, i anførselstegn. */
export const sitat = (tekst: string) => `«${tekst}»`;

/** Ved Nummerstempelet: «1 av 3» over «Turforslag». */
export const TURFORSLAG = "Turforslag";
export const plassTekst = (nummer: number, antall: number) => `${nummer} av ${antall}`;

/** Foran kildens navn i kildelenken: «Kilde: morotur.no». */
export const KILDE = "Kilde:";

/**
 * Knappen i foten på Turkortet på PC (story 3.5, DESIGN.md › Turkort punkt 10): «Vis på kartet» velger kortet,
 * og når kortet er valgt, står «Vises på kartet» med haken.
 */
export const VIS_PA_KARTET = { velg: "Vis på kartet", valgt: "Vises på kartet" } as const;

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

// --- Bedre tidsvindu og Frarådet ---

/** Overlinjen i Bedre tidsvindu-boksen, i versaler av CSS. */
export const BEDRE_TIDSVINDU = "Bedre tidsvindu";
/** Overlinjen ved stempelet «→» på Bedre tidsvindu-kortet: ALTERNATIV · BEDRE TIDSVINDU. */
export const ALTERNATIV_BEDRE_TIDSVINDU = { type: "Alternativ", tekst: "Bedre tidsvindu" } as const;

/** Ved stempelet «!» på Frarådet-kortet. */
export const INGEN_TURFORSLAG = "Ingen Turforslag";
/** Overlinjen over radene Vær og Tid på Frarådet-kortet, i versaler av CSS. */
export const DERFOR_INGEN_TUR = "Derfor ingen tur";
/** Lenken nederst på Frarådet-kortet. Den åpner i ny fane. */
export const MET_FAREVARSLER = {
  tekst: "Sjekk også MET sine farevarsler.",
  lenke: "https://www.met.no/vaer-og-klima/ekstremvaervarsler-og-andre-farevarsler",
} as const;

// --- Alternativ, Plassholder og Kontaktfeil ---

/** Ved stempelet «→» på Alternativkortet: «Alternativ · den korteste Turen». */
export const ALTERNATIV = { type: "Alternativ", tekst: "den korteste Turen" } as const;
/** Overlinjen på Alternativkortet, i versaler av CSS. */
export const SLIK_STAR_DEN = "Slik står den mot Søket ditt";
export const ENDRE_TILGJENGELIG_TID = "Endre Tilgjengelig tid";

/** Plassholderstokken mens Søket venter på svar. */
export const FINNER_TURER = "Finner turer …";

/** Kontaktfeil-kortet: ingen kontakt med appens server innen 10 s, nettverksfeil eller feil fra serveren. */
export const KONTAKTFEIL = {
  tittel: "Vi fikk ikke kontakt.",
  tekst: "Søket ditt er tatt vare på.",
  provIgjen: "Prøv igjen",
} as const;

// --- Kartet ---

/**
 * Tegnforklaringen og etiketten ved den valgte ruten (UX-DR36), og navnet på kartområdet, som
 * Kartutsnittet flytter fokus til.
 */
export const KART = {
  navn: "Kart",
  startpunkt: "Startpunkt",
  mal: "Mål",
  omtrentligRute: "omtrentlig rute",
} as const;
/** Teksten på kartet når flisene til bakgrunnskartet ikke laster (story 3.4, UX-DR39). */
export const BAKGRUNNSKART_FEIL = "Bakgrunnskartet kunne ikke lastes.";
/** Tilgjengelige navn på zoomknappene i kartet. */
export const ZOOM_INN = "Zoom inn";
export const ZOOM_UT = "Zoom ut";

/**
 * Kartutsnittet øverst i Turkortet og Alternativkortet på mobil og nettbrett (UX-DR38). Hele utsnittet er
 * én knapp med navnet «Vis på kartet». Merket øverst til venstre er «Turforslag N av M» (`stokkNavn`)
 * eller «Alternativ». Merket nederst er «omtrentlig rute · © Kartverket».
 */
export const KARTUTSNITT = {
  visPaKartet: "Vis på kartet",
  alternativ: "Alternativ",
  skille: " · ",
} as const;

// --- Kreditering og bunntekst ---

/** Krediteringen for bakgrunnskartet. Kartet viser «© Kartverket» som lenke i en pille nede til høyre. */
export const BAKGRUNNSKART = {
  etikett: "Bakgrunnskart:",
  tekst: "© Kartverket",
  lenke: "https://www.kartverket.no/",
} as const;

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
  BAKGRUNNSKART,
];

/** Skjult tekst i lenker som åpner i ny fane, for skjermlesere. */
export const NY_FANE = " (åpnes i ny fane)";

export const BUNNTEKST = "Turplanlegger er en prototype for Moldemarka.";
