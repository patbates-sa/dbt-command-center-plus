import { NextResponse, type NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getAppConfig } from "@/config/app";
import { resolveLocalProject } from "@/lib/dbt/local-projects";
import {
  getJiraTransitions,
  transitionJiraIssue,
  updateJiraIssue,
} from "@/lib/mcp/jira-client";
import type { JiraTicket } from "@/types";

const IN_PROGRESS_KEYWORDS = ["in progress", "in-progress", "in_progress", "start", "start progress"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EditorTarget = "vscode" | "dbt-studio";

interface RequestBody {
  projectName?: string;
  ticket?: JiraTicket;
  editor?: EditorTarget;
}

const CLAUDE_SENTINEL_START = "<!-- dbt-command-center: jira-tasks -->";
const CLAUDE_SENTINEL_END = "<!-- /dbt-command-center: jira-tasks -->";
const COPILOT_SENTINEL_START = "<!-- dbt-command-center: jira-tasks -->";
const COPILOT_SENTINEL_END = "<!-- /dbt-command-center: jira-tasks -->";

function renderClaudeBlock(): string {
  return [
    CLAUDE_SENTINEL_START,
    "",
    "## Working from Jira tickets",
    "",
    "This project receives Jira ticket context via files in `.jira/<TICKET-KEY>.md` (written by dbt Command Center when **Execute** is pressed on the Jira Tickets page).",
    "",
    "When the user references a Jira ticket — or simply opens one of these files and asks you to work on it — follow ALL twelve steps below in order. Do not stop early just because the task appears complete; every step including 7, 8, 9, 10, 11, and 12 is required on every run.",
    "",
    "1. Read the matching `.jira/<TICKET-KEY>.md` file. The **Description** section is the source request; the **Implementation steps** section is your task spec.",
    "2. Implement the changes in this dbt project.",
    "3. For every new block of code you add to a `.sql`, `.yml`, or `.yaml` file, prefix it with a comment referencing the ticket:",
    "   - SQL:  `-- <TICKET-KEY>: <one-line context>`",
    "   - YAML: `# <TICKET-KEY>: <one-line context>`",
    "4. Do not annotate existing code you aren't modifying.",
    "5. After completing the edits, open every file you modified as a tab in the active VS Code window so the user can review the changes. From the terminal, run `code -r <file>` for each modified file (one call per file is fine, or `git status -s | awk '{print $2}' | xargs -I {} code -r \"{}\"` to open everything at once).",
    "6. Validate with `dbt build` or a targeted selector when finished.",
    "7. Once all edits are done and the build passes, post a concise summary in the chat covering: (a) the ticket key and one-line goal, (b) every file changed with a one-sentence description of the change, (c) the validation command you ran and its result. Keep it to bullets, no preamble.",
    "8. Post the same summary as a comment on the Jira ticket by sending it to dbt Command Center's local API. POST to `http://localhost:3000/api/jira/comment` with JSON body `{\"ticketKey\": \"<TICKET-KEY>\", \"body\": \"<the same summary text>\"}`. Use a heredoc or temp file when invoking `curl` so multi-line content is escaped safely. Example with a temp file:",
    "   ```bash",
    "   cat > /tmp/jira-comment.json <<'EOF'",
    "   {\"ticketKey\": \"<TICKET-KEY>\", \"body\": \"...summary text with\\nnewlines...\"}",
    "   EOF",
    "   curl -s -X POST -H 'Content-Type: application/json' --data @/tmp/jira-comment.json http://localhost:3000/api/jira/comment",
    "   ```",
    "   Confirm in the chat once the comment is posted.",
    "9. **Required.** Immediately after step 8 succeeds, ask the user whether to commit. Do not end your turn until you have asked this. The prompt must be visually prominent — render it on its own with a level-3 heading and a bold question line, exactly like this:",
    "",
    "   ```",
    "   ### 🚦 Confirm commit & sync",
    "",
    "   **Commit & sync these changes with message `<TICKET-KEY>: <short description of what changed>`? (y/n)**",
    "   ```",
    "",
    "   Then wait for the reply.",
    "10. If the user answers yes (y/yes/Y), run `git add -A`, then `git commit -m '<TICKET-KEY>: <short description>'`, then `git push -u origin HEAD` to sync to origin. Report the commit hash and confirm the push succeeded, then proceed to step 11. If no, skip the commit and acknowledge — this is the last step (do not run steps 11 or 12).",
    "11. **Required if step 10 produced a commit.** Immediately ask the user whether to open a pull request to merge into `main`. Do not end your turn until you have asked. The prompt must be visually prominent — render it on its own with a level-3 heading and a bold question line, exactly like this (substitute `<current-branch>` with the output of `git rev-parse --abbrev-ref HEAD`):",
    "",
    "    ```",
    "    ### 🔀 Open pull request",
    "",
    "    **Open a pull request to merge `<current-branch>` into `main`? (y/n)**",
    "    ```",
    "",
    "    Then wait for the reply.",
    "12. If the user answers yes (y/yes/Y), run `gh pr create --base main --fill` and report the PR URL (the branch is already pushed from step 10). If no, skip the PR and acknowledge. Either way, this is the last step.",
    "",
    CLAUDE_SENTINEL_END,
  ].join("\n");
}

async function ensureClaudeMd(projectRoot: string): Promise<void> {
  const claudePath = path.join(projectRoot, "CLAUDE.md");
  const block = renderClaudeBlock();

  let existing: string | null = null;
  try {
    existing = await fs.readFile(claudePath, "utf8");
  } catch {
    existing = null;
  }

  if (existing === null) {
    await fs.writeFile(claudePath, block + "\n", "utf8");
    return;
  }

  if (
    existing.includes(CLAUDE_SENTINEL_START) &&
    existing.includes(CLAUDE_SENTINEL_END)
  ) {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `${esc(CLAUDE_SENTINEL_START)}[\\s\\S]*?${esc(CLAUDE_SENTINEL_END)}`,
    );
    const updated = existing.replace(pattern, block);
    if (updated !== existing) {
      await fs.writeFile(claudePath, updated, "utf8");
    }
    return;
  }

  const sep = existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
  await fs.writeFile(claudePath, existing + sep + block + "\n", "utf8");
}

