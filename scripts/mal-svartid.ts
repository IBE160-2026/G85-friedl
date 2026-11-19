import { chromium } from "@playwright/test";

// NFR-5 (story 1.15): Turforslag med Regeltekst vises innen 3 s etter trykk, med nettverksstrupingen
// «Fast 4G». Skriptet åpner ?demo=uten-vaer i Chromium ved 390 × 844 px (mobil), struper nettverket
// med CDP og trykker «Finn tur» med standard-Søket. Det måler tiden fra trykket til Regelteksten
// (Begrunnelsen) i et Turkort er synlig, i siden selv, én gang som oppvarming og så fem ganger, og
// skriver median og maks. Kommer Alternativet eller Kontaktfeil i stedet, stopper skriptet med feil.
//
// Kjør med `npm run svartid` eller `npm run svartid -- <url>`. Uten url måles Production.
// Node 26 fjerner typene selv, så skriptet trenger ingen transpiler.

const URL_STANDARD = "https://g85-friedl.vercel.app/?demo=uten-vaer";
const GRENSE_MS = 3_000;
const MALINGER = 5;

/**
 * «Fast 4G» slik Chrome DevTools definerer den (front_end/core/sdk/NetworkManager.ts):
 * 9 Mbit/s ned og 1,5 Mbit/s opp, begge × 0,9, og 60 ms × 2,75 = 165 ms ventetid.
 * CDP tar gjennomstrømningen i byte per sekund. Bare nettverket strupes, ikke CPU-en.
 */
const FAST_4G = {
  offline: false,
  latency: 60 * 2.75,
  downloadThroughput: ((9 * 1000 * 1000) / 8) * 0.9,
  uploadThroughput: ((1.5 * 1000 * 1000) / 8) * 0.9,
};

const url = process.argv[2] || URL_STANDARD;

/**
 * Kjøres i siden før trykket. Klokka startes når trykket kommer, og stoppes i første bilde der
 * Begrunnelsen i et Turkort er synlig. Synlig betyr også at opasiteten ikke er 0, fordi kortet i
 * Stokken tones inn. Viser siden Alternativet eller Kontaktfeil, avvises målingen med en gang.
 */
const MAL_I_SIDEN = `new Promise((ferdig, feil) => {
  let start = null;
  addEventListener("click", () => { if (start === null) start = performance.now(); }, { capture: true, once: true });
  const synlig = (el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const finnes = (velger) => [...document.querySelectorAll(velger)].some(synlig);
  const frist = performance.now() + 20000;
  const sjekk = () => {
    if (start !== null) {
      if (finnes('[data-testid="turkort"] [data-testid="begrunnelse"]')) return ferdig(performance.now() - start);
      if (finnes('[data-testid="alternativkort"]')) return feil(new Error("Siden viser Alternativet, ikke Turforslag"));
      if (finnes('[data-testid="kontaktfeil"]')) return feil(new Error("Siden viser Kontaktfeil, ikke Turforslag"));
    }
    if (performance.now() > frist) return feil(new Error("Ingen Turforslag med Regeltekst innen 20 s"));
    requestAnimationFrame(sjekk);
  };
  requestAnimationFrame(sjekk);
})`;

async function main() {
  const nettleser = await chromium.launch();
  try {
    const kontekst = await nettleser.newContext({ viewport: { width: 390, height: 844 } });
    const side = await kontekst.newPage();
    const cdp = await kontekst.newCDPSession(side);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", FAST_4G);

    const maal = async (): Promise<number> => {
      await side.goto(url, { waitUntil: "load" });
      const knapp = side.getByRole("button", { name: "Finn tur" });
      await knapp.waitFor();
      const svartid = side.evaluate<number>(MAL_I_SIDEN);
      // Feiler klikket, skal ikke det ventende løftet gi en ubehandlet avvisning.
      svartid.catch(() => {});
      await knapp.click();
      return await svartid;
    };

    console.log(`Måler ${url}`);
    console.log(
      `Fast 4G: ${FAST_4G.latency} ms ventetid, ${FAST_4G.downloadThroughput} B/s ned, ${FAST_4G.uploadThroughput} B/s opp`,
    );
    console.log(`Oppvarming: ${Math.round(await maal())} ms`);

    const tider: number[] = [];
    for (let i = 1; i <= MALINGER; i++) {
      const ms = await maal();
      tider.push(ms);
      console.log(`Måling ${i}: ${Math.round(ms)} ms`);
    }

    const sortert = [...tider].sort((a, b) => a - b);
    const midt = Math.floor(sortert.length / 2);
    const median = sortert.length % 2 === 1 ? sortert[midt] : (sortert[midt - 1] + sortert[midt]) / 2;
    const maks = sortert[sortert.length - 1];
    console.log(`Median: ${Math.round(median)} ms`);
    console.log(`Maks: ${Math.round(maks)} ms`);
    console.log(maks <= GRENSE_MS ? "Innenfor 3 s (NFR-5)." : "Over 3 s: NFR-5 er ikke oppfylt.");
    process.exitCode = maks <= GRENSE_MS ? 0 : 1;
  } finally {
    await nettleser.close();
  }
}

main().catch((feil: unknown) => {
  console.error(feil);
  process.exitCode = 1;
});
