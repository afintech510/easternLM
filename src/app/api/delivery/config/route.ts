import { NextResponse } from "next/server";
import { getDeliveryRuntimeConfig } from "@/lib/data/delivery-config";

export async function GET() {
  const runtimeConfig = await getDeliveryRuntimeConfig();
  return NextResponse.json(runtimeConfig);
}
