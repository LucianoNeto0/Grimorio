import { createOpenAiCompatibleProvider } from "./openaiCompatible";

export function createNvidiaProvider(apiKey: string, model: string, baseUrl?: string) {
  const url = new URL(baseUrl || "https://integrate.api.nvidia.com/v1");
  if (
    url.protocol !== "https:" ||
    url.hostname !== "integrate.api.nvidia.com" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("NVIDIA_BASE_URL must use the official NVIDIA API host");
  }
  return createOpenAiCompatibleProvider({
    name: "nvidia",
    model,
    apiKey,
    baseUrl: url.toString().replace(/\/$/, ""),
    maxTokensField: "max_tokens",
    jsonObject: false,
    // Nemotron models can spend the entire response budget on hidden reasoning.
    // The sheet creator needs the final JSON content in one non-streaming response.
    extraBody: {
      temperature: 0.2,
      chat_template_kwargs: { enable_thinking: false },
    },
  });
}
