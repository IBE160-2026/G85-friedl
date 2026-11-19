import { lesBegrunnelseForesporsel, svarPaBegrunnelse } from "@/server/begrunnelse";
import { erUkjentDemo, lagMiljo, lesDemoId } from "@/server/miljo";

// POST /api/begrunnelse (story 4.2, AD-12): 200 med `{ tekst: string | null }`, 400 for ukjent demo eller
// ugyldig forespørsel, og 500 for alt annet. Forespørsler logges ikke (AR-24), bare uventede feil.

export async function POST(request: Request): Promise<Response> {
  try {
    const miljo = lagMiljo(lesDemoId(request.url));
    if (erUkjentDemo(miljo)) return Response.json(miljo, { status: 400 });

    let data: unknown;
    try {
      data = await request.json();
    } catch {
      return Response.json(
        { feil: "ugyldig-sok", detaljer: [{ sti: "", melding: "Forespørselen er ikke gyldig JSON." }] },
        { status: 400 },
      );
    }

    const lest = lesBegrunnelseForesporsel(data);
    if ("feil" in lest) return Response.json(lest, { status: 400 });

    return Response.json(await svarPaBegrunnelse(lest.sok, lest.turId, miljo, request.signal));
  } catch (feil) {
    console.error("POST /api/begrunnelse feilet:", feil);
    return new Response(null, { status: 500 });
  }
}
