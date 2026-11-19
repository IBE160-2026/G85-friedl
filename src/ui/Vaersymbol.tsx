import type { Vaer } from "@/kjerne/visning/skjema";
import stil from "./Vaersymbol.module.css";

// Værsymbolet (DESIGN.md › Værsymbol, UX-DR17): METs ikon for symbolkoden med ordet ved siden av.
// Ikonet ligger lokalt i public/vaerikoner/ og er pynt for skjermlesere (tom `alt`). Ordet bærer meningen.
// Ikonet er 32 px, og 24 px på mobil og nettbrett. Har MET ikke ikon for koden, står bare ordet.

type VaersymbolData = NonNullable<Extract<Vaer, { type: "vurdert" }>["symbol"]>;

export function Vaersymbol({ symbol, className }: { symbol: VaersymbolData; className?: string }) {
  return (
    <span className={className ? `${stil.symbol} ${className}` : stil.symbol} data-testid="vaersymbol">
      {/* Et lite, statisk SVG fra public/. next/image gir ingenting her og krever egne regler for SVG. */}
      {symbol.ikonSti && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={stil.ikon} src={symbol.ikonSti} alt="" width={32} height={32} />
      )}
      <span>{symbol.ord}</span>
    </span>
  );
}
