import type { AiErrorCategory, ProviderError } from "./types";

export class LlmProviderError extends Error {
  readonly details: ProviderError;

  constructor(details: ProviderError) {
    super(details.message);
    this.name = "LlmProviderError";
    this.details = details;
  }
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}

export function categoryForStatus(status: number): {
  category: AiErrorCategory;
  retryable: boolean;
} {
  if (status === 408) return { category: "provider_timeout", retryable: true };
  if (status === 429) return { category: "rate_limit", retryable: true };
  if (status === 401 || status === 403) return { category: "provider_auth", retryable: false };
  if (status === 404) return { category: "provider_model_not_found", retryable: false };
  if ([400, 413, 422].includes(status))
    return { category: "provider_bad_request", retryable: false };
  if (status >= 500) return { category: "provider_unavailable", retryable: true };
  return { category: "unknown", retryable: false };
}

export function httpProviderError(args: {
  provider: string;
  model: string;
  status: number;
  requestId: string;
  retryAfter: string | null;
}): LlmProviderError {
  const classified = categoryForStatus(args.status);
  const retryAfterMs = parseRetryAfter(args.retryAfter);
  return new LlmProviderError({
    provider: args.provider,
    model: args.model,
    category: classified.category,
    status: args.status,
    retryable: classified.retryable,
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    message: `Provider returned HTTP ${args.status}`,
    requestId: args.requestId,
  });
}

export function networkProviderError(args: {
  provider: string;
  model: string;
  requestId: string;
  timedOut: boolean;
}): LlmProviderError {
  return new LlmProviderError({
    provider: args.provider,
    model: args.model,
    category: args.timedOut ? "provider_timeout" : "provider_unavailable",
    retryable: true,
    message: args.timedOut ? "Provider request timed out" : "Provider network request failed",
    requestId: args.requestId,
  });
}

export function toProviderError(
  error: unknown,
  request: {
    provider: string;
    model: string;
    requestId: string;
  },
): ProviderError {
  if (error instanceof LlmProviderError) return error.details;
  const timedOut = error instanceof Error && error.name === "TimeoutError";
  return networkProviderError({ ...request, timedOut }).details;
}
