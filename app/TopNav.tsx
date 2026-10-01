"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import SignOut from "./SignOut";

const LINKS = [
  { href: "/", label: "Problems" },
  { href: "/inbox", label: "Inbox" },
  { href: "/companies", label: "Companies & numbers" },
  { href: "/opportunities", label: "Legacy board" }
];

export default function TopNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          <span className="nav-mark">o</span>
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
          <SignOut />
        </div>
      </div>
    </nav>
  );
}
