#!/usr/bin/env python3
"""Bygger oversikt.html fra konsept-*/konsept.json og SVG-ene ved siden av.

Kjør på nytt etter endringer i konseptene:  python3 lag-oversikt.py
"""
import json
from pathlib import Path

UX = Path(__file__).resolve().parent

SKJERMER = [
    ("1", "Søk", "pc-1-sok.svg", "mob-1-sok.svg"),
    ("2", "Godt vær (UJ-1)", "pc-2-godt-vaer.svg", "mob-2-godt-vaer.svg"),
    ("3a", "Dårlig vær (UJ-2)", "pc-3a-darlig-vaer.svg", "mob-3-darlig-vaer.svg"),
    ("3b", "Bedre tidsvindu + Mørkevarsel", "pc-3b-bedre-tidsvindu.svg", None),
    ("4", "Frarådet (UJ-3)", "pc-4-fraradet.svg", "mob-4-fraradet.svg"),
    ("5", "Ingen Tur passer, uten Værmelding", "pc-5-ingen-tur-uten-vaer.svg", "mob-5-ingen-tur-uten-vaer.svg"),
]


def last_konsepter():
    ut = []
    for mappe in sorted(UX.glob("konsept-[0-9][0-9]-*")):
        if not mappe.is_dir():
            continue
        fil = mappe / "konsept.json"
        try:
            k = json.loads(fil.read_text(encoding="utf-8"))
        except Exception as feil:  # vis konseptet likevel
            nr, slug = mappe.name.split("-", 2)[1:]
            k = {"nummer": int(nr), "slug": slug, "navn": slug, "ide": f"(konsept.json mangler eller er ugyldig: {feil})"}
        k["mappe"] = mappe.name
        k["filer"] = sorted(p.name for p in mappe.glob("*.svg"))
        ut.append(k)
    return sorted(ut, key=lambda k: k.get("nummer", 99))


