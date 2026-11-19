import { createOpenAiCompatibleProvider } from "./openaiCompatible";

export function createGroqProvider(apiKey: string, model: string) {
  return createOpenAiCompatibleProvider({
    name: "groq",
    model,
    apiKey,
    baseUrl: "https://api.groq.com/openai/v1",
    maxTokensField: "max_completion_tokens",
    jsonObject: true,
  });
}
