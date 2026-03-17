// Bare layout for /yard/* — no sidebar, no admin chrome
export const metadata = {
  title: "Eastern LM — Yard Register",
  robots: "noindex, nofollow",
};

export default function YardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
