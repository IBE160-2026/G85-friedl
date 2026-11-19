import { expect, test } from "@playwright/test";
import { ResultatvisningSkjema } from "../src/kjerne/visning/skjema";

// Story 1.10: POST /api/sok mot den ekte Next-serveren, så route handleren og den statiske importen
// av data/rutegeometri.geojson (turbopack.rules i next.config.ts) blir prøvd utenfor Vitest.

test("POST /api/sok?demo=uten-vaer gir tre Turforslag for UJ-1", async ({ request }) => {
  const svar = await request.post("/api/sok?demo=uten-vaer", {
    data: {
      dato: "2026-11-09",
      start: "13:30",
      tilgjengeligMin: 120,
      vanskelighetsgrad: "B",
      utsikt: true,
      vann: false,
    },
  });
  expect(svar.status()).toBe(200);
  const visning = ResultatvisningSkjema.parse(await svar.json());
  expect(visning.overskrift).toBe("Tre Turforslag som passer tiden din");
});

// Story 2.3 og 2.8: Værscenarioene med Værmelding følger med i bygget, svarer 200 og gir Resultatet
// for Værklassen sin (FR-6). Alle Søk går med `?demo=`, så ingen test kaller MET. Testene sjekker
// tilstand og felt, ikke Turnavn.
const SOK = { tilgjengeligMin: 120, vanskelighetsgrad: "B", utsikt: true, vann: false } as const;

for (const { demo, sok, klasse, utfall, bedre } of [
  { demo: "uj-1", sok: { ...SOK, dato: "2026-11-09", start: "13:30" }, klasse: "god", utfall: "turforslag", bedre: null },
  {
    demo: "uj-2",
    sok: { ...SOK, dato: "2026-11-09", start: "10:00", tilgjengeligMin: 180, vanskelighetsgrad: "R" },
    klasse: "darlig",
    utfall: "turforslag",
    bedre: "funnet",
  },
  { demo: "uj-3", sok: { ...SOK, dato: "2026-11-14", start: "10:00" }, klasse: "fraradet", utfall: "fraradet", bedre: "funnet" },
  { demo: "ingen-bedre", sok: { ...SOK, dato: "2026-11-09", start: "10:00" }, klasse: "darlig", utfall: "turforslag", bedre: "ingen" },
] as const) {
  test(`POST /api/sok?demo=${demo} gir Værklasse ${klasse} med en gyldig Resultatvisning`, async ({ request }) => {
    const svar = await request.post(`/api/sok?demo=${demo}`, { data: sok });
    expect(svar.status()).toBe(200);
    const visning = ResultatvisningSkjema.parse(await svar.json());
    expect(visning.sok).toMatchObject({ dato: sok.dato, start: sok.start });
    expect(visning.justering).toBeUndefined();
    expect(visning.vaer).toMatchObject({ type: "vurdert", klasse });
    expect("vaervarsling" in visning.vaer).toBe(klasse === "darlig");
    expect(visning.utfall.type).toBe(utfall);
    expect(visning.bedreTidsvindu?.type ?? null).toBe(bedre);
    const varsling = visning.vaer.type === "vurdert" ? visning.vaer.vaervarsling : undefined;
    expect(visning.liveTekst).toBe(varsling ? `${visning.overskrift}. ${varsling.tittel}.` : visning.overskrift);
  });
}

test("POST /api/sok?demo=uj-3 med 15 min er frarådet, og Bedre tidsvindu tatt i bruk gir den korteste Turen", async ({
  request,
}) => {
  const forste = ResultatvisningSkjema.parse(
    await (
      await request.post("/api/sok?demo=uj-3", { data: { ...SOK, dato: "2026-11-14", start: "10:00", tilgjengeligMin: 15 } })
    ).json(),
  );
  expect(forste.utfall.type).toBe("fraradet");
  expect(forste.overskrift).toBe("Ingen Turforslag");
  if (forste.bedreTidsvindu?.type !== "funnet") throw new Error("Forventet et Bedre tidsvindu.");

  const andre = ResultatvisningSkjema.parse(
    await (await request.post("/api/sok?demo=uj-3", { data: forste.bedreTidsvindu.nyttSok })).json(),
  );
  expect(andre.sok).toEqual(forste.bedreTidsvindu.nyttSok);
  expect(andre.utfall.type).toBe("kortesteTur");
});
