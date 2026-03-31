import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ConfirmationClient } from "./confirmation-client";

/**
 * /app/confirmation — Server wrapper with Suspense for useSearchParams.
 */
export default function BulkConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-6 animate-spin text-bulk-sage" />
        </div>
      }
    >
      <ConfirmationClient />
    </Suspense>
  );
}
