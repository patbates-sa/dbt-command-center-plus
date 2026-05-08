import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const url =
    process.env.DBT_DISCOVERY_API_URL ||
    "https://metadata.cloud.getdbt.com/graphql";
  const token = process.env.DBT_CLOUD_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { errors: [{ message: "Discovery API not configured" }] },
      { status: 503 },
    );
  }

  const body = await req.text();
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
