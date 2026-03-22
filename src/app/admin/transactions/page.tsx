import { ArrowRightLeft } from "lucide-react";

export default function TransactionsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <ArrowRightLeft className="size-10 text-muted-foreground/40" />
      <h1 className="text-xl font-semibold">Transactions</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        Transaction history and reconciliation is coming soon.
      </p>
    </div>
  );
}
