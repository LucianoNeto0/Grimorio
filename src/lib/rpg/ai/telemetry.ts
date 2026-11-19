export function logAiEvent(event: Record<string, unknown>) {
  const allowed = new Set([
    "event",
    "requestId",
    "provider",
    "model",
    "attempt",
    "fallbackIndex",
    "elapsedMs",
    "latencyMs",
    "category",
    "status",
    "outputValid",
    "reason",
    "from",
    "to",
    "count",
    "usedFallback",
  ]);
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(event)) {
    if (!allowed.has(key)) continue;
    if (typeof value === "string") safe[key] = value.slice(0, 160);
    else if (typeof value === "number" && Number.isFinite(value)) safe[key] = value;
    else if (typeof value === "boolean") safe[key] = value;
  }
  console.info(JSON.stringify({ event: "ai_request", ...safe }));
}

export function logCircuitEvent(event: {
  requestId: string;
  provider: string;
  model: string;
  previousState: "closed" | "open" | "half-open";
  newState: "closed" | "open" | "half-open";
  count: number;
}) {
  console.warn(JSON.stringify({ event: "ai_circuit", ...event }));
}
