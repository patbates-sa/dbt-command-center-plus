"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlatformProvider } from "@/lib/hooks/use-platform";
import { PlatformService } from "@/lib/services/platform-service";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AppConfig } from "@/types";

// Only non-sensitive fields are passed from the server component.
// API credentials stay server-side; all dbt Cloud calls go through /api/* proxy routes.
export type ProvidersConfig = Pick<AppConfig, "defaults">;

export function Providers({
  config,
  children,
}: {
  config: ProvidersConfig;
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [platformService] = useState(() =>
    new PlatformService({
      dbtCloud: { baseUrl: "", accountId: "", apiToken: "" },
      discoveryApi: { url: "" },
      semanticLayer: { url: "", token: "" },
      defaults: config.defaults,
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PlatformProvider service={platformService}>
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
      </PlatformProvider>
    </QueryClientProvider>
  );
}
