"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlatformProvider } from "@/lib/hooks/use-platform";
import { PlatformService } from "@/lib/services/platform-service";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAppConfig } from "@/config/app";

export function Providers({ children }: { children: React.ReactNode }) {
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

  const [platformService] = useState(() => {
    const config = getAppConfig();
    return new PlatformService(config);
  });

  return (
    <QueryClientProvider client={queryClient}>
      <PlatformProvider service={platformService}>
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
      </PlatformProvider>
    </QueryClientProvider>
  );
}
