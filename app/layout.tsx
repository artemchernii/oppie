import type { Metadata } from "next";
import "./globals.css";
import TopNav from "./TopNav";

export const metadata: Metadata = {
  title: "oppie.lab — find a problem worth building",
  description: "Problems, the evidence behind them, who already pays for the work, and how ready each one is."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
