import { createOpenAiCompatibleProvider } from "./openaiCompatible";
import { groqCharacterSchema } from "../groqSchema";

export function createGroqProvider(apiKey: string, model: string) {
  return createOpenAiCompatibleProvider({
    name: "groq",
    model,
    apiKey,
    baseUrl: "https://api.groq.com/openai/v1",
    maxTokensField: "max_completion_tokens",
    jsonObject: false,
    jsonSchema: true,
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "grimorio_character",
        strict: true,
        schema: groqCharacterSchema,
      },
    },
    extraBody: { reasoning_effort: "low" },
  });
}
