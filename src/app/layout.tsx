import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";

// next/font laster ned fonten ved bygg og serverer den fra vår egen origin (AD-15, NFR-6).
const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Turplanlegger",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb" className={nunitoSans.variable}>
      <body>{children}</body>
    </html>
  );
}
