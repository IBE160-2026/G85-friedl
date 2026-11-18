import type { Ref } from "react";
import stil from "./Plassholderstokk.module.css";
import { FINNER_TURER } from "./tekster";

// Plassholderstokken (DESIGN.md › Plassholderstokk) mens Søket venter på svar: to tomme Stokk-kanter
// og en tom kortflate, med «Finner turer …» midt på. Ingen spinner. Den er ikke interaktiv.
//
// Plassholderstokken har `aria-busy`, fordi kortene kommer der. Den står i live-området i Resultatet,
// så «Finner turer …» meldes. Teksten får fokus fra koden (`tabIndex={-1}`), så fokuset ikke forsvinner
// når «Finn tur» tas bort.

export function Plassholderstokk({ tekstRef }: { tekstRef?: Ref<HTMLParagraphElement> }) {
  return (
    <div className={stil.omrade} aria-busy="true" data-testid="plassholderstokk">
      <div className={stil.stokk} aria-hidden="true">
        <div className={`${stil.kant} ${stil.kant2}`} data-testid="plassholder-kant" />
        <div className={`${stil.kant} ${stil.kant1}`} data-testid="plassholder-kant" />
        <div className={stil.flate} />
      </div>
      <p ref={tekstRef} tabIndex={-1} className={stil.tekst} data-testid="plassholder">
        {FINNER_TURER}
      </p>
    </div>
  );
}
