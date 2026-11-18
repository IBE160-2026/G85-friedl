import type { ReactNode } from "react";
import type { Sidedata } from "@/kjerne/visning/sidedata";
import { Kreditering } from "./Kreditering";
import stil from "./Side.module.css";
import { BUNNTEKST } from "./tekster";
import { Toppfelt } from "./Toppfelt";

// Rammen rundt hver flate: Toppfelt øverst, innholdet, og Kreditering nederst i alle tilstander.
// Sidemargen følger DESIGN.md › Layout & Spacing: 16 px på mobil, 32 px på nettbrett og 48–64 px på PC.

type Props = { demo: Sidedata["demo"]; children: ReactNode };

export function Side({ demo, children }: Props) {
  return (
    <div className={stil.side}>
      <Toppfelt demo={demo} />
      <main className={stil.innhold}>{children}</main>
      <footer className={stil.bunn}>
        <Kreditering />
        <p className={stil.bunntekst}>{BUNNTEKST}</p>
      </footer>
    </div>
  );
}
