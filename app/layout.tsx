import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "oppie.lab — opportunity research",
  description: "A compact, evidence-first dashboard for testing business ideas."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
