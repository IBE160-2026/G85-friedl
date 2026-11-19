"use client";

import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import type { KartProps } from "./Kart";
import stil from "./Kart.module.css";

// Laster kartet bare på klienten (AR-19). Leaflet bruker `window` når det importeres, så Kart.tsx
// rendres aldri på serveren. Mens kartet laster, står en tom kartflate med samme høyde, så siden ikke
// hopper. leaflet.css importeres her, sammen med lasteren.
//
// Feiler lastingen (for eksempel når en del av koden ikke kan hentes), eller kaster kartet, står den
// tomme kartflaten igjen. Resten av Resultatet står som før, og alt kartet viser, står også i kortene.
//
// Det statiske kartet (`statisk`, story 3.2) lastes på samme måte, med samme feilgrense. Den tomme flaten
// fyller da flaten kartet står i, som Kartutsnittet eller Frarådet-kortet gir høyden.

/** Den tomme kartflaten: mens kartet laster, og hvis det ikke kan vises. */
const TomFlate = () => <div className={stil.flate} data-testid="kart-laster" />;
/** Den tomme flaten til det statiske kartet. */
const TomStatiskFlate = () => <div className={stil.statisk} data-testid="kart-statisk-laster" />;

const Kart = dynamic(() => import("./Kart").then((m) => m.Kart), {
  ssr: false,
  loading: TomFlate,
});

const StatiskKart = dynamic(() => import("./Kart").then((m) => m.Kart), {
  ssr: false,
  loading: TomStatiskFlate,
});

/** Feilgrensen rundt kartet. Ved en feil viser den den tomme kartflaten i stedet for kartet. */
export class KartFeilgrense extends Component<{ children: ReactNode; statisk?: boolean }, { feil: boolean }> {
  state = { feil: false };

  static getDerivedStateFromError() {
    return { feil: true };
  }

  render() {
    if (!this.state.feil) return this.props.children;
    return this.props.statisk ? <TomStatiskFlate /> : <TomFlate />;
  }
}

export function KartLaster(props: KartProps) {
  return (
    <KartFeilgrense statisk={props.statisk}>
      {props.statisk ? <StatiskKart {...props} /> : <Kart {...props} />}
    </KartFeilgrense>
  );
}
