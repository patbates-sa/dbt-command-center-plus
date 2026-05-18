import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { getAppConfig } from "@/config/app";
import type { JiraTicket } from "@/types";

type ConnectedClient = {
  client: Client;
  transport: StdioClientTransport;
};

let cached: Promise<ConnectedClient> | null = null;

async function connect(): Promise<ConnectedClient> {
  const { jiraMcp } = getAppConfig();
  if (!jiraMcp) {
    throw new Error(
      "Jira MCP is not configured. Set JIRA_MCP_COMMAND (and JIRA_URL / JIRA_USERNAME / JIRA_API_TOKEN) in .env.local.",
    );
  }

  const transport = new StdioClientTransport({
    command: jiraMcp.command,
    args: jiraMcp.args,
    env: { ...process.env, ...jiraMcp.env } as Record<string, string>,
    stderr: "pipe",
  });

  const client = new Client(
    { name: "dbt-command-center", version: "0.1.0" },
    { capabilities: {} },
  );

  await client.connect(transport);
  return { client, transport };
}

async function getClient(): Promise<Client> {
  if (!cached) {
    cached = connect().catch((err) => {
      cached = null;
      throw err;
    });
  }
  const { client } = await cached;
  return client;
}

function extractText(result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) return "";
  return content
    .map((c) =>
      c && typeof c === "object" && "text" in c
        ? String((c as { text: unknown }).text ?? "")
        : "",
    )
    .join("\n");
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function pickString(obj: unknown, ...paths: string[][]): string | undefined {
  for (const path of paths) {
    let cur: unknown = obj;
    for (const key of path) {
      if (cur && typeof cur === "object" && key in (cur as object)) {
        cur = (cur as Record<string, unknown>)[key];
      } else {
        cur = undefined;
        break;
      }
    }
    if (typeof cur === "string" && cur.length > 0) return cur;
  }
  return undefined;
}

function normalizeIssue(raw: unknown, baseUrl?: string): JiraTicket | null {
  if (!raw || typeof raw !== "object") return null;
  const key = pickString(raw, ["key"]);
  if (!key) return null;

  const summary =
    pickString(raw, ["summary"], ["fields", "summary"]) ?? "";
  const description =
    pickString(raw, ["description"], ["fields", "description"]) ??
    pickString(raw, ["description", "text"], ["fields", "description", "text"]);

  const assignee = pickString(
    raw,
    ["assignee", "display_name"],
    ["assignee", "displayName"],
    ["assignee", "name"],
    ["fields", "assignee", "displayName"],
    ["fields", "assignee", "display_name"],
    ["fields", "assignee", "name"],
  );
  const reporter = pickString(
    raw,
    ["reporter", "display_name"],
    ["reporter", "displayName"],
    ["reporter", "name"],
    ["fields", "reporter", "displayName"],
    ["fields", "reporter", "display_name"],
    ["fields", "reporter", "name"],
  );

  return {
    key,
    summary,
    description,
    assignee: assignee && assignee !== "Unassigned" ? assignee : undefined,
    reporter,
    priority: pickString(
      raw,
      ["priority", "name"],
      ["fields", "priority", "name"],
    ),
    status: pickString(
      raw,
      ["status", "name"],
      ["fields", "status", "name"],
    ),
    resolution: pickString(
      raw,
      ["resolution", "name"],
      ["fields", "resolution", "name"],
    ),
    created: pickString(raw, ["created"], ["fields", "created"]),
    updated: pickString(raw, ["updated"], ["fields", "updated"]),
    dueDate: pickString(
      raw,
      ["due_date"],
      ["duedate"],
      ["fields", "duedate"],
    ),
    url: baseUrl ? `${baseUrl.replace(/\/$/, "")}/browse/${key}` : undefined,
  };
}

function extractIssueArray(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.issues)) return obj.issues;
    if (Array.isArray(obj.results)) return obj.results;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

