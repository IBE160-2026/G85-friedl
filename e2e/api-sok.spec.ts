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

// Story 2.3: Værscenarioene med Værmelding følger med i bygget og svarer 200. Til story 2.8 kobler inn
// Værklassen, gir de «Været er ikke vurdert.».
for (const [demo, dato, start] of [
  ["uj-1", "2026-11-09", "13:30"],
  ["uj-3", "2026-11-14", "10:00"],
] as const) {
  test(`POST /api/sok?demo=${demo} svarer 200 med en gyldig Resultatvisning`, async ({ request }) => {
    const svar = await request.post(`/api/sok?demo=${demo}`, {
      data: { dato, start, tilgjengeligMin: 120, vanskelighetsgrad: "B", utsikt: true, vann: false },
    });
    expect(svar.status()).toBe(200);
    const visning = ResultatvisningSkjema.parse(await svar.json());
    expect(visning.sok).toMatchObject({ dato, start });
    expect(visning.justering).toBeUndefined();
    expect(visning.vaer.type).toBe("mangler");
  });
}
