import type { Metadata } from "next";
import "./globals.css";
import TopNav from "./TopNav";
import { currentUser } from "../lib/supabase/server";

export const metadata: Metadata = {
  title: "oppie.lab — find a problem worth building",
  description: "Problems, the evidence behind them, who already pays for the work, and how ready each one is."
};

/** Applied before first paint so a dark preference never flashes white. */
const THEME_BOOT = `try{if(localStorage.getItem('oppie.lab.theme')==='dark'){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}`;

/**
 * The navigation is rendered only for a signed-in person, so the sign-in screen has no chrome
 * to click through.
 *
 * The redirect itself is not here: middleware.ts runs before this and is the boundary, because a
 * layout cannot be one. Next renders a route's page independently of its layout, so a check here
 * would decide which screen is sent without stopping the page's own work from running.
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();

  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        {user ? (
          <>
            <TopNav />
            {children}
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
