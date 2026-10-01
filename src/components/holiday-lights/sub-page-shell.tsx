import type { ReactNode } from "react";
import { HOLIDAY_LIGHTS } from "@/config/holiday-lights";
import { NavMenu } from "./nav-menu";
import { ReserveDialog } from "./reserve-dialog";

const BASE = HOLIDAY_LIGHTS.path;

/** Header + footer for Tinsel Time pages other than the landing page. */
export function SubPageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <NavMenu
        homeHref={BASE}
        links={[
          { href: `${BASE}#pricing`, label: "Pricing" },
          { href: `${BASE}#visualizer`, label: "AI Visualizer", spark: true },
          { href: `${BASE}#how`, label: "How it works" },
          { href: `${BASE}#area`, label: "Service area" },
          { href: `${BASE}#faq`, label: "FAQ" },
        ]}
      />
      <main>{children}</main>
      <footer className="site">
        <div className="wrap">
          <p className="legal" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
            © {HOLIDAY_LIGHTS.season} {HOLIDAY_LIGHTS.brand}, operated by {HOLIDAY_LIGHTS.operator}, 110 Frowein Road, Center
            Moriches, NY. <a href={`tel:${HOLIDAY_LIGHTS.phoneTel}`}>{HOLIDAY_LIGHTS.phoneDisplay}</a> ·{" "}
            <a href="/privacy-policy">Privacy</a> · <a href="/terms">Terms</a>
          </p>
        </div>
      </footer>
      <ReserveDialog />
    </>
  );
}
