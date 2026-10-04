"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Ideas" },
  { href: "/discover", label: "Discover" },
  { href: "/inbox", label: "Inbox" },
  { href: "/problems", label: "Tracked problems" }
];

export default function TopNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/ideas") : pathname.startsWith(href));

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          <span className="nav-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" focusable="false">
              <circle className="logo-ring" cx="16" cy="16" r="8.5" />
              <circle className="logo-signal" cx="16" cy="16" r="3" />
            </svg>
          </span>
          oppie.lab
        </Link>
        <div className="nav-links">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={`nav-link ${isActive(link.href) ? "active" : ""}`}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="nav-right">
          <ThemeToggle />
          {/* A plain form, so signing out needs no JavaScript and no client-side Supabase. */}
          <form action="/auth/signout" method="post">
            <button className="btn btn-sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
