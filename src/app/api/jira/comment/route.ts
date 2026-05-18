import { NextResponse, type NextRequest } from "next/server";
import { addJiraComment } from "@/lib/mcp/jira-client";
import { getAppConfig } from "@/config/app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  ticketKey?: string;
  body?: string;
}

export async function POST(req: NextRequest) {
  const { jiraMcp } = getAppConfig();
  if (!jiraMcp) {
    return NextResponse.json(
      { error: "Jira MCP is not configured." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as RequestBody | null;
  if (!body?.ticketKey || !body?.body) {
    return NextResponse.json(
      { error: "Both ticketKey and body are required." },
      { status: 400 },
    );
  }

  try {
    const decorated = `The following actions have been taken:\n\n${body.body.trim()}`;
    await addJiraComment(body.ticketKey, decorated);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to add Jira comment: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }
}
