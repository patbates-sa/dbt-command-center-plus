import { NextResponse } from "next/server";
import { getAppConfig, detectCapabilities } from "@/config/app";

export async function GET() {
  const config = getAppConfig();
  const capabilities = detectCapabilities(config);
  return NextResponse.json(capabilities);
}
