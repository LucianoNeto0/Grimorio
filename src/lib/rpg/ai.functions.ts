import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  idea: z.string().trim().min(3).max(1200),
  system: z.string().trim().max(60).default("Genérico"),
  level: z.number().int().min(1).max(30).default(1),
});

export const GeneratedCharacterSchema = z.object({
  nome: z.string().max(160),
  raca: z.string().max(120),
  classe: z.string().max(120),
  nivel: z.number(),
  vida: z.number(),
  mana: z.number(),
  atributos: z
    .array(z.object({ nome: z.string().max(80), valor: z.number() }))
    .min(1)
    .max(12),
  pericias: z.array(z.object({ nome: z.string().max(120), valor: z.number() })).max(12),
  habilidades: z
    .array(
      z.object({
        nome: z.string().max(160),
        origem: z.string().max(60),
        descricao: z.string().max(1200),
      }),
    )
    .max(12),
  itens: z
    .array(
      z.object({
        nome: z.string().max(160),
        quantidade: z.number(),
        bonus: z.string().max(120),
        dano: z.string().max(120),
        descricao: z.string().max(1200),
      }),
    )
    .max(12),
  historia: z.string().max(8000),
});

export type GeneratedCharacter = z.infer<typeof GeneratedCharacterSchema>;
export type GenerateResult =
  { ok: true; character: GeneratedCharacter } | { ok: false; message: string };

type ProviderResult = { ok: true; text: string } | { ok: false; message: string };
type JsonSchema = Record<string, unknown>;

const stringField = (description: string) => ({ type: "STRING", description }) as const;
const namedNumber = (description: string) =>
  ({
    type: "OBJECT",
    properties: { nome: stringField(description), valor: { type: "NUMBER" } },
    required: ["nome", "valor"],
    propertyOrdering: ["nome", "valor"],
  }) as const;

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
      items: namedNumber("Sigla ou nome curto do atributo."),
    },
    pericias: {
      type: "ARRAY",
      maxItems: 12,
      items: namedNumber("Nome curto da perícia, sem bônus."),
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
          nome: stringField("Nome curto do item, sem bônus nem descrição."),
          quantidade: { type: "INTEGER" },
          bonus: stringField("Bônus de ataque ou CA; vazio se não houver."),
          dano: stringField("Dano da arma; vazio se não for arma."),
          descricao: stringField("Descrição curta; vazio se for óbvio."),
        },
        required: ["nome", "quantidade", "bonus", "dano", "descricao"],
        propertyOrdering: ["nome", "quantidade", "bonus", "dano", "descricao"],
      },
    },
    historia: { type: "STRING", description: "História em dois ou três parágrafos curtos." },
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
} as const satisfies JsonSchema;

const systemInstruction =
  "Você é um mestre de RPG experiente. Gere uma ficha jogável em português do Brasil para o sistema e nível informados. " +
  "Retorne somente um objeto JSON válido neste formato: {nome:string,raca:string,classe:string,nivel:number,vida:number,mana:number, " +
  "atributos:[{nome:string,valor:number}],pericias:[{nome:string,valor:number}], " +
  "habilidades:[{nome:string,origem:string,descricao:string}], " +
  "itens:[{nome:string,quantidade:number,bonus:string,dano:string,descricao:string}],historia:string}. " +
  "Use de 1 a 12 atributos, até 12 perícias, habilidades e itens; em origem use Raça, Classe, Nível, Antecedente ou Outro. " +
  "Mantenha cada campo curto e com uma única informação. Bônus e regras vão nas descrições de habilidades; bônus e dano " +
  "dos itens vão nos campos bonus e dano. Não explique regras gerais do sistema.";

const list = (value: string | undefined, fallback: string[]) => {
  const models = value
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return models?.length ? models : fallback;
};

const getText = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const text = value
      .map((part) => (part && typeof part === "object" && "text" in part ? part.text : ""))
      .filter((part): part is string => typeof part === "string")
      .join("");
    return text || undefined;
  }
  return undefined;
};

