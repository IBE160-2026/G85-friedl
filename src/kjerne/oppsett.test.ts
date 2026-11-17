import { describe, expect, it } from "vitest";
import { z } from "zod";

// Røyktest: Vitest kjører, aliaset og zod virker i kjernen.
const Skjema = z
  .object({
    navn: z.string().min(1),
    minutter: z.number().int().min(15).max(300),
  })
  .strict();

describe("oppsett", () => {
  it("godtar et gyldig objekt", () => {
    expect(Skjema.parse({ navn: "Tur", minutter: 120 })).toEqual({
      navn: "Tur",
      minutter: 120,
    });
  });

  it("avviser ukjente nøkler og ugyldige verdier", () => {
    expect(Skjema.safeParse({ navn: "Tur", minutter: 120, ekstra: 1 }).success).toBe(false);
    expect(Skjema.safeParse({ navn: "", minutter: 10 }).success).toBe(false);
  });
});
