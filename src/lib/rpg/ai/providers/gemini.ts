import type { LlmProvider, ProviderRequest } from "../provider";
import { httpProviderError, networkProviderError } from "../errors";
import type { ProviderResponse } from "../types";

const stringField = (description: string) => ({ type: "STRING", description });
const numberPair = (description: string) => ({
  type: "OBJECT",
  properties: { nome: stringField(description), valor: { type: "NUMBER" } },
  required: ["nome", "valor"],
  propertyOrdering: ["nome", "valor"],
});

const characterSchema = {
  type: "OBJECT",
  properties: {
    nome: stringField("Nome do personagem, até 4 palavras."),
    raca: stringField("Raça ou ancestralidade, de 1 a 3 palavras."),
    classe: stringField("Classe e subclasse, até 4 palavras."),
    nivel: { type: "INTEGER" },
    vida: { type: "NUMBER" },
    mana: { type: "NUMBER", description: "Use zero se o sistema não tiver mana." },
    atributos: {
      type: "ARRAY",
      minItems: 1,
      maxItems: 12,
      items: numberPair("Sigla ou nome curto do atributo."),
    },
    pericias: {
      type: "ARRAY",
      maxItems: 12,
      items: numberPair("Nome curto da perícia, sem bônus."),
    },
    habilidades: {
      type: "ARRAY",
      maxItems: 12,
      items: {
        type: "OBJECT",
        properties: {
          nome: stringField("Nome curto da habilidade."),
          origem: { type: "STRING", enum: ["Raça", "Classe", "Nível", "Antecedente", "Outro"] },
          descricao: stringField("Efeito da habilidade em até duas frases curtas."),
        },
        required: ["nome", "origem", "descricao"],
        propertyOrdering: ["nome", "origem", "descricao"],
      },
    },
    itens: {
      type: "ARRAY",
      maxItems: 12,
      items: {
        type: "OBJECT",
        properties: {
          nome: stringField("Nome curto do item."),
          quantidade: { type: "INTEGER" },
          bonus: stringField("Bônus de ataque ou CA; vazio se não houver."),
          dano: stringField("Dano da arma; vazio se não for arma."),
          descricao: stringField("Descrição curta; vazio se não houver."),
        },
        required: ["nome", "quantidade", "bonus", "dano", "descricao"],
        propertyOrdering: ["nome", "quantidade", "bonus", "dano", "descricao"],
      },
    },
    historia: stringField("História em dois ou três parágrafos curtos."),
  },
  required: [
    "nome",
    "raca",
    "classe",
    "nivel",
    "vida",
    "mana",
    "atributos",
    "pericias",
    "habilidades",
    "itens",
    "historia",
  ],
  propertyOrdering: [
    "nome",
    "raca",
    "classe",
    "nivel",
    "vida",
    "mana",
    "atributos",
    "pericias",
    "habilidades",
    "itens",
    "historia",
  ],
};

const systemInstruction =
  "Você é um mestre de RPG experiente. Gere uma ficha jogável em português do Brasil. Retorne somente JSON válido com nome, raca, classe, nivel, vida, mana, atributos, pericias, habilidades, itens e historia. Use de 1 a 12 atributos e até 12 perícias, habilidades e itens. Mantenha cada campo curto e com uma informação. Não invente regras oficiais: siga o sistema informado e marque detalhes incertos como sugestões.";

const creativeSystemInstruction = [
  systemInstruction,
  "A ideia do jogador é obrigatória: transforme o conflito, os objetivos e a origem descritos em escolhas específicas da ficha.",
  "Crie de 4 a 8 perícias úteis, de 3 a 6 habilidades distintas com descrições curtas, de 3 a 6 itens significativos e uma história vívida em dois parágrafos.",
  "Não use 'A definir', 'Novo personagem' ou textos genéricos. Não deixe campos criativos vazios.",
].join(" ");

function readText(payload: unknown): { text?: string; finishReason?: string } {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("candidates" in payload) ||
    !Array.isArray(payload.candidates)
  )
    return {};
  const candidate = payload.candidates[0];
  if (!candidate || typeof candidate !== "object") return {};
  const finishReason =
    "finishReason" in candidate && typeof candidate.finishReason === "string"
      ? candidate.finishReason
      : undefined;
  if (
    !("content" in candidate) ||
    !candidate.content ||
    typeof candidate.content !== "object" ||
    !("parts" in candidate.content) ||
    !Array.isArray(candidate.content.parts)
  )
    return { finishReason };
  const text = candidate.content.parts
    .map((part: unknown) =>
      part && typeof part === "object" && "text" in part && typeof part.text === "string"
        ? part.text
        : "",
    )
    .join("")
    .trim();
  return { ...(text ? { text } : {}), ...(finishReason ? { finishReason } : {}) };
}

export function createGeminiProvider(apiKey: string, model: string): LlmProvider {
  return {
    name: "gemini",
    model,
    capabilities: { jsonSchema: true, jsonObject: true, tools: false, maxOutputTokens: 4096 },
    async generate(request: ProviderRequest): Promise<ProviderResponse> {
      let response: Response;
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: creativeSystemInstruction }] },
              contents: [{ role: "user", parts: [{ text: request.prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: characterSchema,
                thinkingConfig: { thinkingLevel: "LOW" },
                maxOutputTokens: 4096,
              },
            }),
            signal: request.signal,
          },
        );
      } catch (error) {
        throw networkProviderError({
          provider: this.name,
          model,
          requestId: request.requestId,
          timedOut: error instanceof Error && error.name === "TimeoutError",
        });
      }
      if (!response.ok)
        throw httpProviderError({
          provider: this.name,
          model,
          status: response.status,
          requestId: request.requestId,
          retryAfter: response.headers.get("retry-after"),
        });
      const payload: unknown = await response.json().catch(() => null);
      const result = readText(payload);
      if (!result.text) throw new Error("Gemini returned no text");
      return {
        provider: this.name,
        model,
        text: result.text,
        ...(result.finishReason ? { rawFinishReason: result.finishReason } : {}),
      };
    },
  };
}
