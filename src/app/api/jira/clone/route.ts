import { NextResponse, type NextRequest } from "next/server";
import { getAppConfig } from "@/config/app";
import { createJiraIssue } from "@/lib/mcp/jira-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  sourceKey?: string;
  summary?: string;
  description?: string;
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
  if (!body?.summary) {
    return NextResponse.json(
      { error: "summary is required." },
      { status: 400 },
    );
  }
  if (!body.sourceKey) {
    return NextResponse.json(
      { error: "sourceKey is required." },
      { status: 400 },
    );
  }
  const projectKey = body.sourceKey.split("-")[0];
  if (!projectKey) {
    return NextResponse.json(
      { error: `Could not derive project key from "${body.sourceKey}".` },
      { status: 400 },
    );
  }

  const issueType = process.env.JIRA_CLONE_ISSUE_TYPE?.trim() || "Task";
  const today = new Date().toISOString().slice(0, 10);

  try {
    const { key } = await createJiraIssue({
      projectKey,
      issueType,
      summary: body.summary,
      description: body.description,
      dueDate: today,
    });
    return NextResponse.json({ ok: true, key });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to create clone: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }
}
