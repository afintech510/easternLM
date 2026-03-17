import { redirect } from "next/navigation";

export default function CacheRedirect() {
  redirect("/admin/settings?tab=cache");
}
