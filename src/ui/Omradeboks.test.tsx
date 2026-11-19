import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Omradeboks } from "./Omradeboks";

// Story 3.3: boksen på Søk-kartet viser «Moldemarka» og telleteksten slik sidedataene gir den. UI-et
// regner ikke ut tallene selv.

describe("Omradeboks", () => {
  it("viser telleteksten fra sidedataene, også når den er en annen", () => {
    for (const telletekst of ["12 Turer fra 8 Startpunkter", "1 Tur fra 1 Startpunkt"]) {
      const html = renderToString(<Omradeboks telletekst={telletekst} />);
      expect(html).toContain(`data-testid="telletekst">${telletekst}</p>`);
      expect(html).toContain(">Moldemarka</p>");
    }
  });

  it("er ikke skjult for skjermlesere, fordi telleteksten ikke står andre steder på Søk", () => {
    expect(renderToString(<Omradeboks telletekst="12 Turer fra 8 Startpunkter" />)).not.toContain("aria-hidden");
  });
});
