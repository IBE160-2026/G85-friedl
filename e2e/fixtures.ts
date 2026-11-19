import { crc32, deflateSync } from "node:zlib";
import { test as base, expect } from "@playwright/test";
import { KARTFLISER_URL } from "../src/ui/kart-data";

// Felles `test` og `expect` for alle e2e-filer (story 3.1, AR-20). En automatisk fixture stubber
// kartflisene fra Kartverket med en liten grå PNG for hele nettleserkonteksten, så ingen test kaller
// cache.kartverket.no. `kartfliser` er URL-ene til flisene som ble stubbet, i rekkefølge.

/** Opphavet til kartflisene (KARTFLISER_URL). Alle forespørsler hit stubbes. */
export const KARTFLISER = new URL(KARTFLISER_URL).origin;

/** En PNG-bit: lengde, type, data og CRC. */
function bit(type: string, data: Buffer): Buffer {
  const lengde = Buffer.alloc(4);
  lengde.writeUInt32BE(data.length);
  const innhold = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(innhold));
  return Buffer.concat([lengde, innhold, crc]);
}

/** En ensfarget grå PNG i gråtoner, `side` × `side` px, like stor som en kartflis. Den er ca. 370 byte. */
function graPng(side = 256, gra = 0xd9): Buffer {
  const hode = Buffer.alloc(13);
  hode.writeUInt32BE(side, 0);
  hode.writeUInt32BE(side, 4);
  hode[8] = 8; // 8 bit per piksel, fargetype 0 (gråtoner)
  // Hver rad starter med filterbyten 0.
  const rad = Buffer.concat([Buffer.from([0]), Buffer.alloc(side, gra)]);
  const piksler = deflateSync(Buffer.concat(Array.from({ length: side }, () => rad)), { level: 9 });
  const signatur = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signatur, bit("IHDR", hode), bit("IDAT", piksler), bit("IEND", Buffer.alloc(0))]);
}

const GRA_PNG = graPng();

export const test = base.extend<{ kartfliser: string[] }>({
  kartfliser: [
    async ({ context }, use) => {
      const urler: string[] = [];
      await context.route(`${KARTFLISER}/**`, (route) => {
        urler.push(route.request().url());
        return route.fulfill({ status: 200, contentType: "image/png", body: GRA_PNG });
      });
      await use(urler);
    },
    { auto: true },
  ],
});

export { expect, KARTFLISER_URL };
