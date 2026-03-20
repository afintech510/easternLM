// Completely isolated POS layout — NO site header, footer, or nav
export const metadata = {
  title: "POS — ELM",
  robots: "noindex, nofollow",
};

export default function YardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {children}
    </div>
  );
}
