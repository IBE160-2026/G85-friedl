import type { SidedataSvar } from "@/kjerne/visning/feil";
import { byggSidedata } from "@/kjerne/visning/lag-sidedata";
import { SidedataSkjema } from "@/kjerne/visning/sidedata";
import { TURER } from "./data";
import { erUkjentDemo, lagMiljo } from "./miljo";

// Sidens eneste datakilde (AD-18). Bare src/app/page.tsx importerer fila (lagregel AR-1).

/** Sidedataene for demo-ID-en (eller `null` uten demo), eller `UkjentDemoFeil`. */
export function lagSidedata(demoId: string | null): SidedataSvar {
  const miljo = lagMiljo(demoId);
  if (erUkjentDemo(miljo)) return miljo;
  return SidedataSkjema.parse(byggSidedata({ na: miljo.na, turer: TURER, demo: miljo.demo }));
}