async function requestModels(
  provider: string,
  models: string[],
  send: (model: string) => Promise<Response>,
  extract: (payload: unknown) => string | undefined,
): Promise<ProviderResult> {
  let lastMessage = "O provedor não retornou uma resposta válida.";

  for (const model of models) {
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await send(model);
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      lastMessage = timedOut ? "A solicitação expirou." : "Falha de rede ao chamar o provedor.";
      console.error(`${provider} request failed`, {
        model,
        elapsedMs: Date.now() - startedAt,
        timedOut,
      });
      break;
    }

    const payload: unknown = await response.json().catch(() => null);
    if (response.ok) {
      const text = extract(payload)?.trim();
      if (text) return { ok: true, text };
      lastMessage = "O provedor respondeu sem texto.";
      continue;
    }

    const errorObject =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error &&
      typeof payload.error === "object"
        ? payload.error
        : undefined;
    const providerMessage =
      errorObject && "message" in errorObject && typeof errorObject.message === "string"
        ? errorObject.message
        : `HTTP ${response.status}`;
    lastMessage = providerMessage;
    console.error(`${provider} request rejected`, {
      model,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      message: providerMessage,
    });
  }

  return { ok: false, message: lastMessage };
}

const callGemini = (apiKey: string, models: string[], prompt: string) =>
  requestModels(
    "Gemini",
    models,
    (model) =>
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: characterSchema,
              thinkingConfig: { thinkingLevel: "LOW" },
              maxOutputTokens: 4096,
            },
          }),
          signal: AbortSignal.timeout(30_000),
        },
      ),
    (payload) => {
      if (
        !payload ||
        typeof payload !== "object" ||
        !("candidates" in payload) ||
        !Array.isArray(payload.candidates)
      ) {
        return undefined;
      }
      const candidate = payload.candidates[0];
      if (
        !candidate ||
        typeof candidate !== "object" ||
        !("content" in candidate) ||
        !candidate.content
      )
        return undefined;
      const content = candidate.content;
      if (typeof content !== "object" || !("parts" in content) || !Array.isArray(content.parts))
        return undefined;
      return getText(content.parts);
    },
  );

const callCompatible = (
  baseUrl: string,
  apiKey: string,
  models: string[],
  prompt: string,
): Promise<ProviderResult> =>
  requestModels(
    "API reserva",
    models,
    (model) =>
      fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        }),
        signal: AbortSignal.timeout(30_000),
      }),
    (payload) => {
      if (
        !payload ||
        typeof payload !== "object" ||
        !("choices" in payload) ||
        !Array.isArray(payload.choices)
      ) {
        return undefined;
      }
      const choice = payload.choices[0];
      if (!choice || typeof choice !== "object" || !("message" in choice) || !choice.message)
        return undefined;
      const message = choice.message;
      if (typeof message !== "object" || !("content" in message)) return undefined;
      return getText(message.content);
    },
  );

function parseCharacter(text: string): GeneratedCharacter | null {
  const json = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    const parsed = GeneratedCharacterSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const generateCharacter = createServerFn({ method: "POST" })
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<GenerateResult> => {
    const ideaPrompt = `Sistema: ${data.system}\nNível: ${data.level}\nIdeia do jogador: ${data.idea}\n\nCrie a ficha completa.`;
    const attempts: Array<() => Promise<ProviderResult>> = [];

    const geminiKey = process.env["GEMINI_API_KEY"]?.trim();
    if (geminiKey) {
      // Use a single Gemini model per request to avoid spending extra RPM/RPD
      // on model-by-model retries. The compatible provider below remains the
      // cross-provider fallback.
      const model = list(process.env["GEMINI_MODELS"], ["gemini-3.8-flash"])[0];
      attempts.push(() => callGemini(geminiKey, [model], ideaPrompt));
    }

    const baseUrl = (process.env["AI_BASE_URL"] || "").trim().replace(/\/$/, "");
    const backupKey = process.env["AI_API_KEY"]?.trim();
    if (baseUrl && backupKey) {
      const models = list(process.env["AI_MODELS"], []);
      if (models.length)
        attempts.push(() => callCompatible(baseUrl, backupKey, models, ideaPrompt));
      else console.error("AI backup is missing AI_MODELS configuration");
    }

    if (attempts.length === 0) {
      return { ok: false, message: "Nenhum provedor de IA está configurado no servidor." };
    }

    let invalidResponse = false;
    for (const run of attempts) {
      const result = await run();
      if (!result.ok) continue;
      const character = parseCharacter(result.text);
      if (character) return { ok: true, character };
      invalidResponse = true;
      console.error("AI provider returned JSON that did not match the character schema");
    }

    return {
      ok: false,
      message: invalidResponse
        ? "A IA respondeu, mas a ficha veio incompleta. Tente novamente."
        : "Os provedores de IA estão indisponíveis. Confira as configurações e tente novamente.",
    };
  });
