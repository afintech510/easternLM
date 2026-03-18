import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eastern LM — Point of Sale",
  robots: "noindex, nofollow",
};

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .pos-layout, .pos-layout * { scrollbar-width: none; }
        .pos-layout::-webkit-scrollbar, .pos-layout *::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="pos-layout h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
        {children}
      </div>
    </>
  );
}
