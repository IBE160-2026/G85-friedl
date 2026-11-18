import type { ButtonHTMLAttributes } from "react";
import stil from "./Knapp.module.css";

// Knappene er piller (DESIGN.md › Knapper). Rust brukes aldri på knapper.

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primaer" | "sekundaer" | "tonet";
  /** Stor primærknapp (`heightLarge`), for eksempel «Finn tur». */
  stor?: boolean;
};

export function Knapp({ variant = "primaer", stor = false, className, type = "button", ...rest }: Props) {
  const klasser = [stil.knapp, stil[variant], stor ? stil.stor : null, className].filter(Boolean).join(" ");
  return <button type={type} className={klasser} {...rest} />;
}
