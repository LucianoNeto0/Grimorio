import { getRequestHeader } from "@tanstack/react-start/server";

import type { AiErrorCategory } from "./types";

const reserveScript = `
local burst = tonumber(redis.call('GET', KEYS[1]) or '0')
local daily = tonumber(redis.call('GET', KEYS[2]) or '0')
local global = tonumber(redis.call('GET', KEYS[3]) or '0')
if burst >= tonumber(ARGV[1]) then return {0, 1} end
if daily >= tonumber(ARGV[2]) then return {0, 2} end
if global >= tonumber(ARGV[3]) then return {0, 3} end
if redis.call('INCR', KEYS[1]) == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[4])) end
if redis.call('INCR', KEYS[2]) == 1 then redis.call('EXPIRE', KEYS[2], tonumber(ARGV[5])) end
if redis.call('INCR', KEYS[3]) == 1 then redis.call('EXPIRE', KEYS[3], tonumber(ARGV[5])) end
return {1, 0}
`;

const failScript = `
for i = 1, 2 do
  local current = tonumber(redis.call('GET', KEYS[i]) or '0')
  if current > 0 then redis.call('DECR', KEYS[i]) end
end
return 1
`;

export type RateLimitOutcome = "provider_success" | "provider_failure" | "invalid_output";
export type RateLimitReservation = { finalize: (outcome: RateLimitOutcome) => Promise<void> };
export type RateLimitResult =
  | { ok: true; reservation: RateLimitReservation }
  | {
      ok: false;
      category: Extract<AiErrorCategory, "rate_limit" | "rate_limit_store">;
      retryable: boolean;
    };

const getRedisConfig = () => ({
  url:
    process.env["UPSTASH_REDIS_REST_URL"]?.trim() ||
    process.env["UPSTASH_REDIS_REST_KV_REST_API_URL"]?.trim(),
  token:
    process.env["UPSTASH_REDIS_REST_TOKEN"]?.trim() ||
    process.env["UPSTASH_REDIS_REST_KV_REST_API_TOKEN"]?.trim(),
});

function requestIdentity() {
  const ip =
    getRequestHeader("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    getRequestHeader("x-real-ip")?.trim() ||
    getRequestHeader("cf-connecting-ip")?.trim();

  // Vite's local development server has no proxy that supplies a client IP.
  // Keep production fail-closed while allowing the configured local rate limit
  // to protect development testing without storing a real local address.
  if (ip) return ip;
  return process.env["NODE_ENV"] === "production" ? undefined : "local-development";
}

function validUpstashUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "redis:" || url.protocol === "rediss:") &&
      url.hostname.endsWith(".upstash.io")
    );
  } catch {
    return false;
  }
}

/**
 * Upstash exposes the same database through its HTTPS REST endpoint and through
 * a Redis TLS connection string (`rediss://`). This module uses REST only, so
 * accept either dashboard value without ever forwarding Redis credentials in a
 * URL to an HTTP request.
 */
function toUpstashRestUrl(value: string) {
  const url = new URL(value);
  if (url.protocol === "https:") return url.toString().replace(/\/$/, "");
  return `https://${url.hostname}`;
}

async function redisCommand(url: string, token: string, command: unknown[], timeoutMs = 2_000) {
  const response = await fetch(url.replace(/\/$/, ""), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !payload || typeof payload !== "object" || !("result" in payload)) {
    throw new Error(`Redis HTTP ${response.status}`);
  }
  return payload.result;
}

export async function reserveAiRequest(): Promise<RateLimitResult> {
  const { url, token } = getRedisConfig();
  const production = process.env["NODE_ENV"] === "production";
  if (!url || !token) {
    if (!production) return { ok: true, reservation: { finalize: async () => undefined } };
    console.error(JSON.stringify({ event: "ai_rate_limit", category: "configuration" }));
    return { ok: false, category: "rate_limit_store", retryable: true };
  }
  if (!validUpstashUrl(url)) {
    console.error(JSON.stringify({ event: "ai_rate_limit", category: "configuration" }));
    return { ok: false, category: "rate_limit_store", retryable: false };
  }
  const restUrl = toUpstashRestUrl(url);

  const ip = requestIdentity();
  if (!ip) return { ok: false, category: "rate_limit_store", retryable: true };

  let globalDailyLimit: number;
  try {
    globalDailyLimit = Number(process.env["AI_GLOBAL_DAILY_LIMIT"] || 15);
    if (!Number.isInteger(globalDailyLimit) || globalDailyLimit < 1)
      throw new Error("Invalid limit");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
    const ipHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);
    const burstKey = `grimorio:ai:ip:burst:${ipHash}`;
    const dailyKey = `grimorio:ai:ip:daily:${ipHash}`;
    const globalKey = "grimorio:ai:global:daily";
    const result = await redisCommand(restUrl, token, [
      "EVAL",
      reserveScript,
      "3",
      burstKey,
      dailyKey,
      globalKey,
      "2",
      "5",
      String(globalDailyLimit),
      String(10 * 60),
      String(24 * 60 * 60),
    ]);
    if (!Array.isArray(result) || result[0] !== 1) {
      console.info(JSON.stringify({ event: "ai_rate_limit", category: "rate_limit" }));
      return { ok: false, category: "rate_limit", retryable: true };
    }

    let finalized = false;
    return {
      ok: true,
      reservation: {
        finalize: async (outcome) => {
          if (finalized) return;
          finalized = true;
          if (outcome === "provider_success") return;
          try {
            await redisCommand(restUrl, token, ["EVAL", failScript, "2", dailyKey, globalKey]);
          } catch {
            console.error(JSON.stringify({ event: "ai_rate_limit", category: "finalize_failed" }));
          }
        },
      },
    };
  } catch {
    console.error(JSON.stringify({ event: "ai_rate_limit", category: "rate_limit_store" }));
    return { ok: false, category: "rate_limit_store", retryable: true };
  }
}
