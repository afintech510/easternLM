import { redirect } from "next/navigation";

export default function TrucksRedirect() {
  redirect("/admin/settings?tab=trucks");
}
