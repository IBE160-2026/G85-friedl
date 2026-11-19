import type { Ref } from "react";
import stil from "./Kart.module.css";
import skjult from "./skjult.module.css";
import { BAKGRUNNSKART_FEIL } from "./tekster";

// Når bakgrunnskartet ikke laster (story 3.4, UX-DR39, AD-15). Flislaget i hvert kart har en flisvakt
// (`flisvakt`) som teller fliser som laster og feiler. Kartet får feiltilstanden når minst `FEILGRENSE`
// fliser har feilet, når en flis feiler før noen har lastet (en server som er helt nede, feiler fort), eller
// når ingen flis har lastet `FLISFRIST` ms etter at den første ble bedt om (forespørsler som henger). Den
// første flisen som laster, stopper fristen. Tilstanden nullstilles aldri: den gjelder til kartet lages på
// nytt. Kartet skjuler da flislaget og blir papirfarget, men ruter, Startpunkter, Mål og kontrollene står
// som før (Kart.tsx).
//
// Teksten «Bakgrunnskartet kunne ikke lastes.» står i en pille øverst i midten av det store kartet og
// Søk-kartet (`Bakgrunnsfeil`). Det statiske kartet i Kartutsnittet og på Frarådet-kortet har ikke plass til
// den, så der står den bare som skjult tekst for skjermlesere (`SkjultBakgrunnsfeil`), utenfor kartet, som
// er skjult for skjermlesere. Begge er `role="status"` som står fra start, så teksten leses når den kommer.
// Filen har ingen Leaflet, så den kan testes på serveren.

/** Så mange feilede fliser gir feiltilstanden, når noen fliser har lastet. Én enkelt feil tåles. */
export const FEILGRENSE = 3;
/** Så lenge (ms) etter den første forespørselen kan det gå uten at noen flis har lastet. */
export const FLISFRIST = 8000;

/**
 * Flisvakten til ett kart. `hendelser` gis til flislaget (`tileloadstart`, `tileload` og `tileerror`), og
 * `stopp` stopper fristen når kartet fjernes. `feilet` kalles høyst én gang.
 */
export function flisvakt(feilet: () => void) {
  let lastet = 0;
  let feil = 0;
  let ferdig = false;
  let frist: ReturnType<typeof setTimeout> | undefined;
  const stopp = () => {
    clearTimeout(frist);
    frist = undefined;
  };
  const meld = () => {
    if (ferdig) return;
    ferdig = true;
    stopp();
    feilet();
  };
  return {
    hendelser: {
      tileloadstart: () => {
        if (lastet === 0 && frist === undefined && !ferdig) frist = setTimeout(meld, FLISFRIST);
      },
      tileload: () => {
        lastet++;
        stopp();
      },
      tileerror: () => {
        feil++;
        if (lastet === 0 || feil >= FEILGRENSE) meld();
      },
    },
    stopp,
  };
}

/** Pillen øverst i midten av det interaktive kartet. Tom, og 0 px høy, når flisene laster. */
export function Bakgrunnsfeil({ feilet, ref }: { feilet: boolean; ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className={stil.bakgrunnsfeil} role="status">
      {feilet && (
        <span className={stil.feilpille} data-testid="kart-bakgrunn-feil">
          {BAKGRUNNSKART_FEIL}
        </span>
      )}
    </div>
  );
}

/** Teksten bare for skjermlesere, ved det statiske kartet. */
export function SkjultBakgrunnsfeil({ feilet }: { feilet: boolean }) {
  return (
    <span className={skjult.skjult} role="status" data-testid="kart-bakgrunn-feil-skjult">
      {feilet ? BAKGRUNNSKART_FEIL : ""}
    </span>
  );
}
