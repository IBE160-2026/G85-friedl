import { lagSidedata } from "@/server/side";
import { SokSide } from "@/ui/SokSide";
import { UkjentDemo } from "@/ui/UkjentDemo";

// AD-14: siden rendres per forespørsel, aldri ferdig ved bygging. «Nå» og Søket skal ikke fryses i bygget.
export const dynamic = "force-dynamic";

/** Demo-ID-en fra `?demo=`, som i lesDemoId: den første verdien, eller `null` når parameteren mangler. */
function demoId(demo: string | string[] | undefined): string | null {
  if (demo === undefined) return null;
  return Array.isArray(demo) ? (demo[0] ?? null) : demo;
}

export default async function Forside({ searchParams }: PageProps<"/">) {
  const id = demoId((await searchParams).demo);
  const sidedata = lagSidedata(id);

  if ("feil" in sidedata) return <UkjentDemo id={id ?? ""} gyldigeDemoIder={sidedata.gyldigeDemoIder} />;
  return <SokSide sidedata={sidedata} />;
}
