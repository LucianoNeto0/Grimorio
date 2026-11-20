import { afterEach, describe, expect, it, vi } from "vitest";

import { categoryForStatus, parseRetryAfter } from "./errors";
import { parseCharacterOutput, GeneratedCharacterSchema } from "./output";
import { computeBackoffMs } from "./retry";
import { CircuitBreaker } from "./circuitBreaker";
import { generateWithFallback } from "./orchestrator";
import { createNvidiaProvider } from "./providers/nvidia";
import { createGroqProvider } from "./providers/groq";
import { createOpenRouterProvider } from "./providers/openrouter";
import { sheetFromAi } from "../fromAi";
import { logAiEvent } from "./telemetry";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const validCharacter = {
  nome: "Ayla",
  raca: "Humana",
  classe: "Exploradora",
  nivel: 1,
  vida: 10,
  mana: 0,
  atributos: [{ nome: "FOR", valor: 10 }],
  pericias: [],
  habilidades: [],
  itens: [],
  historia: "Uma exploradora em busca de respostas.",
};

describe("AI resilience utilities", () => {
  it("classifies transient and permanent provider statuses", () => {
    expect(categoryForStatus(429)).toEqual({ category: "rate_limit", retryable: true });
    expect(categoryForStatus(503).retryable).toBe(true);
    expect(categoryForStatus(404)).toEqual({
      category: "provider_model_not_found",
      retryable: false,
    });
    expect(categoryForStatus(401).category).toBe("provider_auth");
  });

  it("parses Retry-After as seconds or an HTTP date", () => {
    expect(parseRetryAfter("2", 1000)).toBe(2000);
    expect(parseRetryAfter("bad", 1000)).toBeUndefined();
  });

  it("bounds the exponential delay and adds jitter", () => {
    expect(computeBackoffMs(0, 1000, 4000, 300, () => 0)).toBe(1000);
    expect(computeBackoffMs(5, 1000, 4000, 300, () => 0.5)).toBe(4000);
  });

  it("opens a circuit after repeated failures and permits one half-open probe", () => {
    const circuit = new CircuitBreaker(2, 100, 1000);
    circuit.recordFailure("groq:model", 10);
    expect(circuit.getState("groq:model", 20)).toBe("closed");
    circuit.recordFailure("groq:model", 30);
    expect(circuit.getState("groq:model", 40)).toBe("open");
    expect(circuit.canRequest("groq:model", 50)).toBe(false);
    expect(circuit.canRequest("groq:model", 140)).toBe(true);
    expect(circuit.canRequest("groq:model", 141)).toBe(false);
    circuit.recordSuccess("groq:model");
    expect(circuit.getState("groq:model", 150)).toBe("closed");
  });

  it("accepts JSON and fenced JSON, and rejects malformed or out-of-range values", () => {
    expect(parseCharacterOutput(JSON.stringify(validCharacter)).ok).toBe(true);
    expect(parseCharacterOutput(`\`\`\`json\n${JSON.stringify(validCharacter)}\n\`\`\``).ok).toBe(
      true,
    );
    expect(parseCharacterOutput('{"nome":"cortado"').ok).toBe(false);
    expect(
      parseCharacterOutput(JSON.stringify({ ...validCharacter, historia: "texto\u0000inválido" }))
        .ok,
    ).toBe(false);
    expect(
      GeneratedCharacterSchema.safeParse({ ...validCharacter, vida: Number.POSITIVE_INFINITY })
        .success,
    ).toBe(false);
    expect(GeneratedCharacterSchema.safeParse({ ...validCharacter, nivel: 31 }).success).toBe(
      false,
    );
    expect(
      GeneratedCharacterSchema.safeParse({
        ...validCharacter,
        itens: [{ nome: "Poção", quantidade: 1.5, bonus: "", dano: "", descricao: "" }],
      }).success,
    ).toBe(false);
  });

  it("normalizes compact name/value objects returned by compatible providers", () => {
    const compactCharacter = {
      ...validCharacter,
      atributos: { FOR: 12, DES: 14 },
      pericias: { Percepcao: 3 },
    };
    const result = parseCharacterOutput(JSON.stringify(compactCharacter));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.character.atributos).toEqual([
        { nome: "FOR", valor: 12 },
        { nome: "DES", valor: 14 },
      ]);
      expect(result.character.pericias).toEqual([{ nome: "Percepcao", valor: 3 }]);
    }
  });

  it("normalizes NVIDIA skill rows with provider-specific labels and bonuses", () => {
    const nvidiaCharacter = {
      ...validCharacter,
      mana: "N/A",
      pericias: [
        { Perícia: "Atletismo", Bônus: "+5" },
        { Furtividade: "-1" },
        ["Sobrevivência", "3"],
        "Intimidação +2",
      ],
    };
    const result = parseCharacterOutput(JSON.stringify(nvidiaCharacter));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.character.mana).toBe(0);
      expect(result.character.pericias).toEqual([
        { nome: "Atletismo", valor: 5 },
        { nome: "Furtividade", valor: -1 },
        { nome: "Sobrevivência", valor: 3 },
        { nome: "Intimidação", valor: 2 },
      ]);
    }
  });

  it("normalizes NVIDIA ability and item fields without dropping their details", () => {
    const nvidiaCharacter = {
      ...validCharacter,
      atributos: { forca: 12 },
      pericias: { navegacao: 4 },
      habilidades: [
        { nome: "Olhos do Corvo", tipo: "Juramento", custo: 2, descricao: "Enxerga pelo bando." },
      ],
      itens: [
        {
          nome: "Lanca de Sal",
          tipo: "Arma ritual",
          peso: 3,
          valor: 40,
          descricao: "Fere espiritos marinhos.",
        },
      ],
    };
    const result = parseCharacterOutput(JSON.stringify(nvidiaCharacter));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.character.habilidades[0]).toMatchObject({ origem: "Juramento" });
      expect(result.character.habilidades[0]?.descricao).toContain("Custo: 2");
      expect(result.character.itens[0]).toMatchObject({ quantidade: 1, bonus: "", dano: "" });
      expect(result.character.itens[0]?.descricao).toContain("Tipo: Arma ritual");
    }
  });

  it("keeps provider endpoints on their official HTTPS hosts", () => {
    expect(() =>
      createNvidiaProvider("key", "model", "http://integrate.api.nvidia.com/v1"),
    ).toThrow();
    expect(() =>
      createNvidiaProvider("key", "model", "https://integrate.api.nvidia.com.evil.test/v1"),
    ).toThrow();
    expect(() =>
      createOpenRouterProvider("key", "model", "https://openrouter.ai.evil.test/api/v1"),
    ).toThrow();
  });

  it("disables hidden NVIDIA reasoning so the final JSON remains available", async () => {
    let sentBody = "";
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        sentBody = String(init?.body);
        return Promise.resolve(
          new Response(
            JSON.stringify({ choices: [{ message: { content: JSON.stringify(validCharacter) } }] }),
            { status: 200 },
          ),
        );
      }),
    );
    const provider = createNvidiaProvider("test-key-not-a-secret", "test-model");
    await provider.generate({
      prompt: "Crie uma ficha.",
      requestId: "nvidia-contract",
      signal: new AbortController().signal,
    });
    const body = JSON.parse(sentBody) as {
      chat_template_kwargs?: { enable_thinking?: boolean };
      messages?: Array<{ content?: string }>;
    };
    expect(body.chat_template_kwargs?.enable_thinking).toBe(false);
    expect(body.messages?.[0]?.content).toContain("habilidades distintas");
  });

  it("uses Groq strict structured output for GPT-OSS character generation", async () => {
    let sentBody = "";
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        sentBody = String(init?.body);
        return Promise.resolve(
          new Response(
            JSON.stringify({ choices: [{ message: { content: JSON.stringify(validCharacter) } }] }),
            { status: 200 },
          ),
        );
      }),
    );
    const provider = createGroqProvider("test-key-not-a-secret", "openai/gpt-oss-120b");
    await provider.generate({
      prompt: "Crie uma ficha.",
      requestId: "groq-structured-output-contract",
      signal: new AbortController().signal,
    });
    const body = JSON.parse(sentBody) as {
      reasoning_effort?: string;
      response_format?: { type?: string; json_schema?: { strict?: boolean } };
    };
    expect(body.reasoning_effort).toBe("low");
    expect(body.response_format?.type).toBe("json_schema");
    expect(body.response_format?.json_schema?.strict).toBe(true);
  });

  it("drops prompts and unapproved fields from telemetry", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logAiEvent({ event: "test", requestId: "request", prompt: "private prompt", apiKey: "secret" });
    expect(info.mock.calls[0]?.[0]).not.toContain("private prompt");
    expect(info.mock.calls[0]?.[0]).not.toContain("secret");
    expect(info.mock.calls[0]?.[0]).toContain("request");
  });

  it("converts a validated character into an editable sheet and preserves the portrait", () => {
    const sheet = sheetFromAi(validCharacter, "data:image/png;base64,portrait");
    expect(sheet.photo).toBe("data:image/png;base64,portrait");
    expect(sheet.head.some((field) => field.v === "Ayla")).toBe(true);
    expect(
      sheet.secs.some(
        (section) => section.type === "num" && section.rows.some((row) => row.v === 10),
      ),
    ).toBe(true);
  });

  it("returns a configuration error instead of silently creating an offline template", async () => {
    const input = { idea: "Uma arqueira errante", system: "Sistema próprio", level: 4 };
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("NVIDIA_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("AI_PROVIDER_ORDER", "groq,gemini,nvidia,openrouter,template");
    const result = await generateWithFallback(input, "test-request-id");
    expect(result).toMatchObject({ ok: false, category: "configuration", retryable: false });
    if (!result.ok) {
      expect(result.message).toContain("Nenhum provedor");
    }
  });

  it("retries a transient Groq failure once and validates its JSON response", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key-not-a-secret");
    vi.stubEnv("GROQ_MODEL", "test-model");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("NVIDIA_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("AI_PROVIDER_ORDER", "groq,template");
    vi.stubEnv("AI_MAX_RETRIES", "1");
    vi.stubEnv("AI_BACKOFF_BASE_MS", "1");
    vi.stubEnv("AI_BACKOFF_MAX_MS", "4");
    vi.stubEnv("AI_BACKOFF_JITTER_MS", "1");
    vi.stubEnv("AI_PROVIDER_TIMEOUT_MS", "100");
    vi.stubEnv("AI_REQUEST_DEADLINE_MS", "500");

    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        calls++;
        expect(init?.headers).toMatchObject({ Authorization: "Bearer test-key-not-a-secret" });
        if (calls === 1) return new Response("", { status: 503 });
        return new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify(validCharacter) } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const result = await generateWithFallback(
      { idea: "Uma exploradora", system: "Genérico", level: 1 },
      "retry-contract-test",
    );
    expect(calls).toBe(2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.usedFallback).toBe(false);
      expect(result.character.nome).toBe("Ayla");
    }
  });

  it("returns an error when a provider misses the configured timeout", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key-not-a-secret");
    vi.stubEnv("GROQ_MODEL", "test-model-timeout");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("NVIDIA_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("AI_PROVIDER_ORDER", "groq,template");
    vi.stubEnv("AI_MAX_RETRIES", "0");
    vi.stubEnv("AI_PROVIDER_TIMEOUT_MS", "15");
    vi.stubEnv("AI_REQUEST_DEADLINE_MS", "100");
    vi.stubEnv("AI_CIRCUIT_FAILURE_THRESHOLD", "5");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(init.signal?.reason ?? new DOMException("aborted", "AbortError")),
              { once: true },
            );
          }),
      ),
    );

    const result = await generateWithFallback(
      { idea: "Uma exploradora", system: "Genérico", level: 2 },
      "timeout-contract-test",
    );
    expect(result).toMatchObject({ ok: false, category: "provider_unavailable", retryable: true });
    if (!result.ok) {
      expect(result.message).toContain("não conseguiram");
    }
  });
});
