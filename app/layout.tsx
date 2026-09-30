import type { Metadata } from "next";
import "./globals.css";
import TopNav from "./TopNav";

export const metadata: Metadata = {
  title: "oppie.lab — find a problem worth building",
  description: "Problems, the evidence behind them, who already pays for the work, and how ready each one is."
};

/** Applied before first paint so a dark preference never flashes white. */
const THEME_BOOT = `try{if(localStorage.getItem('oppie.lab.theme')==='dark'){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
