import type { Sidedata } from "@/kjerne/visning/sidedata";
import { Side } from "./Side";
import { SokFlate } from "./SokFlate";
import stil from "./SokSide.module.css";
import { SOK_INGRESS, SOK_OVERSKRIFT } from "./tekster";

// Søk (startsiden): forklaringen øverst og Skjemakortet under. Kartet over Moldemarka kommer i Epic 3,
// så til da bruker PC nettbrettoppsettet.

export function SokSide({ sidedata }: { sidedata: Sidedata }) {
  return (
    <Side demo={sidedata.demo}>
      <h1 className={stil.overskrift}>{SOK_OVERSKRIFT}</h1>
      <p className={stil.ingress}>{SOK_INGRESS}</p>
      <SokFlate skjema={sidedata.skjema} />
    </Side>
  );
}
