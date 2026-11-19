import type { ProviderResponse } from "./types";

export type ProviderCapabilities = {
  jsonSchema: boolean;
  jsonObject: boolean;
  tools: boolean;
  maxOutputTokens?: number;
};

export type ProviderRequest = {
  prompt: string;
  signal: AbortSignal;
  requestId: string;
};

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  readonly capabilities: ProviderCapabilities;
  generate(request: ProviderRequest): Promise<ProviderResponse>;
}
