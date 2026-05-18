import type { AppConfig, DbtCapabilityMap } from "@/types";

export function getAppConfig(): AppConfig {
  return {
    dbtCloud: {
      baseUrl: process.env.DBT_CLOUD_BASE_URL || "https://cloud.getdbt.com",
      accountId: process.env.DBT_CLOUD_ACCOUNT_ID || "",
      apiToken: process.env.DBT_CLOUD_API_TOKEN || "",
    },
    discoveryApi: {
      url:
        process.env.DBT_DISCOVERY_API_URL ||
        "https://metadata.cloud.getdbt.com/graphql",
    },
    semanticLayer: {
      url: process.env.DBT_SEMANTIC_LAYER_URL || "",
      token: process.env.DBT_SEMANTIC_LAYER_TOKEN || "",
    },
    defaults: {
      projectId: process.env.DBT_DEFAULT_PROJECT_ID || undefined,
      environmentId: process.env.DBT_DEFAULT_ENVIRONMENT_ID || undefined,
    },
    webhook: process.env.DBT_WEBHOOK_SECRET
      ? { secret: process.env.DBT_WEBHOOK_SECRET }
      : undefined,
    jiraMcp: process.env.JIRA_MCP_COMMAND
      ? {
          command: process.env.JIRA_MCP_COMMAND,
          args: (process.env.JIRA_MCP_ARGS || "")
            .split(/\s+/)
            .filter(Boolean),
          env: {
            ...(process.env.JIRA_URL && { JIRA_URL: process.env.JIRA_URL }),
            ...(process.env.JIRA_USERNAME && {
              JIRA_USERNAME: process.env.JIRA_USERNAME,
            }),
            ...(process.env.JIRA_API_TOKEN && {
              JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
            }),
            ...(process.env.JIRA_PERSONAL_TOKEN && {
              JIRA_PERSONAL_TOKEN: process.env.JIRA_PERSONAL_TOKEN,
            }),
          },
          toolName: process.env.JIRA_MCP_TOOL_NAME || "jira_search",
          defaultJql:
            process.env.JIRA_DEFAULT_JQL ||
            "assignee = currentUser() ORDER BY updated DESC",
        }
      : undefined,
    dbtProjectRoot: process.env.DBT_PROJECT_ROOT || undefined,
  };
}

export function isConfigured(config: AppConfig): boolean {
  return !!config.dbtCloud.apiToken && !!config.dbtCloud.accountId;
}

export function detectCapabilities(config: AppConfig): DbtCapabilityMap {
  return {
    adminApi: !!config.dbtCloud.apiToken && !!config.dbtCloud.accountId,
    discoveryApi: !!config.discoveryApi.url && !!config.dbtCloud.apiToken,
    semanticLayer:
      !!config.semanticLayer.url && !!config.semanticLayer.token,
    auditLogs: !!config.dbtCloud.apiToken,
    webhooks: !!config.webhook?.secret,
    jobTriggers: !!config.dbtCloud.apiToken,
    artifacts: !!config.dbtCloud.apiToken,
    stateComparison: !!config.discoveryApi.url,
    jira: !!config.jiraMcp?.command,
  };
}
