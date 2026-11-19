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

/** Den tomme kartflaten: mens kartet laster, og hvis det ikke kan vises. */
const TomFlate = () => <div className={stil.flate} data-testid="kart-laster" />;

const Kart = dynamic(() => import("./Kart").then((m) => m.Kart), {
  ssr: false,
  loading: TomFlate,
});

/** Feilgrensen rundt kartet. Ved en feil viser den den tomme kartflaten i stedet for kartet. */
export class KartFeilgrense extends Component<{ children: ReactNode }, { feil: boolean }> {
  state = { feil: false };

  static getDerivedStateFromError() {
    return { feil: true };
  }

  render() {
    return this.state.feil ? <TomFlate /> : this.props.children;
  }
}

export function KartLaster(props: KartProps) {
  return (
    <KartFeilgrense>
      <Kart {...props} />
    </KartFeilgrense>
  );
}
