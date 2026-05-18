"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { JiraTicket } from "@/types";

interface JiraTicketsResponse {
  tickets: JiraTicket[];
}

async function fetchJiraTickets(q?: string): Promise<JiraTicket[]> {
  const url = q
    ? `/api/jira/tickets?q=${encodeURIComponent(q)}`
    : "/api/jira/tickets";
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error || `Failed to load Jira tickets (${res.status})`);
  }
  const data = (await res.json()) as JiraTicketsResponse;
  return data.tickets;
}

export function useJiraTickets(
  q?: string,
): UseQueryResult<JiraTicket[], Error> {
  return useQuery({
    queryKey: ["jira", "tickets", q ?? null] as const,
    queryFn: () => fetchJiraTickets(q),
    staleTime: 30_000,
  });
}

async function fetchJiraTicketsByJql(jql: string): Promise<JiraTicket[]> {
  const url = `/api/jira/tickets?jql=${encodeURIComponent(jql)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error || `Failed to load Jira tickets (${res.status})`);
  }
  const data = (await res.json()) as { tickets: JiraTicket[] };
  return data.tickets;
}

export function useJiraTicketsByJql(
  jql: string,
  enabled = true,
): UseQueryResult<JiraTicket[], Error> {
  return useQuery({
    queryKey: ["jira", "tickets-by-jql", jql] as const,
    queryFn: () => fetchJiraTicketsByJql(jql),
    enabled,
    staleTime: 30_000,
  });
}