SIDE = r"""<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Turplanlegger – 10 designkonsepter</title>
<style>
:root{
  --bg:#f4f2ee; --flate:#fffefb; --flate2:#ebe8e1; --tekst:#1d1f1c; --dempet:#5d625a;
  --linje:#d6d2c8; --aksent:#1f5f4a; --aksent-tekst:#fff; --skygge:0 1px 2px rgba(0,0,0,.06);
  --mono: ui-monospace, "SF Mono", Menlo, monospace;
}
@media (prefers-color-scheme: dark){
  :root{ --bg:#141614; --flate:#1d201d; --flate2:#262a26; --tekst:#ecebe6; --dempet:#a6aba2;
    --linje:#363b35; --aksent:#7fc8a9; --aksent-tekst:#0f1a15; --skygge:none; }
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--tekst);
  font:15px/1.5 -apple-system, "Helvetica Neue", "Segoe UI", sans-serif;}
header{padding:32px 24px 8px;max-width:1600px;margin:0 auto}
h1{font-size:28px;line-height:1.15;margin:0 0 6px;letter-spacing:-.01em}
.ingress{color:var(--dempet);max-width:80ch;margin:0}
.ingress a{color:inherit}
nav.faner{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--linje)}
.rad{max-width:1600px;margin:0 auto;padding:12px 24px;display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center}
.gruppe{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.gruppe > span{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--dempet);margin-right:4px}
button.valg{font:inherit;font-size:14px;min-height:40px;padding:6px 12px;border-radius:8px;border:1px solid var(--linje);
  background:var(--flate);color:var(--tekst);cursor:pointer}
button.valg[aria-pressed="true"]{background:var(--aksent);color:var(--aksent-tekst);border-color:var(--aksent)}
button.valg:focus-visible, .flis button:focus-visible{outline:3px solid var(--aksent);outline-offset:2px}
main{max-width:1600px;margin:0 auto;padding:20px 24px 64px}
.rutenett{display:grid;gap:20px;grid-template-columns:repeat(var(--kol,2),minmax(0,1fr))}
.flis{background:var(--flate);border:1px solid var(--linje);border-radius:12px;overflow:hidden;box-shadow:var(--skygge);display:flex;flex-direction:column}
.flis header{padding:12px 14px;margin:0;max-width:none;display:flex;gap:10px;align-items:baseline;border-bottom:1px solid var(--linje)}
.nr{font-family:var(--mono);font-size:13px;color:var(--dempet)}
.flis h3{margin:0;font-size:16px}
.flis .slag{color:var(--dempet);font-size:13px;margin-left:auto;text-align:right}
.bilde{background:var(--flate2);max-height:var(--maxh,760px);overflow:auto}
.flis button.apne{all:unset;display:block;cursor:zoom-in;width:100%}
.bilde img{display:block;width:100%;height:auto}
.mangler{padding:40px 16px;color:var(--dempet);text-align:center;font-size:14px}
.konsept{background:var(--flate);border:1px solid var(--linje);border-radius:12px;padding:22px;margin-bottom:22px}
.konsept h2{margin:0 0 2px;font-size:22px}
.konsept .slag{color:var(--dempet);margin:0 0 14px}
.to{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:24px}
@media (max-width:900px){.to{grid-template-columns:1fr}}
.konsept h4{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--dempet);margin:14px 0 4px}
.konsept p{margin:0}
.konsept ul{margin:0;padding-left:18px}
.palett{display:flex;flex-wrap:wrap;gap:8px}
.farge{display:flex;align-items:center;gap:6px;font-size:12px;font-family:var(--mono)}
.farge i{width:20px;height:20px;border-radius:4px;border:1px solid var(--linje);display:inline-block}
.stripe{display:flex;gap:10px;overflow-x:auto;padding:10px 0 4px;margin-top:14px;border-top:1px solid var(--linje)}
.stripe button{all:unset;cursor:zoom-in;flex:0 0 auto;text-align:center;font-size:11px;color:var(--dempet)}
.stripe img{display:block;height:150px;width:auto;border:1px solid var(--linje);border-radius:6px;background:var(--flate2);margin-bottom:4px}
.stripe button:focus-visible img{outline:3px solid var(--aksent)}
dialog{border:none;padding:0;max-width:100vw;max-height:100vh;width:100vw;height:100vh;background:rgba(10,12,10,.92);color:#eee}
dialog .topp{position:sticky;top:0;display:flex;gap:10px;align-items:center;padding:10px 16px;background:#111;z-index:2;flex-wrap:wrap}
dialog .topp strong{margin-right:auto}
dialog .topp button{font:inherit;min-height:40px;min-width:44px;padding:6px 12px;border-radius:8px;border:1px solid #444;background:#222;color:#eee;cursor:pointer}
dialog .lerret{overflow:auto;height:calc(100vh - 60px);display:flex;justify-content:center;padding:16px}
dialog img{max-width:none;height:auto;background:#fff;align-self:flex-start}
.skjult{display:none!important}
@media (max-width:700px){ header,.rad,main{padding-left:16px;padding-right:16px} h1{font-size:22px} }
</style>
</head>
<body>
<header>
  <h1>Turplanlegger: 10 designkonsepter</h1>
  <p class="ingress">Ti forskjellige svar på de samme skjermene og tilstandene, med de samme tallene fra PRD-en (UJ-1–UJ-3). Velg en skjerm og et format for å se konseptene side om side, eller bla i konseptene én om gangen. Klikk på en skisse for å se den i full størrelse. Med piltastene blar du til samme skjerm i neste konsept. Grunnlaget står i <a href="konsept-brief.md">konsept-brief.md</a>.</p>
</header>
<nav class="faner" aria-label="Visning">
  <div class="rad">
    <div class="gruppe" role="group" aria-label="Visning"><span>Visning</span>
      <button class="valg" data-visning="side" aria-pressed="true">Side om side</button>
      <button class="valg" data-visning="konsept" aria-pressed="false">Konseptene</button>
    </div>
    <div class="gruppe kun-side" role="group" aria-label="Skjerm" id="skjermvalg"><span>Skjerm</span></div>
    <div class="gruppe kun-side" role="group" aria-label="Format"><span>Format</span>
      <button class="valg" data-format="pc" aria-pressed="true">PC 1440</button>
      <button class="valg" data-format="mob" aria-pressed="false">Mobil 390</button>
    </div>
    <div class="gruppe kun-side" role="group" aria-label="Kolonner"><span>Kolonner</span>
      <button class="valg" data-kol="1" aria-pressed="false">1</button>
      <button class="valg" data-kol="2" aria-pressed="true">2</button>
      <button class="valg" data-kol="3" aria-pressed="false">3</button>
      <button class="valg" data-kol="5" aria-pressed="false">5</button>
    </div>
  </div>
</nav>
<main>
  <section id="side"><div class="rutenett" id="rutenett"></div></section>
  <section id="konsept" class="skjult"></section>
</main>
<dialog id="lysboks" aria-label="Skisse i full størrelse">
  <div class="topp">
    <strong id="lb-tittel"></strong>
    <button id="lb-forrige" aria-label="Forrige konsept">←</button>
    <button id="lb-neste" aria-label="Neste konsept">→</button>
    <button id="lb-lukk">Lukk</button>
  </div>
  <div class="lerret"><img id="lb-bilde" alt=""></div>
</dialog>
<script>
const KONSEPTER = __KONSEPTER__;
const SKJERMER = __SKJERMER__;
const tilstand = { visning:"side", skjerm:"2", format:"pc", kol:2 };
try { Object.assign(tilstand, JSON.parse(localStorage.getItem("ux-oversikt")||"{}")); } catch(e) {}
const lagre = () => { try { localStorage.setItem("ux-oversikt", JSON.stringify(tilstand)); } catch(e) {} };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function filFor(skjermId, format){
  const s = SKJERMER.find(x => x[0]===skjermId);
  if(!s) return null;
  return format==="pc" ? s[2] : (s[3] || null);
}
function skjermNavn(id){ const s = SKJERMER.find(x=>x[0]===id); return s ? s[1] : id; }

const skjermvalg = document.getElementById("skjermvalg");
SKJERMER.forEach(([id, navn]) => {
  const b = document.createElement("button");
  b.className = "valg"; b.dataset.skjerm = id; b.textContent = id + " · " + navn;
  skjermvalg.appendChild(b);
});

function tegnSide(){
  const r = document.getElementById("rutenett");
  r.style.setProperty("--kol", tilstand.kol);
  r.style.setProperty("--maxh", tilstand.format==="mob" ? "900px" : (tilstand.kol>=3 ? "520px" : "780px"));
  let fil = filFor(tilstand.skjerm, tilstand.format);
  const merknad = (!fil && tilstand.format==="mob") ? "Mobil: 3b er tegnet inn i 3a på mobil." : "";
  if(!fil) fil = filFor("3a","mob");
  r.innerHTML = KONSEPTER.map((k,i) => {
    const har = k.filer.includes(fil);
    return `<article class="flis">
      <header><span class="nr">${String(k.nummer).padStart(2,"0")}</span><h3>${esc(k.navn)}</h3><span class="slag">${esc(k.slagord||"")}</span></header>
      <div class="bilde">${har
        ? `<button class="apne" data-i="${i}" data-fil="${fil}" aria-label="Åpne ${esc(k.navn)}, ${esc(skjermNavn(tilstand.skjerm))} i full størrelse"><img loading="lazy" src="${k.mappe}/${fil}" alt="${esc(k.navn)}: ${esc(skjermNavn(tilstand.skjerm))}"></button>`
        : `<div class="mangler">${esc(fil)} mangler i dette konseptet</div>`}</div>
      ${merknad ? `<div class="mangler" style="padding:8px">${merknad}</div>`:""}
    </article>`;
  }).join("");
}

function liste(a){ return Array.isArray(a) && a.length ? `<ul>${a.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>` : "<p>–</p>"; }
function tegnKonsepter(){
  const el = document.getElementById("konsept");
  el.innerHTML = KONSEPTER.map((k,i) => {
    const pal = (k.palett||[]).map(p => `<span class="farge"><i style="background:${esc(p.hex)}"></i>${esc(p.navn)} ${esc(p.hex)}</span>`).join("");
    const rekke = SKJERMER.flatMap(([id,navn,pc,mob]) => [[id,navn,pc,"PC"],[id,navn,mob,"Mobil"]]).filter(x=>x[2] && k.filer.includes(x[2]));
    const beskr = k.skjermer || {};
    return `<article class="konsept" id="k${k.nummer}">
      <h2><span class="nr">${String(k.nummer).padStart(2,"0")}</span> ${esc(k.navn)}</h2>
      <p class="slag">${esc(k.slagord||"")}</p>
      <div class="to">
        <div>
          <h4>Idé</h4><p>${esc(k.ide)}</p>
          <h4>Anbefalingsøyeblikket</h4><p>${esc(k.anbefalingsoyeblikket)}</p>
          <h4>Mobil</h4><p>${esc(k.mobil)}</p>
          ${k.bevegelse ? `<h4>Bevegelse</h4><p>${esc(k.bevegelse)}</p>` : ""}
        </div>
        <div>
          <h4>Styrker</h4>${liste(k.styrker)}
          <h4>Risiko</h4>${liste(k.risiko)}
          <h4>Typografi</h4><p>${esc(k.typografi)}</p>
          <h4>Palett</h4><div class="palett">${pal || "–"}</div>
        </div>
      </div>
      <div class="stripe">${rekke.map(([id,navn,fil,fmt]) =>
        `<button data-i="${i}" data-fil="${fil}" title="${esc(beskr[fil]||"")}"><img loading="lazy" src="${k.mappe}/${fil}" alt="${esc(navn)} ${fmt}">${id} · ${fmt}</button>`).join("")}</div>
    </article>`;
  }).join("");
}

function oppdaterKnapper(){
  document.querySelectorAll("[data-visning]").forEach(b=>b.setAttribute("aria-pressed", b.dataset.visning===tilstand.visning));
  document.querySelectorAll("[data-skjerm]").forEach(b=>b.setAttribute("aria-pressed", b.dataset.skjerm===tilstand.skjerm));
  document.querySelectorAll("[data-format]").forEach(b=>b.setAttribute("aria-pressed", b.dataset.format===tilstand.format));
  document.querySelectorAll("[data-kol]").forEach(b=>b.setAttribute("aria-pressed", +b.dataset.kol===+tilstand.kol));
  document.querySelectorAll(".kun-side").forEach(g=>g.classList.toggle("skjult", tilstand.visning!=="side"));
  document.getElementById("side").classList.toggle("skjult", tilstand.visning!=="side");
  document.getElementById("konsept").classList.toggle("skjult", tilstand.visning!=="konsept");
}
function alt(){ oppdaterKnapper(); tegnSide(); lagre(); }

document.addEventListener("click", e => {
  const b = e.target.closest("button"); if(!b) return;
  if(b.dataset.visning){ tilstand.visning=b.dataset.visning; alt(); }
  else if(b.dataset.skjerm){ tilstand.skjerm=b.dataset.skjerm; alt(); }
  else if(b.dataset.format){ tilstand.format=b.dataset.format; alt(); }
  else if(b.dataset.kol){ tilstand.kol=+b.dataset.kol; alt(); }
  else if(b.dataset.fil){ apne(+b.dataset.i, b.dataset.fil); }
});

const lb = document.getElementById("lysboks"); let lbI=0, lbFil="";
function apne(i, fil){
  lbI=i; lbFil=fil; const k=KONSEPTER[i];
  document.getElementById("lb-bilde").src = k.mappe + "/" + fil;
  document.getElementById("lb-bilde").alt = k.navn + ": " + fil;
  document.getElementById("lb-tittel").textContent = String(k.nummer).padStart(2,"0") + " " + k.navn + " · " + fil;
  if(!lb.open) lb.showModal();
  lb.querySelector(".lerret").scrollTo(0,0);
}
function bla(d){
  for(let n=1;n<=KONSEPTER.length;n++){
    const j=(lbI + d*n + KONSEPTER.length*n) % KONSEPTER.length;
    if(KONSEPTER[j].filer.includes(lbFil)){ apne(j, lbFil); return; }
  }
}
document.getElementById("lb-forrige").onclick = () => bla(-1);
document.getElementById("lb-neste").onclick = () => bla(1);
document.getElementById("lb-lukk").onclick = () => lb.close();
lb.addEventListener("keydown", e => { if(e.key==="ArrowRight") bla(1); if(e.key==="ArrowLeft") bla(-1); });

tegnKonsepter(); alt();
</script>
</body>
</html>
"""


def main():
    konsepter = last_konsepter()
    side = SIDE.replace("__KONSEPTER__", json.dumps(konsepter, ensure_ascii=False)).replace(
        "__SKJERMER__", json.dumps(SKJERMER, ensure_ascii=False))
    (UX / "oversikt.html").write_text(side, encoding="utf-8")
    print(f"oversikt.html skrevet med {len(konsepter)} konsepter")
    for k in konsepter:
        print(f"  {k['mappe']}: {len(k['filer'])} SVG")


if __name__ == "__main__":
    main()
