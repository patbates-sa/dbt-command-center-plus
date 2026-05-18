"use client";

export interface ApiLogEntry {
  id: string;
  startedAt: number;
  durationMs?: number;
  method: string;
  url: string;
  status?: number;
  ok?: boolean;
  requestBody?: string;
  responseBody?: string;
  responseContentType?: string;
  error?: string;
}

const MAX_ENTRIES = 200;
const MAX_BODY_BYTES = 16_384;

let entries: ApiLogEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const cb of listeners) cb();
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getEntries(): ApiLogEntry[] {
  return entries;
}

export function clearEntries(): void {
  entries = [];
  notify();
}

function pushEntry(e: ApiLogEntry) {
  entries = [e, ...entries].slice(0, MAX_ENTRIES);
  notify();
}

function patchEntry(id: string, patch: Partial<ApiLogEntry>) {
  let changed = false;
  entries = entries.map((e) => {
    if (e.id !== id) return e;
    changed = true;
    return { ...e, ...patch };
  });
  if (changed) notify();
}

function nextId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function truncate(s: string): string {
  if (s.length <= MAX_BODY_BYTES) return s;
  return s.slice(0, MAX_BODY_BYTES) + `… [truncated ${s.length - MAX_BODY_BYTES} chars]`;
}

function stringifyRequestBody(init?: RequestInit | Request): string | undefined {
  if (!init) return undefined;
  const body = (init as RequestInit).body;
  if (body == null) return undefined;
  if (typeof body === "string") return truncate(body);
  if (body instanceof URLSearchParams) return truncate(body.toString());
  if (body instanceof FormData) {
    const parts: string[] = [];
    body.forEach((v, k) => {
      parts.push(`${k}=${typeof v === "string" ? v : "[file]"}`);
    });
    return truncate(parts.join("&"));
  }
  return `[${body.constructor?.name ?? "body"}]`;
}

let installed = false;

export function installApiLogger(): void {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  const origFetch = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    // Only track app-internal API routes — skip Next.js HMR, static assets, etc.
    const isAppApi = url.includes("/api/");
    if (!isAppApi) {
      return origFetch(input, init);
    }

    const method = (
      init?.method ??
      (input instanceof Request ? input.method : "GET")
    ).toUpperCase();

    const id = nextId();
    const startedAt = Date.now();
    const requestBody = stringifyRequestBody(
      init ?? (input instanceof Request ? input : undefined),
    );

    pushEntry({
      id,
      startedAt,
      method,
      url,
      requestBody,
    });

    try {
      const res = await origFetch(input, init);
      const contentType = res.headers.get("content-type") ?? undefined;
      // Clone before consumer reads the body
      const clone = res.clone();
      clone
        .text()
        .then((text) => {
          patchEntry(id, {
            responseBody: truncate(text),
          });
        })
        .catch(() => {
          // Body unreadable — leave responseBody undefined
        });
      patchEntry(id, {
        durationMs: Date.now() - startedAt,
        status: res.status,
        ok: res.ok,
        responseContentType: contentType,
      });
      return res;
    } catch (err) {
      patchEntry(id, {
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };
}
