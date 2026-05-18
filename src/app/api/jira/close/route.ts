import { NextResponse, type NextRequest } from "next/server";
import { getAppConfig } from "@/config/app";
import {
  addJiraComment,
  getJiraTransitions,
  transitionJiraIssue,
} from "@/lib/mcp/jira-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLOSE_KEYWORDS = ["closed", "close", "done", "resolved", "resolve"];

interface RequestBody {
  ticketKey?: string;
  comment?: string;
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
  if (!body?.ticketKey) {
    return NextResponse.json(
      { error: "ticketKey is required." },
      { status: 400 },
    );
  }

  try {
    const transitions = await getJiraTransitions(body.ticketKey);
    const close = transitions.find((t) => {
      const candidates = [t.name, t.toName]
        .filter((s): s is string => !!s)
        .map((s) => s.toLowerCase());
      return candidates.some((c) => CLOSE_KEYWORDS.includes(c));
    });
    if (!close) {
      return NextResponse.json(
        {
          error: `No close-style transition found for ${body.ticketKey}. Available: ${transitions
            .map((t) => t.name)
            .join(", ") || "(none)"}.`,
        },
        { status: 404 },
      );
    }
    if (body.comment) {
      await addJiraComment(body.ticketKey, body.comment);
    }
    await transitionJiraIssue(body.ticketKey, close.id);
    return NextResponse.json({ ok: true, transitionUsed: close.name });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to close ${body.ticketKey}: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }
}
