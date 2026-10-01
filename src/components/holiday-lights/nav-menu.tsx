"use client";

import { useState } from "react";
import { HOLIDAY_LIGHTS } from "@/config/holiday-lights";
import { CtaButton } from "./cta-button";

export type NavLinkItem = { href: string; label: string; spark?: boolean };

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" style={{ fill: "var(--navy)" }} />
      <path d="M6 20 16 9l10 11" fill="none" style={{ stroke: "var(--acc)" }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="17" r="1.8" fill="#ff5148" />
      <circle cx="16" cy="12" r="1.8" fill="#ffd84d" />
      <circle cx="23" cy="17" r="1.8" fill="#46c46f" />
      <rect x="9" y="20" width="14" height="6" style={{ fill: "var(--acc)" }} />
    </svg>
  );
}

const Spark = () => (
  <svg className="spark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.2 6.3L21 10l-6.8 1.7L12 18l-2.2-6.3L3 10l6.8-1.7zM19 15l1 2.5 2.5 1-2.5 1L19 22l-1-2.5-2.5-1 2.5-1z" />
  </svg>
);

/** Sticky header with the burger menu. */
export function NavMenu({ links, homeHref = "#top" }: { links: NavLinkItem[]; homeHref?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <a className="brand" href={homeHref} aria-label={`${HOLIDAY_LIGHTS.brand}, home`}>
          <BrandMark />
          <span>
            <b>{HOLIDAY_LIGHTS.shortBrand}</b>
            <small>Long Island · Holiday Lighting</small>
          </span>
        </a>
        <nav className="links" aria-label="Main">
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.spark && <Spark />}
              {l.label}
            </a>
          ))}
        </nav>
        <CtaButton act="call" className="phone">{HOLIDAY_LIGHTS.phoneDisplay}</CtaButton>
        <CtaButton act="design" className="btn btn-gold">Get exact price</CtaButton>
        <button
          type="button"
          className="burger"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="menu"
          onClick={() => setOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>
      <div
        className="menu"
        id="menu"
        hidden={!open}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        {links.map((l) => (
          <a key={l.href} href={l.href}>{l.label}</a>
        ))}
      </div>
    </header>
  );
}
