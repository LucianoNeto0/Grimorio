import { createOpenAiCompatibleProvider } from "./openaiCompatible";

export function createOpenRouterProvider(apiKey: string, model: string, baseUrl?: string) {
  const url = new URL(baseUrl || "https://openrouter.ai/api/v1");
  if (
    url.protocol !== "https:" ||
    url.hostname !== "openrouter.ai" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("OPENROUTER_BASE_URL must use the official OpenRouter API host");
  }
  return createOpenAiCompatibleProvider({
    name: "openrouter",
    model,
    apiKey,
    baseUrl: url.toString().replace(/\/$/, ""),
    maxTokensField: "max_tokens",
    jsonObject: true,
  });
}
