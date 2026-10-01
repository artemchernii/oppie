import type { Metadata } from "next";
import "./globals.css";
import TopNav from "./TopNav";
import LockScreen from "./LockScreen";
import { hasValidSession } from "../lib/session";

export const metadata: Metadata = {
  title: "oppie.lab — find a problem worth building",
  description: "Problems, the evidence behind them, who already pays for the work, and how ready each one is."
};

/** Applied before first paint so a dark preference never flashes white. */
const THEME_BOOT = `try{if(localStorage.getItem('oppie.lab.theme')==='dark'){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}`;

/**
 * The gate sits here so no screen can be added without passing it — there is no page outside
 * this layout, and no route group to forget.
 *
 * Be clear about what this is, though. It decides which *screen* is sent, which is what a
 * single-user app wants. It is not the data boundary: Next renders a route's page
 * independently of its layout, so a page's own server work still runs for a locked request.
 * Anything that reads a record therefore calls `hasValidSession` itself, at the point of the
 * read. Gating the layout only is how a page ends up quietly unfenced.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const unlocked = hasValidSession();

  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        {unlocked ? (
          <>
            <TopNav />
            {children}
          </>
        ) : (
          <LockScreen />
        )}
      </body>
    </html>
  );
}
