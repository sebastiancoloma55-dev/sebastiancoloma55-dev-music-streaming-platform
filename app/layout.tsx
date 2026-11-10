import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SONARA — Tu música, tu universo",
  description: "Descubre, guarda y disfruta música en una experiencia hecha para ti."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}