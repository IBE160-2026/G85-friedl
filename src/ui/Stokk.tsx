"use client";

import { type CSSProperties, type KeyboardEvent, type PointerEvent, type Ref, useRef } from "react";
import type { Turkort as TurkortData } from "@/kjerne/visning/skjema";
import stil from "./Stokk.module.css";
import { Stokknavigasjon } from "./Stokknavigasjon";
import { stokkNavn } from "./tekster";
import { Turkort } from "./Turkort";

// Stokken på mobil og nettbrett (DESIGN.md › Stokken og Stokknavigasjon, EXPERIENCE.md › Stokken).
// Ett Turkort er synlig, det valgte. Bak det ligger én Stokk-kant per kort som er igjen bak det valgte,
// høyst to. Stokknavigasjonen står under, i tommelsonen.
//
// Alle kortene står i DOM-en, i samme rute i et grid, så Stokken er like høy som det høyeste kortet og
// ikke hopper når det blas. Bare det valgte er synlig og i tilgjengelighetstreet. De andre er
// `inert` og skjult: kortene foran det valgte har glidd ut til venstre, og kortene bak ligger i Stokken.
// Når valget endres, glir kortet ut og det neste løftes fram, med en CSS-transition på ca. 250 ms.
// Under «Reduser bevegelse» er den av (globals.css).
//
// Stokken er en region med navnet «Turforslag N av M» og kan få fokus. Da blar ← og →. Sveip er en
// snarvei: minst 50 px vannrett, og mer vannrett enn loddrett. Sveip forbi første eller siste kort
// gjør ingenting. Valgt kort eies av Resultatet.

/** Minste vannrette bevegelse som regnes som sveip, i px. */
const SVEIPTERSKEL = 50;
/** Bevegelse før Stokken fanger pekeren, i px. Et vanlig trykk fanges ikke. */
const FANGEGRENSE = 10;
/** Høyst to Stokk-kanter (components.stokk-kant.maxLayers). */
const MAKS_KANTER = 2;

type Props = {
  kort: readonly TurkortData[];
  /** Indeksen til det valgte kortet. */
  valgt: number;
  onVelg: (indeks: number) => void;
  /** Trykk på Kartutsnittet i et kort: rull til kartet. */
  onVisPaKartet?: () => void;
  /** Språkmodelltekstene etter `turId` (story 4.2). Et kort uten tekst viser Regelteksten. */
  begrunnelser?: ReadonlyMap<string, string>;
  /** Stokken selv, så Stokkoversikten kan flytte fokus hit. */
  ref?: Ref<HTMLElement>;
};

export function Stokk({ kort, valgt, onVelg, onVisPaKartet, begrunnelser, ref }: Props) {
  const antall = kort.length;
  const sveip = useRef<{ id: number; x: number; y: number } | null>(null);
  const kanter = Math.min(antall - 1 - valgt, MAKS_KANTER);

  function bla(retning: -1 | 1) {
    const ny = valgt + retning;
    if (ny >= 0 && ny < antall) onVelg(ny);
  }

  function tast(e: KeyboardEvent<HTMLElement>) {
    // Bare når Stokken selv har fokus. Fra en kontroll i kortet ville kortet blitt `inert` med fokuset i.
    if (e.target !== e.currentTarget) return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      bla(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      bla(1);
    }
  }

  function ned(e: PointerEvent<HTMLElement>) {
    if (!e.isPrimary || e.button !== 0) return;
    sveip.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  // Stokken fanger pekeren når den har flyttet seg litt. Da kommer slippet hit også utenfor Stokken, så
  // startpunktet aldri blir hengende. Fanges pekeren allerede ved `pointerdown`, sender nettleseren
  // klikket til Stokken i stedet for lenken, og kildelenken slutter å virke.
  function flytt(e: PointerEvent<HTMLElement>) {
    const start = sveip.current;
    if (!start || start.id !== e.pointerId || e.currentTarget.hasPointerCapture(e.pointerId)) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < FANGEGRENSE) return;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function opp(e: PointerEvent<HTMLElement>) {
    const start = sveip.current;
    sveip.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SVEIPTERSKEL || Math.abs(dx) <= Math.abs(dy)) return;
    bla(dx < 0 ? 1 : -1);
  }

  function avbryt() {
    sveip.current = null;
  }

  return (
    <div className={stil.stokkomrade}>
      <section
        ref={ref}
        className={stil.stokk}
        style={{ "--kanter": kanter } as CSSProperties}
        aria-label={stokkNavn(valgt + 1, antall)}
        tabIndex={0}
        onKeyDown={tast}
        onPointerDown={ned}
        onPointerMove={flytt}
        onPointerUp={opp}
        onPointerCancel={avbryt}
        onLostPointerCapture={avbryt}
        data-testid="stokk"
      >
        {Array.from({ length: kanter }, (_, k) => (
          <div
            key={k}
            className={`${stil.kant} ${k === 0 ? stil.kant1 : stil.kant2}`}
            aria-hidden="true"
            data-testid="stokk-kant"
          />
        ))}
        {kort.map((k, i) => {
          const plass = i < valgt ? stil.foran : i > valgt ? stil.bak : stil.valgt;
          return (
            <div
              key={k.turId}
              className={`${stil.plass} ${plass}`}
              inert={i !== valgt}
              data-testid={i === valgt ? "stokk-valgt" : undefined}
            >
              <Turkort
                kort={k}
                antall={antall}
                iStokken
                onVisPaKartet={onVisPaKartet}
                vises={i === valgt}
                begrunnelse={begrunnelser?.get(k.turId)}
              />
            </div>
          );
        })}
      </section>
      {antall > 1 && <Stokknavigasjon valgt={valgt} antall={antall} onVelg={onVelg} />}
    </div>
  );
}
