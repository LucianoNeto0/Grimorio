import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { generateCharacter } from "@/lib/rpg/ai.functions";
import type { AiErrorCategory, GeneratedCharacter } from "@/lib/rpg/ai/types";
import { createTemplateCharacter } from "@/lib/rpg/ai/templates";
import { sheetFromAi } from "@/lib/rpg/fromAi";
import { useRpg } from "@/lib/rpg/useRpg";
import { cn } from "@/lib/utils";

const SYSTEMS = ["Genérico", "D&D 5e", "Tormenta20", "Ordem Paranormal", "Pathfinder"];
const IDEAS = [
  "Uma ladina halfling que rouba dos nobres para alimentar órfãos",
  "Um paladino anão amaldiçoado que perdeu a fé",
  "Uma maga elfa que estuda magia proibida dos sonhos",
  "Um bardo meio-orc que conta histórias para esconder o passado",
];

const errorMessages: Record<AiErrorCategory, string> = {
  invalid_input: "Confira a ideia, o sistema e o nível do personagem.",
  rate_limit: "Você atingiu o limite temporário de criações. Tente novamente mais tarde.",
  provider_timeout: "A IA demorou mais que o esperado. Tente novamente.",
  provider_unavailable:
    "A IA está temporariamente indisponível. Você pode tentar novamente ou criar uma ficha manualmente.",
  provider_auth: "A criação por IA não está configurada corretamente neste ambiente.",
  provider_bad_request: "A IA não conseguiu processar essa solicitação. Tente simplificar a ideia.",
  provider_model_not_found:
    "A criação por IA está temporariamente indisponível. Tente novamente mais tarde.",
  invalid_output:
    "A IA respondeu em um formato incompleto. Tente novamente com uma descrição mais simples.",
  configuration: "A criação por IA não está configurada neste ambiente.",
  rate_limit_store:
    "A criação por IA está temporariamente indisponível. Tente novamente mais tarde.",
  deadline_exceeded: "A criação demorou mais que o esperado. Tente novamente.",
  unknown:
    "Não foi possível gerar a ficha agora. Você pode tentar novamente ou continuar manualmente.",
};

export function AiDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { sheet, replaceSheet, setActiveId } = useRpg();
  const generate = useServerFn(generateCharacter);
  const inFlight = useRef(false);
  const [idea, setIdea] = useState("");
  const [system, setSystem] = useState("Genérico");
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    character: GeneratedCharacter;
    usedFallback: boolean;
  } | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const run = async () => {
    if (inFlight.current || idea.trim().length < 3) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    setRequestId(null);
    try {
      const r = await generate({ data: { idea, system, level } });
      setRequestId(r.requestId);
      if (r.ok) setResult({ character: r.character, usedFallback: r.usedFallback });
      else setError(errorMessages[r.category] ?? r.message);
    } catch {
      setError("Não foi possível falar com a IA agora. Tente novamente.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const useTemplate = () => {
    setResult({ character: createTemplateCharacter({ idea, system, level }), usedFallback: true });
    setError(null);
  };

  const apply = () => {
    if (!result) return;
    replaceSheet(sheetFromAi(result.character, sheet.photo));
    setActiveId(null);
    toast.success(`${result.character.nome} entrou na aventura!`, {
      description: "Salve em Personagens para não perder.",
    });
    setResult(null);
    setIdea("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="size-5 text-primary" /> Criar personagem com IA
          </DialogTitle>
          <DialogDescription>
            Descreva uma ideia e a IA monta a ficha completa, com história.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="ai-idea" className="eyebrow">
                Sua ideia
              </label>
              <Textarea
                id="ai-idea"
                value={idea}
                maxLength={1200}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Ex.: um caçador de monstros cego que enxerga através de corvos"
                className="mt-1.5 min-h-24 rounded-xl"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {IDEAS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIdea(i)}
                    className="rounded-full border border-border bg-muted px-2.5 py-1 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="eyebrow">Sistema</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SYSTEMS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSystem(s)}
                    className={cn(
                      "rounded-full border border-border px-3 py-1.5 text-sm font-semibold transition-colors",
                      system === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary/50",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span className="font-semibold">Nível</span>
              <div className="flex items-center gap-2">
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => setLevel((l) => Math.max(1, l - 1))}
                  aria-label="Diminuir nível"
                >
                  −
                </Button>
                <span className="numeral w-8 text-center text-xl">{level}</span>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => setLevel((l) => Math.min(30, l + 1))}
                  aria-label="Aumentar nível"
                >
                  +
                </Button>
              </div>
            </div>

            {error && (
              <div className="space-y-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <p>{error}</p>
                {requestId && (
                  <p className="text-xs opacity-80">Código de diagnóstico: {requestId}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={loading}
                    onClick={run}
                  >
                    Tentar novamente
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={useTemplate}>
                    Continuar com ficha básica
                  </Button>
                </div>
              </div>
            )}

            <Button
              variant="hero"
              size="xl"
              className="w-full"
              disabled={loading || idea.trim().length < 3}
              onClick={run}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" /> Invocando personagem…
                </>
              ) : (
                <>
                  <Wand2 /> Gerar ficha
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/60 p-4">
              <p className="font-display text-2xl font-semibold">{result.character.nome}</p>
              <p className="text-sm text-muted-foreground">
                {[
                  result.character.raca,
                  result.character.classe,
                  result.character.nivel && `Nível ${result.character.nivel}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-3 grid grid-cols-6 gap-1.5">
                {result.character.atributos.slice(0, 6).map((a) => (
                  <div key={a.nome} className="rounded-lg bg-card py-1.5 text-center">
                    <div className="eyebrow text-[10px]">{a.nome}</div>
                    <div className="numeral text-lg">{a.valor}</div>
                  </div>
                ))}
              </div>
              {result.character.habilidades.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.character.habilidades.slice(0, 6).map((h) => (
                    <span
                      key={h.nome}
                      className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary"
                    >
                      {h.nome}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 line-clamp-4 text-sm leading-relaxed">
                {result.character.historia}
              </p>
            </div>
            {result.usedFallback && (
              <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-muted-foreground">
                Esta é uma ficha inicial criada sem IA. Revise e personalize os campos antes de
                usar.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Usar esta ficha substitui a ficha aberta agora. A foto é mantida.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setResult(null)}>
                Tentar outra
              </Button>
              <Button variant="hero" className="flex-1" onClick={apply}>
                Usar esta ficha
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
