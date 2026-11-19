import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { reserveAiRequest } from "./ai/rateLimit";
import { generateWithFallback } from "./ai/orchestrator";
import type { GenerateResult } from "./ai/types";

export type { GeneratedCharacter } from "./ai/types";

const InputSchema = z
  .object({
    idea: z.string().trim().min(3).max(1200),
    system: z.string().trim().max(60).default("Genérico"),
    level: z.number().int().min(1).max(30).default(1),
  })
  .strict();

export const generateCharacter = createServerFn({ method: "POST" })
  .validator((data: unknown) => data)
  .handler(async ({ data }): Promise<GenerateResult> => {
    const requestId = crypto.randomUUID();
    const parsed = InputSchema.safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        category: "invalid_input",
        message: "Confira a ideia, o sistema e o nível do personagem.",
        requestId,
        retryable: false,
      };
    }

    const reservation = await reserveAiRequest();
    if (!reservation.ok) {
      return {
        ok: false,
        category: reservation.category,
        message:
          reservation.category === "rate_limit"
            ? "Você atingiu o limite temporário de criações. Tente novamente mais tarde."
            : "A criação com IA está temporariamente indisponível. Tente novamente mais tarde.",
        requestId,
        retryable: reservation.retryable,
      };
    }

    try {
      const result = await generateWithFallback(parsed.data, requestId);
      await reservation.reservation.finalize(result.ok ? "provider_success" : "provider_failure");
      return result;
    } catch {
      await reservation.reservation.finalize("provider_failure");
      console.error(JSON.stringify({ event: "ai_request_failed", requestId, category: "unknown" }));
      return {
        ok: false,
        category: "unknown",
        message:
          "A criação com IA está temporariamente indisponível. Você pode tentar novamente ou continuar manualmente.",
        requestId,
        retryable: true,
      };
    }
  });
