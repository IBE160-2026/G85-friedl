import { describe, expect, it } from "vitest";
import { kontrollerSprakmodelltekst } from "@/kjerne/begrunnelse/kontroll";
import { lagTurfakta } from "@/kjerne/begrunnelse/fakta";
import { lagStandardSok, type Sok } from "@/kjerne/sok";
import type { Resultatvisning } from "@/kjerne/visning/skjema";
import { TURER } from "@/server/data";
import { lagMiljo, type Miljo } from "@/server/miljo";
import { svarPaSok } from "@/server/sok";
import { DEMO_IDER } from "@/server/vaer/scenarioer";
import { falsk } from "./falsk";

// Den falske språkmodellen (story 4.2): deterministisk, og teksten består kontrollen for alle Turforslag
// i alle demoscenarioene, med standard-Søket, Søkene fra UJ og Bedre tidsvindu tatt i bruk.

const UJ1: Sok = { dato: "2026-11-09", start: "13:30", tilgjengeligMin: 120, vanskelighetsgrad: "B", utsikt: true, vann: false };
const UJ2: Sok = { dato: "2026-11-09", start: "10:00", tilgjengeligMin: 180, vanskelighetsgrad: "R", utsikt: true, vann: false };
const UJ3: Sok = { dato: "2026-11-14", start: "10:00", tilgjengeligMin: 120, vanskelighetsgrad: "B", utsikt: false, vann: false };

describe("falsk", () => {
  it("gir «Kort fortalt: …» med Regelteksten, og samme svar hver gang", async () => {
    const inn = { regeltekst: "passer tiden din (1 t 32 min av 2 t), værdata mangler", fakta: [] };
    expect(await falsk(inn)).toBe("Kort fortalt: passer tiden din (1 t 32 min av 2 t), værdata mangler.");
    expect(await falsk(inn)).toBe(await falsk(inn));
  });

  // Søkene per demo: standard-Søket og Søkene fra UJ som ikke justeres der (et justert Søk blir standard-
  // Søket), og Bedre tidsvindu tatt i bruk (`nyttSok`) der det finnes. `utfall` er det forventede utfallet.
  const STANDARD = "standard";
  type Rad = { sok: Sok | typeof STANDARD; utfall: string; nyttSok?: boolean };
  const SOKENE: Record<(typeof DEMO_IDER)[number], Rad[]> = {
    "uj-1": [{ sok: STANDARD, utfall: "turforslag" }, { sok: UJ1, utfall: "turforslag" }],
    "uj-2": [
      { sok: STANDARD, utfall: "turforslag" },
      { sok: UJ1, utfall: "turforslag", nyttSok: true },
      { sok: UJ2, utfall: "turforslag", nyttSok: true },
    ],
    "uj-3": [
      { sok: STANDARD, utfall: "fraradet", nyttSok: true },
      { sok: UJ3, utfall: "fraradet", nyttSok: true },
    ],
    "ingen-bedre": [
      { sok: STANDARD, utfall: "turforslag" },
      { sok: UJ1, utfall: "turforslag" },
      { sok: UJ2, utfall: "turforslag" },
    ],
    "uten-vaer": [{ sok: STANDARD, utfall: "turforslag" }, { sok: UJ1, utfall: "turforslag" }],
  };

  it.each(DEMO_IDER)("%s: teksten består kontrollen for hvert Turforslag", async (demoId) => {
    const miljo = lagMiljo(demoId) as Miljo;
    const resultater: Resultatvisning[] = [];
    for (const { sok, utfall, nyttSok } of SOKENE[demoId]) {
      const visning = await svarPaSok(sok === STANDARD ? lagStandardSok(miljo.na) : sok, miljo);
      expect(visning.justering).toBeUndefined();
      expect(visning.utfall.type).toBe(utfall);
      resultater.push(visning);
      if (nyttSok) {
        if (visning.bedreTidsvindu?.type !== "funnet") throw new Error("Forventet et Bedre tidsvindu.");
        const ny = await svarPaSok(visning.bedreTidsvindu.nyttSok, miljo);
        expect(ny.utfall.type).toBe("turforslag");
        resultater.push(ny);
      }
    }

    for (const visning of resultater) {
      if (visning.utfall.type !== "turforslag") continue;
      for (const kort of visning.utfall.kort) {
        const tur = TURER.find((t) => t.id === kort.turId)!;
        const fakta = lagTurfakta(tur);
        const tekst = await falsk({ regeltekst: kort.regeltekst, fakta });
        expect(tekst).not.toBeNull();
        const kontroll = kontrollerSprakmodelltekst(tekst!, kort.regeltekst, fakta);
        expect(kontroll, `${demoId}: ${tekst}`).toEqual({ godkjent: true });
      }
    }
  });
});
