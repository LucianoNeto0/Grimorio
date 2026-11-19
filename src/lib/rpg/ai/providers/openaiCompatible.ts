import { httpProviderError, networkProviderError } from "../errors";
import type { LlmProvider, ProviderRequest } from "../provider";
import type { ProviderResponse } from "../types";

export type CompatibleProviderOptions = {
  name: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  maxTokensField: "max_tokens" | "max_completion_tokens";
  jsonObject: boolean;
  headers?: Record<string, string>;
  extraBody?: Record<string, unknown>;
};

const systemInstruction =
  "Gere uma ficha de personagem de RPG em português do Brasil. Retorne somente JSON válido com os campos nome, raca, classe, nivel, vida, mana, atributos, pericias, habilidades, itens e historia. Use 1 a 12 atributos e no máximo 12 itens em cada lista. Uma informação curta por campo. Não invente regras oficiais; siga o sistema informado e marque detalhes incertos como sugestões.";

const creativeSystemInstruction = [
  systemInstruction,
  "A ideia do jogador é obrigatória: transforme o conflito, os objetivos e a origem descritos em escolhas específicas da ficha.",
  "Crie de 4 a 8 perícias úteis, de 3 a 6 habilidades distintas com descrições curtas, de 3 a 6 itens significativos e uma história vívida em dois parágrafos.",
  "Não use 'A definir', 'Novo personagem' ou textos genéricos. Não deixe campos criativos vazios.",
].join(" ");

function extract(payload: unknown): { text?: string; finishReason?: string } {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("choices" in payload) ||
    !Array.isArray(payload.choices)
  )
    return {};
  const choice = payload.choices[0];
  if (!choice || typeof choice !== "object") return {};
  const finishReason =
    "finish_reason" in choice && typeof choice.finish_reason === "string"
      ? choice.finish_reason
      : undefined;
  if (
    !("message" in choice) ||
    !choice.message ||
    typeof choice.message !== "object" ||
    !("content" in choice.message)
  )
    return { finishReason };
  const content = choice.message.content;
  const text =
    typeof content === "string"
      ? content.trim()
      : Array.isArray(content)
        ? content
            .map((part) =>
              part && typeof part === "object" && "text" in part && typeof part.text === "string"
                ? part.text
                : "",
            )
            .join("")
            .trim()
        : "";
  return { ...(text ? { text } : {}), ...(finishReason ? { finishReason } : {}) };
}

export function createOpenAiCompatibleProvider(options: CompatibleProviderOptions): LlmProvider {
  const base = options.baseUrl.replace(/\/$/, "");
  return {
    name: options.name,
    model: options.model,
    capabilities: {
      jsonSchema: false,
      jsonObject: options.jsonObject,
      tools: false,
      maxOutputTokens: 4096,
    },
    async generate(request: ProviderRequest): Promise<ProviderResponse> {
      const body: Record<string, unknown> = {
        model: options.model,
        messages: [
          { role: "system", content: creativeSystemInstruction },
          { role: "user", content: request.prompt },
        ],
        stream: false,
        [options.maxTokensField]: 4096,
        ...options.extraBody,
      };
      if (options.jsonObject) body["response_format"] = { type: "json_object" };
      let response: Response;
      try {
        response = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${options.apiKey}`,
            ...options.headers,
          },
          body: JSON.stringify(body),
          signal: request.signal,
        });
      } catch (error) {
        throw networkProviderError({
          provider: options.name,
          model: options.model,
          requestId: request.requestId,
          timedOut: error instanceof Error && error.name === "TimeoutError",
        });
      }
      if (!response.ok)
        throw httpProviderError({
          provider: options.name,
          model: options.model,
          status: response.status,
          requestId: request.requestId,
          retryAfter: response.headers.get("retry-after"),
        });
      const payload: unknown = await response.json().catch(() => null);
      const result = extract(payload);
      if (!result.text) throw new Error(`${options.name} returned no text`);
      return {
        provider: options.name,
        model: options.model,
        text: result.text,
        ...(result.finishReason ? { rawFinishReason: result.finishReason } : {}),
      };
    },
  };
}
