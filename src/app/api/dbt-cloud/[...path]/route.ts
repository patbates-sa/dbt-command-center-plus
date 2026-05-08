import { NextRequest, NextResponse } from "next/server";

async function proxyRequest(
  req: NextRequest,
  params: { path: string[] },
  method: "GET" | "POST",
) {
  const baseUrl = process.env.DBT_CLOUD_BASE_URL || "https://cloud.getdbt.com";
  const accountId = process.env.DBT_CLOUD_ACCOUNT_ID;
  const token = process.env.DBT_CLOUD_API_TOKEN;

  if (!accountId || !token) {
    return NextResponse.json({ error: "dbt Cloud not configured" }, { status: 503 });
  }

  // path segments: ["v3", "projects"] or ["v2", "audit-logs"]
  const [version, ...rest] = params.path;
  const restPath = rest.join("/");
  const search = req.nextUrl.search;
  const target = `${baseUrl}/api/${version}/accounts/${accountId}/${restPath}${search}`;

  const isArtifact = rest.join("/").includes("artifacts/");
  const headers: Record<string, string> = {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
    Accept: isArtifact ? "*/*" : "application/json",
  };

  const init: RequestInit = { method, headers };
  if (method === "POST") {
    init.body = await req.text();
  }

  const upstream = await fetch(target, init);
  const body = await upstream.text();
  const contentType = upstream.headers.get("Content-Type") ?? "application/json";

  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": contentType },
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params, "GET");
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params, "POST");
}
