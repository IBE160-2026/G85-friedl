import { readFileSync } from "node:fs";
import { crc32, deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { konverter, lesRutesegmenter, pakkUtGml, tilGeojson } from "./konverter-rutegeometri";

const ZIP = new URL("../data/raw/Friluftsliv_1506_Molde_25833_TurOgFriluftsruter_GML.zip", import.meta.url);
const GEOJSON = new URL("../data/rutegeometri.geojson", import.meta.url);

// Første linje i GML-fila (Vågsmyra båthavn), de to første punktene.
const POSLIST = "80656.77 6982718.69 80686.79 6982728.11";

function info(rutenummer: string, rutenavn: string, element = "FotruteInfo") {
  return `<app:${element}><app:rutenavn>${rutenavn}</app:rutenavn><app:rutenummer>${rutenummer}</app:rutenummer><app:gradering>G</app:gradering></app:${element}>`;
}

function medlem(infoer: string[], { srsName = "urn:ogc:def:crs:EPSG::25833", srsDimension = "2", posList = POSLIST } = {}) {
  return `<gml:featureMember><app:Fotrute gml:id="x">
    <app:senterlinje><gml:LineString gml:id="x-0" srsName="${srsName}" srsDimension="${srsDimension}">
      <gml:posList>${posList}</gml:posList>
    </gml:LineString></app:senterlinje>
    <app:fotruteInfo>${infoer.join("")}</app:fotruteInfo>
  </app:Fotrute></gml:featureMember>`;
}

const PUNKT = `<gml:featureMember><app:Tilrettelegging gml:id="p"><app:posisjon><gml:Point srsName="urn:ogc:def:crs:EPSG::25833" srsDimension="2"><gml:pos>1 2</gml:pos></gml:Point></app:posisjon></app:Tilrettelegging></gml:featureMember>`;

const gml = (...medlemmer: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><gml:FeatureCollection xmlns:app="a" xmlns:gml="g">${medlemmer.join("\n")}</gml:FeatureCollection>`;

/** En zip-fil med én fil, lagret med `metode` (0 lagret, 8 deflate). */
function lagZip(navn: string, innhold: string, metode: number): Buffer {
  const ukomprimert = Buffer.from(innhold, "utf8");
  const data = metode === 8 ? deflateRawSync(ukomprimert) : ukomprimert;
  const navnBytes = Buffer.from(navn, "utf8");
  const crc = crc32(ukomprimert);

  const lokalt = Buffer.alloc(30);
  lokalt.writeUInt32LE(0x04034b50, 0);
  lokalt.writeUInt16LE(metode, 8);
  lokalt.writeUInt32LE(crc, 14);
  lokalt.writeUInt32LE(data.length, 18);
  lokalt.writeUInt32LE(ukomprimert.length, 22);
  lokalt.writeUInt16LE(navnBytes.length, 26);

  const sentral = Buffer.alloc(46);
  sentral.writeUInt32LE(0x02014b50, 0);
  sentral.writeUInt16LE(metode, 10);
  sentral.writeUInt32LE(crc, 16);
  sentral.writeUInt32LE(data.length, 20);
  sentral.writeUInt32LE(ukomprimert.length, 24);
  sentral.writeUInt16LE(navnBytes.length, 28);
  sentral.writeUInt32LE(0, 42);

  const katalogStart = lokalt.length + navnBytes.length + data.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(sentral.length + navnBytes.length, 12);
  eocd.writeUInt32LE(katalogStart, 16);

  return Buffer.concat([lokalt, navnBytes, data, sentral, navnBytes, eocd]);
}

describe("lesRutesegmenter", () => {
  it("en linje i to FotruteInfo er med i begge Featurene", () => {
    const { rutesegmenter, utenRutenummer } = lesRutesegmenter(
      gml(medlem([info("1506_MM_0312", "Vardenveien"), info("1506_MM_0310", "Storlihytta_Varden")])),
    );
    expect(utenRutenummer).toBe(0);
    expect(rutesegmenter.map((s) => [s.rutenummer, s.rutenavn])).toEqual([
      ["1506_MM_0310", "Storlihytta_Varden"],
      ["1506_MM_0312", "Vardenveien"],
    ]);
    expect(rutesegmenter[0].linjer).toEqual(rutesegmenter[1].linjer);
    expect(rutesegmenter[0].linjer).toHaveLength(1);
  });

  it("regner om til WGS84 som [lon, lat] med 6 desimaler", () => {
    const { rutesegmenter } = lesRutesegmenter(gml(medlem([info("1506039", "Vågsmyra båthavn")])));
    const [[forste, andre]] = rutesegmenter[0].linjer;
    expect(forste).toEqual([6.779423, 62.733643]);
    expect(andre[0]).toBeGreaterThan(6.77);
    expect(andre[1]).toBeGreaterThan(62.73);
    for (const tall of [...forste, ...andre]) expect(Math.round(tall * 1e6) / 1e6).toBe(tall);
  });

  it("samme rutenummer med to rutenavn blir to Rutesegmenter, og linjene står i GML-rekkefølge", () => {
    const { rutesegmenter } = lesRutesegmenter(
      gml(
        medlem([info("1506_MM_0312", "Vardenveien")], { posList: "1 6900000 2 6900000" }),
        medlem([info("1506_MM_0312", "Øverlandsvatnet_Bergsvatnet")]),
        medlem([info("1506_MM_0312", "Vardenveien")], { posList: "3 6900000 4 6900000" }),
      ),
    );
    expect(rutesegmenter.map((s) => [s.rutenavn, s.linjer.length])).toEqual([
      ["Vardenveien", 2],
      ["Øverlandsvatnet_Bergsvatnet", 1],
    ]);
    expect(rutesegmenter[0].linjer[0][0][0]).toBeLessThan(rutesegmenter[0].linjer[1][0][0]);
  });

  it("sorterer på rutenummer og så rutenavn i kodepunktrekkefølge", () => {
    const { rutesegmenter } = lesRutesegmenter(
      gml(medlem([info("b", "x"), info("a", "Å"), info("a", "Z"), info("B", "y")])),
    );
    expect(rutesegmenter.map((s) => `${s.rutenummer} ${s.rutenavn}`)).toEqual(["B y", "a Z", "a Å", "b x"]);
  });

  it("tar med SykkelruteInfo og AnnenRuteInfo, og en linje med samme Rutesegment to ganger står der én gang", () => {
    const { rutesegmenter } = lesRutesegmenter(
      gml(medlem([info("1", "Kystruta", "SykkelruteInfo"), info("1", "Kystruta", "AnnenRuteInfo")])),
    );
    expect(rutesegmenter).toHaveLength(1);
    expect(rutesegmenter[0].linjer).toHaveLength(1);
  });

  it("tar med SkiløypeInfo (æøå i elementnavnet)", () => {
    const { rutesegmenter, utenRutenummer } = lesRutesegmenter(
      gml(medlem([info("Ski_20230628_02", "Kordalen", "SkiløypeInfo")])),
    );
    expect(utenRutenummer).toBe(0);
    expect(rutesegmenter.map((s) => s.rutenavn)).toEqual(["Kordalen"]);
  });

  it("hopper over linjer uten rutenummer og punktobjekter, og teller linjene", () => {
    const { rutesegmenter, utenRutenummer } = lesRutesegmenter(
      gml(medlem([]), PUNKT, medlem([info("1506_MM_0309", "Tusten")])),
    );
    expect(utenRutenummer).toBe(1);
    expect(rutesegmenter).toHaveLength(1);
  });

  it("dekoder XML-entiteter i rutenavn", () => {
    const { rutesegmenter } = lesRutesegmenter(gml(medlem([info("1", "Ut &amp; hjem &#229;")])));
    expect(rutesegmenter[0].rutenavn).toBe("Ut & hjem å");
  });

  it("kaster ved annen srsName", () => {
    expect(() => lesRutesegmenter(gml(medlem([info("1", "a")], { srsName: "urn:ogc:def:crs:EPSG::25832" })))).toThrow(
      /srsName/,
    );
  });

  it("kaster ved annen srsDimension", () => {
    expect(() => lesRutesegmenter(gml(medlem([info("1", "a")], { srsDimension: "3" })))).toThrow(/srsDimension/);
  });

  it("kaster ved ugyldig posList", () => {
    expect(() => lesRutesegmenter(gml(medlem([info("1", "a")], { posList: "1 2 3" })))).toThrow(/posList/);
  });
});

describe("tilGeojson", () => {
  it("én Feature per linje og linjeskift til slutt", () => {
    const tekst = tilGeojson([
      { rutenummer: "1", rutenavn: "a", linjer: [[[1, 2], [3, 4]]] },
      { rutenummer: "2", rutenavn: "b", linjer: [[[5, 6], [7, 8]]] },
    ]);
    expect(tekst).toBe(
      '{"type":"FeatureCollection","features":[\n' +
        '{"type":"Feature","properties":{"rutenummer":"1","rutenavn":"a"},"geometry":{"type":"MultiLineString","coordinates":[[[1,2],[3,4]]]}},\n' +
        '{"type":"Feature","properties":{"rutenummer":"2","rutenavn":"b"},"geometry":{"type":"MultiLineString","coordinates":[[[5,6],[7,8]]]}}\n' +
        "]}\n",
    );
  });
});

describe("pakkUtGml", () => {
  const innhold = gml(medlem([info("1", "Ålesund")]));

  it.each([
    ["lagret (metode 0)", 0],
    ["deflate (metode 8)", 8],
  ])("pakker ut %s", (_, metode) => {
    expect(pakkUtGml(lagZip("ruter.gml", innhold, metode))).toBe(innhold);
  });

  it("kaster ved annen komprimeringsmetode", () => {
    expect(() => pakkUtGml(lagZip("ruter.gml", innhold, 12))).toThrow(/metode 12/);
  });

  it("kaster når zip-fila ikke har en .gml-fil", () => {
    expect(() => pakkUtGml(lagZip("ruter.txt", innhold, 0))).toThrow(/\.gml/);
  });

  it("kaster ved feil CRC-32", () => {
    const zip = lagZip("ruter.gml", innhold, 0);
    zip[30 + "ruter.gml".length] ^= 0xff;
    expect(() => pakkUtGml(zip)).toThrow(/CRC-32/);
  });

  it("kaster når det ikke er en zip-fil", () => {
    expect(() => pakkUtGml(Buffer.from(innhold))).toThrow(/sentralkatalog/);
  });
});

describe("konverter", () => {
  it("tar med hvert rutenummer og rutenavn i GML-fila, og ingen linje hoppes over", () => {
    const gmlTekst = pakkUtGml(readFileSync(ZIP));
    const iGml = new Set(
      Array.from(
        gmlTekst.matchAll(/<app:rutenavn>([^<]*)<\/app:rutenavn>\s*<app:rutenummer>([^<]*)<\/app:rutenummer>/g),
        (m) => `${m[2]} ${m[1]}`,
      ),
    );
    const { rutesegmenter, utenRutenummer } = lesRutesegmenter(gmlTekst);
    expect(utenRutenummer).toBe(0);
    expect(new Set(rutesegmenter.map((s) => `${s.rutenummer} ${s.rutenavn}`))).toEqual(iGml);
  });

  it("gir den committede data/rutegeometri.geojson byte for byte", () => {
    expect(konverter(readFileSync(ZIP))).toBe(readFileSync(GEOJSON, "utf8"));
  });
});
