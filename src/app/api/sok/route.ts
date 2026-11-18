import { erUkjentDemo, lagMiljo, lesDemoId } from "@/server/miljo";
import { lesSok, svarPaSok } from "@/server/sok";

// POST /api/sok (AR-7, AD-17): 200 med Resultatvisningen, 400 for ukjent demo eller ugyldig Søk,
// og 500 for alt annet. Forespørsler logges ikke (AR-24), bare uventede feil.

export async function POST(request: Request): Promise<Response> {
  try {
    const miljo = lagMiljo(lesDemoId(request.url));
    if (erUkjentDemo(miljo)) return Response.json(miljo, { status: 400 });

    let data: unknown;
    try {
      data = await request.json();
    } catch {
      return Response.json(
        { feil: "ugyldig-sok", detaljer: [{ sti: "", melding: "Søket er ikke gyldig JSON." }] },
        { status: 400 },
      );
    }

    const lest = lesSok(data);
    if ("feil" in lest) return Response.json(lest, { status: 400 });

    return Response.json(await svarPaSok(lest.sok, miljo));
  } catch (feil) {
    console.error("POST /api/sok feilet:", feil);
    return new Response(null, { status: 500 });
  }
}
