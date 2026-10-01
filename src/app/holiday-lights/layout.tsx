import { Fredoka, Mountains_of_Christmas } from "next/font/google";
import { Toast } from "@/components/holiday-lights/toast";
import "./tinsel.css";

const display = Mountains_of_Christmas({
  variable: "--font-tinsel-display",
  weight: ["700"],
  subsets: ["latin"],
});

const body = Fredoka({
  variable: "--font-tinsel-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

/**
 * Tinsel Time Long Island — a separate seasonal brand. LayoutShell skips the
 * Eastern LM header/footer for /holiday-lights, so this wrapper owns the chrome.
 */
export default function HolidayLightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-look="tacky" className={`tinsel ${display.variable} ${body.variable}`}>
      {children}
      <Toast />
    </div>
  );
}
