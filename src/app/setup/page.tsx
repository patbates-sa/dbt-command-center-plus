"use client";

import { useState } from "react";
import {
  Settings,
  Key,
  Server,
  Database,
  BarChart3,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useCapabilities } from "@/lib/hooks/use-platform";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function CopyBlock({ content, label }: { content: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {label && (
        <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      )}
      <div className="rounded-md bg-zinc-950 border border-zinc-800 p-4 font-mono text-sm text-zinc-300 overflow-x-auto whitespace-pre">
        {content}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white hover:bg-zinc-800"
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <Check className="mr-1 h-3 w-3 text-green-400" />
            Copied
          </>
        ) : (
          <>
            <Copy className="mr-1 h-3 w-3" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}

function StatusIndicator({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-zinc-400 shrink-0" />
      )}
      <span className="text-sm font-medium">{label}</span>
      <Badge
        variant={ok ? "success" : "secondary"}
        className="ml-auto text-[10px]"
      >
        {ok ? "Connected" : "Not configured"}
      </Badge>
    </div>
  );
}

export default function SetupPage() {
  const { data: capabilities, isLoading } = useCapabilities();

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Connect to dbt Cloud
        </h1>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          Follow the steps below to connect this dashboard to your dbt Cloud
          project. All you need is a service token and your account ID.
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Connection Status
          </CardTitle>
          <CardDescription>
            Current status of your API connections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          ) : (
            <>
              <StatusIndicator
                ok={capabilities?.adminApi ?? false}
                label="Administrative API"
              />
              <StatusIndicator
                ok={capabilities?.discoveryApi ?? false}
                label="Discovery API"
              />
              <StatusIndicator
                ok={capabilities?.semanticLayer ?? false}
                label="Semantic Layer"
              />
              <StatusIndicator
                ok={capabilities?.artifacts ?? false}
                label="Artifacts"
              />
              <StatusIndicator
                ok={capabilities?.webhooks ?? false}
                label="Webhooks"
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 1: Create a Service Token */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" />
            Step 1 — Create a Service Token
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li>
              Log in to{" "}
              <span className="font-medium text-foreground">dbt Cloud</span>{" "}
              and go to{" "}
              <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                Account Settings &gt; Service Tokens
              </span>
            </li>
            <li>
              Click{" "}
              <span className="font-medium text-foreground">
                New Service Token
              </span>
            </li>
            <li>
              Give it a descriptive name (e.g.{" "}
              <span className="font-mono text-xs">command-center-readonly</span>
              )
            </li>
            <li>
              Assign the following permission sets:
              <ul className="mt-1.5 ml-6 list-disc space-y-1">
                <li>
                  <span className="font-medium text-foreground">
                    Account Admin
                  </span>{" "}
                  or{" "}
                  <span className="font-medium text-foreground">
                    Read-Only
                  </span>{" "}
                  (for projects, environments, jobs, runs)
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Metadata Only
                  </span>{" "}
                  (for Discovery API / catalog / lineage)
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Semantic Layer Only
                  </span>{" "}
                  (optional — for metric queries)
                </li>
              </ul>
            </li>
            <li>
              Copy the generated token — you will not be able to see it again.
            </li>
          </ol>

          <div className="flex items-start gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/5 p-3">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Keep your service token secure. Never commit it to version control.
              Use environment variables as shown below.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Find Your Account ID */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" />
            Step 2 — Find Your Account &amp; Environment IDs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              Your <span className="font-medium text-foreground">Account ID</span>{" "}
              is in the URL when you are logged in to dbt Cloud:
            </p>
            <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs">
              https://cloud.getdbt.com/deploy/<span className="text-primary font-bold">12345</span>/projects/...
            </div>
            <p>
              Your <span className="font-medium text-foreground">Environment ID</span>{" "}
              can be found by navigating to a project&apos;s environment settings.
              The ID is in the URL:
            </p>
            <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs">
              .../environments/<span className="text-primary font-bold">67890</span>
            </div>
            <p>
              Use the <span className="font-medium text-foreground">production environment ID</span>{" "}
              as your default — this gives the Discovery API access to the
              latest applied state of your project.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Configure .env.local */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Step 3 — Configure Environment Variables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create or update the{" "}
            <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              .env.local
            </span>{" "}
            file in the project root with these values:
          </p>

          <CopyBlock
            label="Required — Core API access"
            content={`# dbt Cloud API (required)
DBT_CLOUD_API_TOKEN=your_service_token_here
DBT_CLOUD_ACCOUNT_ID=12345
DBT_CLOUD_BASE_URL=https://cloud.getdbt.com

# Discovery API (required for catalog, lineage)
DBT_DISCOVERY_API_URL=https://metadata.cloud.getdbt.com/graphql

# Default environment (required for catalog, lineage, metrics)
DBT_DEFAULT_ENVIRONMENT_ID=67890`}
          />

          <CopyBlock
            label="Optional — Semantic Layer and Webhooks"
            content={`# Semantic Layer (optional)
DBT_SEMANTIC_LAYER_URL=https://semantic-layer.cloud.getdbt.com/api/graphql
DBT_SEMANTIC_LAYER_TOKEN=your_semantic_layer_token

# Default project ID (optional — auto-detected from API)
DBT_DEFAULT_PROJECT_ID=

# Webhook secret (optional — for real-time updates)
DBT_WEBHOOK_SECRET=`}
          />

          <div className="flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              After saving your <span className="font-mono">.env.local</span>,
              restart the development server with{" "}
              <span className="font-mono">npm run dev</span> for the changes to
              take effect.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Restart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4" />
            Step 4 — Restart and Verify
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Restart the dev server and return to this page. The connection status
            panel above will show green indicators for each successfully
            configured API.
          </p>
          <CopyBlock content="npm run dev" />
          <p className="text-sm text-muted-foreground">
            Once the <span className="font-medium text-foreground">Administrative API</span>{" "}
            shows as connected, navigate to the{" "}
            <span className="font-medium text-foreground">Dashboard</span> to
            see your live dbt Cloud data.
          </p>
        </CardContent>
      </Card>

      {/* Optional: Semantic Layer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Optional — Semantic Layer Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              The Semantic Layer enables governed metric queries from the{" "}
              <span className="font-medium text-foreground">Metrics</span> tab.
              To set it up:
            </p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>
                Ensure your dbt project has{" "}
                <span className="font-medium text-foreground">
                  semantic models and metrics
                </span>{" "}
                defined
              </li>
              <li>
                Go to{" "}
                <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                  Account Settings &gt; Service Tokens
                </span>{" "}
                and ensure the token has{" "}
                <span className="font-medium text-foreground">
                  Semantic Layer Only
                </span>{" "}
                permissions
              </li>
              <li>
                Generate a Semantic Layer token from your environment settings
                and add it to{" "}
                <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                  DBT_SEMANTIC_LAYER_TOKEN
                </span>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Troubleshooting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <div>
              <h4 className="font-medium text-foreground">
                &ldquo;Not connected&rdquo; badge persists
              </h4>
              <p>
                Double-check that <span className="font-mono text-xs">DBT_CLOUD_API_TOKEN</span>{" "}
                and <span className="font-mono text-xs">DBT_CLOUD_ACCOUNT_ID</span>{" "}
                are set correctly in <span className="font-mono text-xs">.env.local</span>.
                Make sure you restarted the dev server after making changes.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground">
                Catalog / Lineage returns errors
              </h4>
              <p>
                These features require <span className="font-mono text-xs">DBT_DEFAULT_ENVIRONMENT_ID</span>{" "}
                to be set. Use your production environment ID for the best results.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground">
                403 Forbidden errors
              </h4>
              <p>
                Your service token may not have the required permissions.
                Ensure it has at least Read-Only and Metadata access.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground">
                Single-tenant / self-hosted dbt Cloud
              </h4>
              <p>
                If you are on a single-tenant deployment, update{" "}
                <span className="font-mono text-xs">DBT_CLOUD_BASE_URL</span> and{" "}
                <span className="font-mono text-xs">DBT_DISCOVERY_API_URL</span>{" "}
                to point to your instance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
