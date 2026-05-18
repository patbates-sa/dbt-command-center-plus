import { NextResponse, type NextRequest } from "next/server";
import { searchJiraTickets } from "@/lib/mcp/jira-client";
import { getAppConfig } from "@/config/app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { jiraMcp } = getAppConfig();
  if (!jiraMcp) {
    return NextResponse.json(
      { error: "Jira MCP is not configured." },
      { status: 503 },
    );
  }

  const params = req.nextUrl.searchParams;
  const rawQ = params.get("q")?.trim();
  const rawJql = params.get("jql")?.trim();

  let jql: string | undefined;
  if (rawJql) {
    jql = rawJql;
  } else if (rawQ) {
    const escaped = rawQ.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    jql = `text ~ "${escaped}" ORDER BY updated DESC`;
  }

  try {
    const tickets = await searchJiraTickets(jql);
    return NextResponse.json({ tickets });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Jira MCP call failed: ${message}` },
      { status: 502 },
    );
  }
}