export async function searchJiraTickets(jql?: string): Promise<JiraTicket[]> {
  const { jiraMcp } = getAppConfig();
  if (!jiraMcp) return [];

  const client = await getClient();
  const result = await client.callTool({
    name: jiraMcp.toolName,
    arguments: {
      jql: jql || jiraMcp.defaultJql,
      limit: 50,
      fields:
        "summary,description,status,priority,assignee,reporter,resolution,created,updated,duedate",
    },
  });

  const text = extractText(result);
  if (process.env.JIRA_MCP_DEBUG === "1") {
    console.log("[jira-mcp] raw response:", JSON.stringify(result));
    console.log("[jira-mcp] extracted text:", text.slice(0, 2000));
  }
  if (
    result &&
    typeof result === "object" &&
    (result as { isError?: boolean }).isError
  ) {
    throw new Error(text || "MCP tool returned an error");
  }
  const parsed = safeParseJson(text);
  const issues = extractIssueArray(parsed);
  const baseUrl = jiraMcp.env.JIRA_URL;

  return issues
    .map((i) => normalizeIssue(i, baseUrl))
    .filter((i): i is JiraTicket => i !== null);
}

export interface JiraTransition {
  id: string;
  name: string;
  toName?: string;
}

export async function getJiraTransitions(
  ticketKey: string,
): Promise<JiraTransition[]> {
  const { jiraMcp } = getAppConfig();
  if (!jiraMcp) throw new Error("Jira MCP is not configured.");
  const client = await getClient();
  const result = await client.callTool({
    name: "jira_get_transitions",
    arguments: { issue_key: ticketKey },
  });
  if (
    result &&
    typeof result === "object" &&
    (result as { isError?: boolean }).isError
  ) {
    throw new Error(extractText(result) || "MCP tool returned an error");
  }
  const parsed = safeParseJson(extractText(result));
  const list = Array.isArray(parsed)
    ? parsed
    : ((parsed as { transitions?: unknown })?.transitions as unknown);
  if (!Array.isArray(list)) return [];
  const out: JiraTransition[] = [];
  for (const t of list) {
    if (!t || typeof t !== "object") continue;
    const o = t as Record<string, unknown>;
    const id = o.id != null ? String(o.id) : null;
    const name = o.name != null ? String(o.name) : null;
    if (!id || !name) continue;
    const to = o.to as { name?: unknown } | undefined;
    out.push({
      id,
      name,
      toName: to?.name != null ? String(to.name) : undefined,
    });
  }
  return out;
}

export async function transitionJiraIssue(
  ticketKey: string,
  transitionId: string,
  comment?: string,
): Promise<void> {
  const { jiraMcp } = getAppConfig();
  if (!jiraMcp) throw new Error("Jira MCP is not configured.");
  const client = await getClient();
  const args: Record<string, unknown> = {
    issue_key: ticketKey,
    transition_id: transitionId,
  };
  if (comment) args.comment = comment;
  const result = await client.callTool({
    name: "jira_transition_issue",
    arguments: args,
  });
  if (
    result &&
    typeof result === "object" &&
    (result as { isError?: boolean }).isError
  ) {
    throw new Error(extractText(result) || "MCP tool returned an error");
  }
}

export async function updateJiraIssue(
  ticketKey: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const { jiraMcp } = getAppConfig();
  if (!jiraMcp) throw new Error("Jira MCP is not configured.");
  const client = await getClient();
  const result = await client.callTool({
    name: "jira_update_issue",
    arguments: { issue_key: ticketKey, fields: JSON.stringify(fields) },
  });
  if (
    result &&
    typeof result === "object" &&
    (result as { isError?: boolean }).isError
  ) {
    throw new Error(extractText(result) || "MCP tool returned an error");
  }
}

export async function addJiraComment(
  ticketKey: string,
  comment: string,
): Promise<void> {
  const { jiraMcp } = getAppConfig();
  if (!jiraMcp) {
    throw new Error("Jira MCP is not configured.");
  }

  const client = await getClient();
  const toolName = process.env.JIRA_MCP_COMMENT_TOOL_NAME || "jira_add_comment";
  const result = await client.callTool({
    name: toolName,
    arguments: { issue_key: ticketKey, body: comment },
  });

  if (
    result &&
    typeof result === "object" &&
    (result as { isError?: boolean }).isError
  ) {
    throw new Error(extractText(result) || "MCP tool returned an error");
  }
}
