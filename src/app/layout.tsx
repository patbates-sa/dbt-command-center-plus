import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/layout/app-shell";
import { getAppConfig } from "@/config/app";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "dbt Command Center",
  description:
    "A unified operations dashboard for dbt Cloud — monitor jobs, explore catalog assets, trace lineage, and query the Semantic Layer, all powered by dbt APIs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <Providers config={{ defaults: getAppConfig().defaults }}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