function renderCopilotBlock(): string {
  return [
    COPILOT_SENTINEL_START,
    "",
    "## Working from Jira tickets",
    "",
    "This project receives Jira ticket context via files in `.jira/<TICKET-KEY>.md` (written by dbt Command Center when **Execute** is pressed on the Jira Tickets page).",
    "",
    "When the user references a Jira ticket — or simply opens one of these files and asks you to work on it — follow ALL twelve steps below in order. Do not stop early just because the task appears complete; every step including 7, 8, 9, 10, 11, and 12 is required on every run.",
    "",
    "1. Read the matching `.jira/<TICKET-KEY>.md` file. The **Description** section is the source request; the **Implementation steps** section is your task spec.",
    "2. Implement the changes in this dbt project, using Copilot's edit / agent mode so the user can review each file change.",
    "3. For every new block of code you add to a `.sql`, `.yml`, or `.yaml` file, prefix it with a comment referencing the ticket:",
    "   - SQL:  `-- <TICKET-KEY>: <one-line context>`",
    "   - YAML: `# <TICKET-KEY>: <one-line context>`",
    "4. Do not annotate existing code you aren't modifying.",
    "5. After completing the edits, make sure every file you modified is open as a tab in the active editor window so the user can review the changes.",
    "6. Validate with `dbt build` or a targeted selector when finished.",
    "7. Once all edits are done and the build passes, post a concise summary in the chat covering: (a) the ticket key and one-line goal, (b) every file changed with a one-sentence description of the change, (c) the validation command you ran and its result. Keep it to bullets, no preamble.",
    "8. Post the same summary as a comment on the Jira ticket by sending it to dbt Command Center's local API. POST to `http://localhost:3000/api/jira/comment` with JSON body `{\"ticketKey\": \"<TICKET-KEY>\", \"body\": \"<the same summary text>\"}`. Use a heredoc or temp file when invoking `curl` so multi-line content is escaped safely. Example with a temp file:",
    "   ```bash",
    "   cat > /tmp/jira-comment.json <<'EOF'",
    "   {\"ticketKey\": \"<TICKET-KEY>\", \"body\": \"...summary text with\\nnewlines...\"}",
    "   EOF",
    "   curl -s -X POST -H 'Content-Type: application/json' --data @/tmp/jira-comment.json http://localhost:3000/api/jira/comment",
    "   ```",
    "   Confirm in the chat once the comment is posted.",
    "9. **Required.** Immediately after step 8 succeeds, ask the user whether to commit. Do not end your turn until you have asked this. The prompt must be visually prominent — render it on its own with a level-3 heading and a bold question line, exactly like this:",
    "",
    "   ```",
    "   ### 🚦 Confirm commit & sync",
    "",
    "   **Commit & sync these changes with message `<TICKET-KEY>: <short description of what changed>`? (y/n)**",
    "   ```",
    "",
    "   Then wait for the reply.",
    "10. If the user answers yes (y/yes/Y), run `git add -A`, then `git commit -m '<TICKET-KEY>: <short description>'`, then `git push -u origin HEAD` to sync to origin. Report the commit hash and confirm the push succeeded, then proceed to step 11. If no, skip the commit and acknowledge — this is the last step (do not run steps 11 or 12).",
    "11. **Required if step 10 produced a commit.** Immediately ask the user whether to open a pull request to merge into `main`. Do not end your turn until you have asked. The prompt must be visually prominent — render it on its own with a level-3 heading and a bold question line, exactly like this (substitute `<current-branch>` with the output of `git rev-parse --abbrev-ref HEAD`):",
    "",
    "    ```",
    "    ### 🔀 Open pull request",
    "",
    "    **Open a pull request to merge `<current-branch>` into `main`? (y/n)**",
    "    ```",
    "",
    "    Then wait for the reply.",
    "12. If the user answers yes (y/yes/Y), run `gh pr create --base main --fill` and report the PR URL (the branch is already pushed from step 10). If no, skip the PR and acknowledge. Either way, this is the last step.",
    "",
    COPILOT_SENTINEL_END,
  ].join("\n");
}

