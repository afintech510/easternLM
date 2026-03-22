import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <Wrench className="size-10 text-muted-foreground/40" />
      <h1 className="text-xl font-semibold">Maintenance Scheduling</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        Maintenance job tracking and scheduling is coming soon.
      </p>
    </div>
  );
}
