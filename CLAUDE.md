<!-- dbt-command-center: jira-tasks -->

## Working from Jira tickets

This project receives Jira ticket context via files in `.jira/<TICKET-KEY>.md` (written by dbt Command Center when **Execute** is pressed on the Jira Tickets page).

When the user references a Jira ticket — or simply opens one of these files and asks you to work on it — follow ALL twelve steps below in order. Do not stop early just because the task appears complete; every step including 7, 8, 9, 10, 11, and 12 is required on every run.

1. Read the matching `.jira/<TICKET-KEY>.md` file. The **Description** section is the source request; the **Implementation steps** section is your task spec.
2. Implement the changes in this dbt project.
3. For every new block of code you add to a `.sql`, `.yml`, or `.yaml` file, prefix it with a comment referencing the ticket:
   - SQL:  `-- <TICKET-KEY>: <one-line context>`
   - YAML: `# <TICKET-KEY>: <one-line context>`
4. Do not annotate existing code you aren't modifying.
5. After completing the edits, open every file you modified as a tab in the active VS Code window so the user can review the changes. From the terminal, run `code -r <file>` for each modified file (one call per file is fine, or `git status -s | awk '{print $2}' | xargs -I {} code -r "{}"` to open everything at once).
6. Validate with `dbt build` or a targeted selector when finished.
7. Once all edits are done and the build passes, post a concise summary in the chat covering: (a) the ticket key and one-line goal, (b) every file changed with a one-sentence description of the change, (c) the validation command you ran and its result. Keep it to bullets, no preamble.
8. Post the same summary as a comment on the Jira ticket by sending it to dbt Command Center's local API. POST to `http://localhost:3000/api/jira/comment` with JSON body `{"ticketKey": "<TICKET-KEY>", "body": "<the same summary text>"}`. Use a heredoc or temp file when invoking `curl` so multi-line content is escaped safely. Example with a temp file:
   ```bash
   cat > /tmp/jira-comment.json <<'EOF'
   {"ticketKey": "<TICKET-KEY>", "body": "...summary text with\nnewlines..."}
   EOF
   curl -s -X POST -H 'Content-Type: application/json' --data @/tmp/jira-comment.json http://localhost:3000/api/jira/comment
   ```
   Confirm in the chat once the comment is posted.
9. **Required.** Immediately after step 8 succeeds, ask the user whether to commit. Do not end your turn until you have asked this. The prompt must be visually prominent — render it on its own with a level-3 heading and a bold question line, exactly like this:

   ```
   ### 🚦 Confirm commit & sync

   **Commit & sync these changes with message `<TICKET-KEY>: <short description of what changed>`? (y/n)**
   ```

   Then wait for the reply.
10. If the user answers yes (y/yes/Y), run `git add -A`, then `git commit -m '<TICKET-KEY>: <short description>'`, then `git push -u origin HEAD` to sync to origin. Report the commit hash and confirm the push succeeded, then proceed to step 11. If no, skip the commit and acknowledge — this is the last step (do not run steps 11 or 12).
11. **Required if step 10 produced a commit.** Immediately ask the user whether to open a pull request to merge into `main`. Do not end your turn until you have asked. The prompt must be visually prominent — render it on its own with a level-3 heading and a bold question line, exactly like this (substitute `<current-branch>` with the output of `git rev-parse --abbrev-ref HEAD`):

    ```
    ### 🔀 Open pull request

    **Open a pull request to merge `<current-branch>` into `main`? (y/n)**
    ```

    Then wait for the reply.
12. If the user answers yes (y/yes/Y), run `gh pr create --base main --fill` and report the PR URL (the branch is already pushed from step 10). If no, skip the PR and acknowledge. Either way, this is the last step.

<!-- /dbt-command-center: jira-tasks -->
