import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowDown,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Dices,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ONBOARDING_START_EVENT } from "@/lib/rpg/onboarding";
import { hasStoredValue, KEYS, load, save } from "@/lib/rpg/storage";
import { useRpg } from "@/lib/rpg/useRpg";

type TourPath = "/" | "/dados" | "/personagens" | "/visual";

type TourStep = {
  title: string;
  description: string;
  to?: TourPath;
  target?: string;
  panelPosition?: "top";
};

const STEPS: TourStep[] = [
  {
    title: "Bem-vindo ao Grimório",
    description:
      "Vamos conhecer os controles principais em menos de um minuto. Você pode fechar agora e reabrir este guia pela Ajuda quando quiser.",
  },
  {
    title: "Comece pela ficha",
    description:
      "Preencha nome, raça, classe e nível diretamente nos campos. Toque no retrato para adicionar uma foto pequena ao personagem.",
    to: "/",
    target: "sheet-identity",
  },
  {
    title: "Edite uma seção por vez",
    description:
      "O lápis abre somente esta seção. Assim, você pode renomear campos ou reorganizar seu conteúdo sem mexer no restante da ficha.",
    to: "/",
    target: "section-edit",
  },
  {
    title: "Adicione o que seu sistema precisar",
    description:
      "Use o botão + para criar uma nova seção de números, listas, habilidades, barras ou texto. O Grimório se adapta ao seu RPG.",
    to: "/",
    target: "add-section",
    panelPosition: "top",
  },
  {
    title: "Monte uma rolagem",
    description:
      "Na mesa de dados, toque nos dados para formar a rolagem, ajuste o modificador e role. Você pode misturar qualquer tipo de dado.",
    to: "/dados",
    target: "dice-builder",
  },
  {
    title: "Vantagem, desvantagem e dado livre",
    description:
      "Escolha o dado usado nessas rolagens. Ele não precisa ser um d20: use o dado principal do sistema que estiver jogando.",
    to: "/dados",
    target: "dice-advantage",
  },
  {
    title: "Guarde seus personagens",
    description:
      "Salve a ficha atual como um personagem pronto ou em branco como modelo. Depois, abra-a novamente pela lista de personagens.",
    to: "/personagens",
    target: "character-save",
  },
  {
    title: "Deixe o Grimório com a sua campanha",
    description:
      "Escolha uma paleta ou crie suas próprias cores. As preferências ficam salvas neste aparelho.",
    to: "/visual",
    target: "theme-selector",
  },
  {
    title: "A ajuda está sempre disponível",
    description:
      "Use o botão com ? no topo para consultar o guia completo e iniciar este tour de novo. Na versão Web, a criação por IA também fica na ficha.",
    to: "/visual",
    target: "help-button",
  },
  {
    title: "Tudo pronto",
    description:
      "Sua ficha começa limpa: atributos e perícias em zero, Vida e Mana em 10. Agora é só adaptar a estrutura ao seu sistema e começar a jogar.",
  },
];

function findVisibleTarget(name: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)).find(
    (node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
  );
}

export function OnboardingTour() {
  const { ready } = useRpg();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const checkedInitialState = useRef(false);
  const step = STEPS[stepIndex]!;

  const finish = () => {
    save(KEYS.onboarding, true);
    setOpen(false);
    setRect(null);
  };

  const goTo = (nextIndex: number) => {
    const nextStep = STEPS[nextIndex];
    if (!nextStep) return;
    setStepIndex(nextIndex);
    if (nextStep.to && path !== nextStep.to) void navigate({ to: nextStep.to });
  };

  useEffect(() => {
    if (!ready || checkedInitialState.current) return;
    checkedInitialState.current = true;
    if (!load(KEYS.onboarding, false) && !hasStoredValue(KEYS.sheet)) setOpen(true);
  }, [ready]);

  useEffect(() => {
    const restart = () => {
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener(ONBOARDING_START_EVENT, restart);
    return () => window.removeEventListener(ONBOARDING_START_EVENT, restart);
  }, []);

  useEffect(() => {
    if (!open || !step.target) {
      setRect(null);
      return;
    }

    setRect(null);
    let frame = 0;
    const update = () => {
      const target = findVisibleTarget(step.target!);
      if (!target) {
        setRect(null);
        return;
      }
      const nextRect = target.getBoundingClientRect();
      if (nextRect.top < 72 || nextRect.bottom > window.innerHeight - 116) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setRect(nextRect);
    };
    const timer = window.setTimeout(() => {
      update();
      frame = window.requestAnimationFrame(update);
    }, 80);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, path, step.target]);

  if (!open) return null;

  const first = stepIndex === 0;
  const last = stepIndex === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60]" aria-live="polite">
      {!rect && <div className="absolute inset-0 bg-black/70" />}
      {rect && (
        <div
          className="pointer-events-none fixed z-[61] rounded-xl border-2 border-primary shadow-[0_0_0_9999px_rgb(0_0_0_/_0.7),var(--shadow-glow)] transition-all duration-300"
          style={{
            top: Math.max(4, rect.top - 6),
            left: Math.max(4, rect.left - 6),
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        >
          <span className="absolute -top-9 left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow">
            <ArrowDown className="size-5" />
            <span className="sr-only">Função destacada</span>
          </span>
        </div>
      )}

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className={`fixed inset-x-3 z-[62] mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-lift)] sm:p-5 ${
          step.panelPosition === "top" ? "top-20" : "bottom-4 sm:bottom-6"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="eyebrow">
            {first ? "Tour guiado" : `Passo ${stepIndex} de ${STEPS.length - 2}`}
          </span>
          {!last && (
            <button
              type="button"
              className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={finish}
            >
              Pular tour
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            {first || last ? <Sparkles /> : step.to === "/dados" ? <Dices /> : <BookOpen />}
          </div>
          <div>
            <h2 id="tour-title" className="text-lg font-semibold">
              {step.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-2">
          {first ? (
            <Button variant="outline" onClick={finish}>
              Agora não
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => goTo(stepIndex - 1)}>
              <ChevronLeft /> Voltar
            </Button>
          )}
          {last ? (
            <Button
              onClick={() => {
                finish();
                void navigate({ to: "/" });
              }}
            >
              <Check /> Começar a usar
            </Button>
          ) : (
            <Button onClick={() => goTo(stepIndex + 1)}>
              {first ? "Começar tour" : "Próximo"} <ChevronRight />
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
