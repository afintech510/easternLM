import { Bodoni_Moda, Merriweather, Mountains_of_Christmas, Playpen_Sans } from "next/font/google";
import { Toast } from "@/components/holiday-lights/toast";
import { THEME_INIT_SCRIPT } from "@/components/holiday-lights/theme-toggle";
import "./tinsel.css";

// Headline (Tinsel Time)
const display = Mountains_of_Christmas({ variable: "--font-tinsel-display", weight: ["700"], subsets: ["latin"] });
// Section headings (Bodoni caps)
const heading = Bodoni_Moda({ variable: "--font-tinsel-heading", weight: ["900"], subsets: ["latin"] });
// Body copy
const body = Playpen_Sans({ variable: "--font-tinsel-body", weight: ["400", "500", "600"], subsets: ["latin"] });
// UI: buttons, labels, nav
const sans = Merriweather({ variable: "--font-tinsel-sans", weight: ["400", "700"], subsets: ["latin"] });

/**
 * Tinsel Time Long Island — a separate seasonal brand. LayoutShell skips the
 * Eastern LM header/footer for /holiday-lights, so this wrapper owns the chrome.
 * The wrapper carries data-theme/data-eff (light/dark toggle), set before paint by
 * THEME_INIT_SCRIPT — hence suppressHydrationWarning.
 */
export default function HolidayLightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-look="tacky"
      className={`tinsel ${display.variable} ${heading.variable} ${body.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      {children}
      <Toast />
    </div>
  );
}
