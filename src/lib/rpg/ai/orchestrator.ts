import { CircuitBreaker } from "./circuitBreaker";
import { toProviderError } from "./errors";
import { parseCharacterOutput } from "./output";
import { computeBackoffMs, sleepWithSignal } from "./retry";
import type { TemplateInput } from "./templates";
import { logAiEvent } from "./telemetry";
import type { LlmProvider } from "./provider";
import type { GenerateResult } from "./types";
import { createGeminiProvider } from "./providers/gemini";
import { createGroqProvider } from "./providers/groq";
import { createNvidiaProvider } from "./providers/nvidia";
import { createOpenRouterProvider } from "./providers/openrouter";

const circuits = new CircuitBreaker(
  positiveInt(process.env["AI_CIRCUIT_FAILURE_THRESHOLD"], 5),
  positiveInt(process.env["AI_CIRCUIT_COOLDOWN_MS"], 60_000),
);

function positiveInt(value: string | undefined, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function configuredProviders(): LlmProvider[] {
  const geminiKey = process.env["GEMINI_API_KEY"]?.trim();
  const geminiModel =
    process.env["GEMINI_MODEL"]?.trim() ||
    process.env["GEMINI_MODELS"]?.split(",")[0]?.trim() ||
    "gemini-3.8-flash";
  const configs: Record<string, LlmProvider | undefined> = {};
  const add = (name: string, configured: boolean, factory: () => LlmProvider) => {
    if (!configured) return;
    try {
      configs[name] = factory();
    } catch {
      safeLog({ event: "ai_provider_configuration", provider: name, category: "configuration" });
    }
  };
  const groqKey = process.env["GROQ_API_KEY"]?.trim();
  const groqModel = process.env["GROQ_MODEL"]?.trim();
  add("groq", Boolean(groqKey && groqModel), () => createGroqProvider(groqKey!, groqModel!));
  add("gemini", Boolean(geminiKey), () => createGeminiProvider(geminiKey!, geminiModel));
  const nvidiaKey = process.env["NVIDIA_API_KEY"]?.trim();
  const nvidiaModel = process.env["NVIDIA_MODEL"]?.trim();
  add("nvidia", Boolean(nvidiaKey && nvidiaModel), () =>
    createNvidiaProvider(nvidiaKey!, nvidiaModel!, process.env["NVIDIA_BASE_URL"]?.trim()),
  );
  const openRouterKey = process.env["OPENROUTER_API_KEY"]?.trim();
  const openRouterModel = process.env["OPENROUTER_MODEL"]?.trim();
  add("openrouter", Boolean(openRouterKey && openRouterModel), () =>
    createOpenRouterProvider(
      openRouterKey!,
      openRouterModel!,
      process.env["OPENROUTER_BASE_URL"]?.trim(),
    ),
  );
  const order = (process.env["AI_PROVIDER_ORDER"] || "groq,gemini,nvidia,openrouter")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  return order.flatMap((name) =>
    name === "template" ? [] : configs[name] ? [configs[name]!] : [],
  );
}

function safeLog(event: Record<string, unknown>) {
  logAiEvent(event);
}

function guideForSystem(system: string) {
  const normalized = system.trim().toLowerCase();
  if (normalized.includes("d&d") || normalized.includes("dnd")) {
    return "Use D&D 5e-inspired terminology. Use the six core abilities FOR, DES, CON, INT, SAB and CAR, plus fitting proficiencies, class features and equipment. Keep values plausible for the chosen level.";
  }
  if (normalized.includes("tormenta")) {
    return "Use Tormenta20-inspired terminology. Use FOR, DES, CON, INT, SAB and CAR, meaningful pericias, powers and equipment appropriate to the chosen level. Keep values plausible without claiming an official build.";
  }
  if (normalized.includes("ordem paranormal")) {
    return "Use Ordem Paranormal-inspired terminology. Use AGI, FOR, INT, PRE and VIG, appropriate pericias, origin, combat or paranormal abilities and equipment that fits the character concept.";
  }
  if (normalized.includes("pathfinder")) {
    return "Use Pathfinder-inspired terminology. Use FOR, DES, CON, INT, SAB and CAR, relevant trained skills, ancestry or class feats and equipment appropriate to the chosen level.";
  }
  return "Adapt the attributes, skills, abilities and equipment to the selected system. If the system is custom or unclear, make coherent suggestions instead of claiming official rules.";
}

async function runProvider(
  provider: LlmProvider,
  prompt: string,
  requestId: string,
  deadlineAt: number,
  fallbackIndex: number,
): Promise<{
  character: import("./types").GeneratedCharacter;
  provider: string;
  model: string;
} | null> {
  const circuitKey = `${provider.name}:${provider.model}`;
  if (!circuits.canRequest(circuitKey)) {
    safeLog({
      event: "ai_provider_skipped",
      requestId,
      provider: provider.name,
      model: provider.model,
      reason: "circuit_open",
    });
    return null;
  }
  const configuredRetries = Number(process.env["AI_MAX_RETRIES"] ?? 1);
  const retries =
    Number.isInteger(configuredRetries) && configuredRetries >= 0
      ? Math.min(2, configuredRetries)
      : 1;
  const baseMs = positiveInt(process.env["AI_BACKOFF_BASE_MS"], 1000);
  const maxBackoffMs = positiveInt(process.env["AI_BACKOFF_MAX_MS"], 4000);
  const providerTimeoutMs = positiveInt(process.env["AI_PROVIDER_TIMEOUT_MS"], 8000);

  for (let attempt = 0; attempt <= retries; attempt++) {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) return null;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new DOMException("Provider timeout", "TimeoutError")),
      Math.min(providerTimeoutMs, remaining),
    );
    const startedAt = Date.now();
    try {
      const response = await provider.generate({ prompt, signal: controller.signal, requestId });
      const parsed = parseCharacterOutput(response.text);
      const elapsedMs = Date.now() - startedAt;
      safeLog({
        event: "ai_provider_attempt",
        requestId,
        provider: provider.name,
        model: provider.model,
        fallbackIndex,
        attempt,
        elapsedMs,
        outputValid: parsed.ok,
        ...(!parsed.ok ? { category: "invalid_output", reason: parsed.message } : {}),
      });
      if (parsed.ok) {
        circuits.recordSuccess(circuitKey);
        return { character: parsed.character, provider: provider.name, model: provider.model };
      }
      const transition = circuits.recordFailure(circuitKey);
      if (transition.opened)
        safeLog({
          event: "ai_circuit_transition",
          requestId,
          provider: provider.name,
          model: provider.model,
          from: "closed",
          to: "open",
          count: transition.count,
        });
      return null;
    } catch (error) {
      const providerError = toProviderError(error, {
        provider: provider.name,
        model: provider.model,
        requestId,
      });
      const elapsedMs = Date.now() - startedAt;
      safeLog({
        event: "ai_provider_attempt",
        requestId,
        provider: provider.name,
        model: provider.model,
        fallbackIndex,
        attempt,
        elapsedMs,
        category: providerError.category,
        status: providerError.status,
      });
      if (!providerError.retryable) {
        circuits.recordConfigurationFailure(circuitKey);
        return null;
      }
      const transition = circuits.recordFailure(circuitKey);
      if (transition.opened)
        safeLog({
          event: "ai_circuit_transition",
          requestId,
          provider: provider.name,
          model: provider.model,
          from: "closed",
          to: "open",
          count: transition.count,
        });
      if (attempt >= retries || circuits.getState(circuitKey) === "open") return null;
      const jitter = Math.min(300, positiveInt(process.env["AI_BACKOFF_JITTER_MS"], 300));
      const waitMs =
        providerError.retryAfterMs ?? computeBackoffMs(attempt, baseMs, maxBackoffMs, jitter);
      if (waitMs >= deadlineAt - Date.now()) return null;
      try {
        await sleepWithSignal(waitMs, AbortSignal.timeout(Math.max(1, deadlineAt - Date.now())));
      } catch {
        return null;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

export async function generateWithFallback(
  input: TemplateInput,
  requestId: string,
): Promise<GenerateResult> {
  const deadlineMs = positiveInt(process.env["AI_REQUEST_DEADLINE_MS"], 25_000);
  const deadlineAt = Date.now() + deadlineMs;
  const prompt = `Sistema: ${input.system}\nNível: ${input.level}\nIdeia do jogador: ${input.idea}\n\nCrie a ficha completa.`;
  const creativePrompt = `${prompt}\n\nMake the history, abilities and equipment reinforce the central conflict in the player idea.`;
  const creativePromptWithSystem = `${creativePrompt}\n\nSystem guide: ${guideForSystem(input.system)}`;
  let usedProvider: {
    character: import("./types").GeneratedCharacter;
    provider: string;
    model: string;
  } | null = null;
  const providers = configuredProviders();
  for (const [fallbackIndex, provider] of providers.entries()) {
    if (Date.now() >= deadlineAt) break;
    usedProvider = await runProvider(
      provider,
      creativePromptWithSystem,
      requestId,
      deadlineAt,
      fallbackIndex,
    );
    if (usedProvider) break;
  }
  if (usedProvider) {
    safeLog({
      event: "ai_generation_success",
      requestId,
      provider: usedProvider.provider,
      model: usedProvider.model,
      usedFallback: false,
    });
    return {
      ok: true,
      character: usedProvider.character,
      requestId,
      usedFallback: false,
    };
  }
  const category = providers.length === 0 ? "configuration" : "provider_unavailable";
  safeLog({
    event: "ai_generation_failed",
    requestId,
    fallbackIndex: providers.length,
    category,
    elapsedMs: deadlineMs - Math.max(0, deadlineAt - Date.now()),
  });
  return {
    ok: false,
    category,
    message:
      category === "configuration"
        ? "Nenhum provedor de IA está configurado neste ambiente."
        : "Os provedores de IA não conseguiram gerar uma ficha válida agora.",
    requestId,
    retryable: category !== "configuration",
  };
}
