export type AiErrorCategory =
  | "invalid_input"
  | "rate_limit"
  | "provider_timeout"
  | "provider_unavailable"
  | "provider_auth"
  | "provider_bad_request"
  | "provider_model_not_found"
  | "invalid_output"
  | "configuration"
  | "rate_limit_store"
  | "deadline_exceeded"
  | "unknown";

export type GeneratedCharacter = {
  nome: string;
  raca: string;
  classe: string;
  nivel: number;
  vida: number;
  mana: number;
  atributos: { nome: string; valor: number }[];
  pericias: { nome: string; valor: number }[];
  habilidades: { nome: string; origem: string; descricao: string }[];
  itens: {
    nome: string;
    quantidade: number;
    bonus: string;
    dano: string;
    descricao: string;
  }[];
  historia: string;
};

export type GenerateResult =
  | {
      ok: true;
      character: GeneratedCharacter;
      requestId: string;
      usedFallback: boolean;
    }
  | {
      ok: false;
      category: AiErrorCategory;
      message: string;
      requestId: string;
      retryable: boolean;
    };

export type ProviderError = {
  provider: string;
  model: string;
  category: AiErrorCategory;
  status?: number;
  retryable: boolean;
  retryAfterMs?: number;
  message: string;
  requestId: string;
};

export type ProviderResponse = {
  provider: string;
  model: string;
  text: string;
  rawFinishReason?: string;
};