async function ensureCopilotInstructions(projectRoot: string): Promise<void> {
  const dir = path.join(projectRoot, ".github");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, "copilot-instructions.md");
  const block = renderCopilotBlock();

  let existing: string | null = null;
  try {
    existing = await fs.readFile(filePath, "utf8");
  } catch {
    existing = null;
  }

  if (existing === null) {
    await fs.writeFile(filePath, block + "\n", "utf8");
    return;
  }

  if (
    existing.includes(COPILOT_SENTINEL_START) &&
    existing.includes(COPILOT_SENTINEL_END)
  ) {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `${esc(COPILOT_SENTINEL_START)}[\\s\\S]*?${esc(COPILOT_SENTINEL_END)}`,
    );
    const updated = existing.replace(pattern, block);
    if (updated !== existing) {
      await fs.writeFile(filePath, updated, "utf8");
    }
    return;
  }

  const sep = existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
  await fs.writeFile(filePath, existing + sep + block + "\n", "utf8");
}

function renderMarkdown(t: JiraTicket): string {
  const lines: (string | null)[] = [
    `# ${t.key}: ${t.summary || "(no summary)"}`,
    "",
    `- **Status**: ${t.status || "—"}`,
    `- **Priority**: ${t.priority || "—"}`,
    `- **Assignee**: ${t.assignee || "—"}`,
    `- **Reporter**: ${t.reporter || "—"}`,
    `- **Resolution**: ${t.resolution || "—"}`,
    `- **Created**: ${t.created || "—"}`,
    `- **Updated**: ${t.updated || "—"}`,
    `- **Due Date**: ${t.dueDate || "—"}`,
    t.url ? `- **Jira**: ${t.url}` : null,
    "",
    "## Description",
    "",
    t.description?.trim() || "_(no description)_",
    "",
    "## Implementation steps",
    "",
    "1. Implement the changes described above in this dbt project.",
    "2. For every new block of code you add to a `.sql` or `.yml` / `.yaml` file, prefix it with a comment referencing this ticket:",
    `   - SQL:  \`-- ${t.key}: <one-line context>\``,
    `   - YAML: \`# ${t.key}: <one-line context>\``,
    "3. Do not annotate existing code that you aren't modifying.",
    "4. Validate with `dbt build` or an appropriate selector when finished.",
    "",
    "---",
    "",
    `> Generated by dbt Command Center on ${new Date().toISOString()}.`,
    "",
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}

export async function POST(req: NextRequest) {
  const { dbtProjectRoot } = getAppConfig();
  if (!dbtProjectRoot) {
    return NextResponse.json(
      { error: "DBT_PROJECT_ROOT is not set." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as RequestBody | null;
  if (!body?.projectName || !body.ticket?.key) {
    return NextResponse.json(
      { error: "Both projectName and ticket (with key) are required." },
      { status: 400 },
    );
  }

  const local = await resolveLocalProject(body.projectName);
  if (!local) {
    return NextResponse.json(
      {
        error: `No local dbt project under ${dbtProjectRoot} has a dbt_project.yml matching "${body.projectName}".`,
      },
      { status: 404 },
    );
  }

  const rootResolved = path.resolve(dbtProjectRoot);
  const localResolved = path.resolve(local.path);
  if (
    localResolved !== rootResolved &&
    !localResolved.startsWith(rootResolved + path.sep)
  ) {
    return NextResponse.json(
      { error: "Resolved project path escaped DBT_PROJECT_ROOT." },
      { status: 400 },
    );
  }

  const dir = path.join(localResolved, ".jira");
  await fs.mkdir(dir, { recursive: true });

  // Ignore .jira contents from git so we don't pollute commits.
  const ignorePath = path.join(dir, ".gitignore");
  await fs.writeFile(ignorePath, "*\n!.gitignore\n", "utf8").catch(() => {});

  const filePath = path.join(dir, `${body.ticket.key}.md`);

  let isFirstTime = false;
  try {
    await fs.stat(filePath);
  } catch {
    isFirstTime = true;
  }

  const warnings: string[] = [];

  if (isFirstTime) {
    try {
      const transitions = await getJiraTransitions(body.ticket.key);
      const inProgress = transitions.find((t) => {
        const candidates = [t.name, t.toName]
          .filter((s): s is string => !!s)
          .map((s) => s.toLowerCase());
        return candidates.some((c) => IN_PROGRESS_KEYWORDS.includes(c));
      });
      if (inProgress) {
        await transitionJiraIssue(body.ticket.key, inProgress.id);
      } else {
        warnings.push(
          `No 'In Progress' transition found for ${body.ticket.key} (available: ${transitions.map((t) => t.name).join(", ") || "none"}).`,
        );
      }
    } catch (err) {
      warnings.push(
        `Could not transition ${body.ticket.key} to In Progress: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const currentUser =
      process.env.JIRA_USERNAME || process.env.JIRA_API_USER || "";
    if (!currentUser) {
      warnings.push(
        "JIRA_USERNAME not set in .env.local — skipping assignee update.",
      );
    } else {
      try {
        await updateJiraIssue(body.ticket.key, { assignee: currentUser });
      } catch (err) {
        warnings.push(
          `Could not assign ${body.ticket.key} to ${currentUser}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  await fs.writeFile(filePath, renderMarkdown(body.ticket), "utf8");

  const editor: EditorTarget = body.editor === "dbt-studio" ? "dbt-studio" : "vscode";

  if (editor === "dbt-studio") {
    await ensureCopilotInstructions(localResolved);
  } else {
    await ensureClaudeMd(localResolved);
  }

  const editorCmd =
    editor === "dbt-studio"
      ? process.env.DBT_STUDIO_COMMAND || "dbt-studio"
      : process.env.EXECUTE_EDITOR_COMMAND || "code";

  const launch = await new Promise<{ ok: boolean; error?: string }>(
    (resolve) => {
      let settled = false;
      const settle = (r: { ok: boolean; error?: string }) => {
        if (!settled) {
          settled = true;
          resolve(r);
        }
      };
      try {
        const child = spawn(editorCmd, ["-n", localResolved, "-g", filePath], {
          detached: true,
          stdio: "ignore",
        });
        child.on("error", (err) =>
          settle({ ok: false, error: err.message }),
        );
        setTimeout(() => {
          child.unref();
          settle({ ok: true });
        }, 300);
      } catch (err) {
        settle({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  if (!launch.ok) {
    const hint =
      editor === "dbt-studio"
        ? `Install the dbt Studio CLI shell command (open dbt Studio → Command Palette → "Shell Command: Install 'dbt-studio' command in PATH") or set DBT_STUDIO_COMMAND in .env.local.`
        : `Install the VS Code shell command ("Cmd+Shift+P → Shell Command: Install 'code' command in PATH") or set EXECUTE_EDITOR_COMMAND in .env.local.`;
    return NextResponse.json(
      {
        error: `Wrote ${filePath} but failed to launch editor "${editorCmd}": ${launch.error}. ${hint}`,
        projectPath: localResolved,
        filePath,
      },
      { status: 500 },
    );
  }

  if (editor === "vscode") {
    // Best-effort: focus Claude Code's sidebar view in the new VS Code window
    // via the built-in workbench command. Fires ~3s after launch so the
    // window + extension have loaded.
    setTimeout(() => {
      try {
        const uri =
          "vscode://command/workbench.view.extension.claude-sidebar";
        const opener = spawn("open", [uri], {
          detached: true,
          stdio: "ignore",
        });
        opener.on("error", () => {});
        opener.unref();
      } catch {
        // ignore
      }
    }, 3000);
  }

  return NextResponse.json({
    projectPath: localResolved,
    filePath,
    isFirstTime,
    warnings,
  });
}
