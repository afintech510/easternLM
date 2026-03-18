import { redirect } from "next/navigation";
export default function LegacyPOSSettings() { redirect("/admin/settings?tab=staff"); }
