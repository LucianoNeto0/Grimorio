import { ArrowDownCircle, ArrowUpCircle, Dices, Minus, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DICE, rollAdvantage, rollPool, type RollResult } from "@/lib/rpg/dice";
import { MAX_ROLL_HISTORY } from "@/lib/rpg/store-context";
import { useRpg } from "@/lib/rpg/useRpg";
import { cn } from "@/lib/utils";

import { PageTitle } from "./AppShell";
import { ConfirmButton } from "./ConfirmButton";
import { DiePicker } from "./DiePicker";

export function DiceView() {
  const { history, pushRoll, clearHistory } = useRpg();
  const [pool, setPool] = useState<Record<number, number>>({});
  const [mod, setMod] = useState(0);
  const [advantageDie, setAdvantageDie] = useState(20);
  const [last, setLast] = useState<(RollResult & { key: string }) | null>(null);

  const add = (n: number, d: number) =>
    setPool((p) => {
      const next = { ...p, [n]: Math.max(0, (p[n] ?? 0) + d) };
      if (!next[n]) delete next[n];
      return next;
    });

  const show = (r: RollResult) => {
    const e = pushRoll(r);
    setLast({ ...r, key: e.id });
  };

  const poolKeys = Object.keys(pool)
    .map(Number)
    .sort((a, b) => a - b);
  const expr =
    poolKeys.map((n) => `${pool[n]}d${n}`).join(" + ") +
    (mod ? (mod > 0 ? ` + ${mod}` : ` − ${Math.abs(mod)}`) : "");

  return (
    <div className="space-y-4">
      <PageTitle
        title="Mesa de dados"
        subtitle="Toque nos dados para montar a rolagem. Misture tipos à vontade."
      />

      <section className="panel p-4 sm:p-5">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DICE.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => add(n, 1)}
              className="relative flex aspect-square flex-col items-center justify-center rounded-2xl border border-border bg-background/50 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[var(--shadow-lift)] active:scale-95"
            >
              <span className="numeral text-xl sm:text-2xl">d{n}</span>
              {pool[n] ? (
                <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow">
                  {pool[n]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-4 flex min-h-10 flex-wrap items-center gap-2">
          {poolKeys.length === 0 ? (
            <span className="text-sm text-muted-foreground">Nenhum dado escolhido</span>
          ) : (
            poolKeys.map((n) => (
              <span
                key={n}
                className="flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1 text-sm font-bold text-primary"
              >
                {pool[n]}d{n}
                <button
                  type="button"
                  className="grid size-6 place-items-center rounded-full hover:bg-card"
                  onClick={() => add(n, -1)}
                  aria-label={`Tirar um d${n}`}
                >
                  <Minus className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="grid size-6 place-items-center rounded-full hover:bg-card"
                  onClick={() => add(n, 1)}
                  aria-label={`Mais um d${n}`}
                >
                  <Plus className="size-3.5" />
                </button>
              </span>
            ))
          )}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-border px-3 py-2">
          <span className="font-semibold">Modificador</span>
          <div className="flex items-center gap-2">
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => setMod((m) => m - 1)}
              aria-label="Diminuir modificador"
            >
              <Minus />
            </Button>
            <input
              inputMode="numeric"
              aria-label="Modificador"
              className="numeral w-12 bg-transparent text-center text-xl outline-none"
              value={mod}
              onChange={(e) => setMod(parseInt(e.target.value) || 0)}
            />
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => setMod((m) => m + 1)}
              aria-label="Aumentar modificador"
            >
              <Plus />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="hero"
            size="xl"
            className="flex-1"
            onClick={() => {
              const r = rollPool(pool, mod);
              if (!r) {
                toast("Escolha pelo menos um dado");
                return;
              }
              show(r);
            }}
          >
            <Dices /> Rolar {expr && <span className="font-normal opacity-80">{expr}</span>}
          </Button>
          <Button
            variant="outline"
            size="xl"
            className="px-4"
            aria-label="Limpar"
            onClick={() => {
              setPool({});
              setMod(0);
            }}
          >
            <RotateCcw />
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
          <span className="text-sm font-semibold">Dado de vantagem/desvantagem</span>
          <DiePicker
            value={advantageDie}
            label="Dado de vantagem/desvantagem"
            onChange={setAdvantageDie}
            compact
          />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
          <Button variant="outline" onClick={() => show(rollAdvantage(1, mod, advantageDie))}>
            <ArrowUpCircle className="text-success" /> Vantagem d{advantageDie}
          </Button>
          <Button variant="outline" onClick={() => show(rollAdvantage(-1, mod, advantageDie))}>
            <ArrowDownCircle className="text-destructive" /> Desvantagem d{advantageDie}
          </Button>
        </div>

        {last && (
          <div
            key={last.key}
            className="mt-5 flex flex-col items-center gap-1 rounded-2xl bg-primary-soft py-5 text-center"
          >
            <span
              className={cn(
                "numeral animate-roll-in text-6xl text-primary",
                last.crit === "max" && "text-success",
                last.crit === "min" && "animate-shake text-destructive",
              )}
            >
              {last.total}
            </span>
            {last.crit && (
              <span className="eyebrow">{last.crit === "max" ? "Crítico!" : "Falha crítica"}</span>
            )}
            <span className="px-4 text-sm text-muted-foreground">{last.text}</span>
          </div>
        )}
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Histórico recente ({MAX_ROLL_HISTORY})</h2>
          {history.length > 0 && (
            <ConfirmButton
              size="sm"
              variant="ghost"
              onConfirm={() => {
                clearHistory();
                setLast(null);
              }}
            >
              Limpar
            </ConfirmButton>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem rolagens ainda. Rolagens da ficha também aparecem aqui.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-2">
                <span
                  className={cn(
                    "numeral grid h-9 min-w-11 place-items-center rounded-lg bg-muted px-2 text-lg",
                    h.crit === "max" && "bg-success/15 text-success",
                    h.crit === "min" && "bg-destructive/10 text-destructive",
                  )}
                >
                  {h.total}
                </span>
                <span className="flex-1 text-sm text-muted-foreground">{h.text}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {new Date(h.at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
