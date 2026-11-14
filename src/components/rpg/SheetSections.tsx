import { ArrowDown, ArrowUp, Dices, Minus, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { rollCheck } from "@/lib/rpg/dice";
import { BAR_COLORS, clampBar, uid, type Section, type Sheet } from "@/lib/rpg/sheet";
import { useRpg } from "@/lib/rpg/store";
import { cn } from "@/lib/utils";

import { ConfirmButton } from "./ConfirmButton";
import { showRoll } from "./rollToast";

type Props = { section: Section; index: number; edit: boolean };

/** Finds the live section inside a draft by id. */
const pick = (d: Sheet, id: string) => d.secs.find((s) => s.id === id);

export function SectionCard({ section, index, edit }: Props) {
  const { update, sheet } = useRpg();
  const last = index === sheet.secs.length - 1;

  const move = (dir: -1 | 1) =>
    update((d) => {
      const j = index + dir;
      const a = d.secs[index];
      const b = d.secs[j];
      if (!a || !b) return;
      d.secs[index] = b;
      d.secs[j] = a;
    });

  return (
    <section className="panel p-4 sm:p-5">
      {edit ? (
        <div className="mb-4 flex items-center gap-1.5">
          <input
            className="field-bare section-title flex-1"
            value={section.t}
            aria-label="Nome da seção"
            onChange={(e) => update((d) => void (pick(d, section.id)!.t = e.target.value))}
          />
          <Button size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => move(-1)} aria-label="Mover para cima">
            <ArrowUp />
          </Button>
          <Button size="icon-sm" variant="ghost" disabled={last} onClick={() => move(1)} aria-label="Mover para baixo">
            <ArrowDown />
          </Button>
          <ConfirmButton
            size="sm"
            variant="ghost"
            confirmLabel="Apagar?"
            onConfirm={() => update((d) => void d.secs.splice(index, 1))}
            aria-label="Apagar seção"
          >
            <Trash2 />
          </ConfirmButton>
        </div>
      ) : (
        <h2 className="section-title mb-4">{section.t}</h2>
      )}

      {section.type === "bar" && <BarSection section={section} edit={edit} />}
      {section.type === "num" && <NumSection section={section} edit={edit} />}
      {section.type === "list" && <ListSection section={section} edit={edit} />}
      {section.type === "feat" && <FeatSection section={section} edit={edit} />}
      {section.type === "text" && (
        <Textarea
          value={section.text}
          placeholder="Escreva aqui…"
          className="min-h-32 resize-y rounded-xl bg-background/40 text-[15px] leading-relaxed"
          onChange={(e) =>
            update((d) => {
              const s = pick(d, section.id);
              if (s?.type === "text") s.text = e.target.value;
            })
          }
        />
      )}
    </section>
  );
}

function BarSection({ section, edit }: { section: Extract<Section, { type: "bar" }>; edit: boolean }) {
  const { update } = useRpg();
  const [amount, setAmount] = useState<Record<string, string>>({});

  const setRow = (rid: string, fn: (r: Extract<Section, { type: "bar" }>["rows"][number]) => void) =>
    update((d) => {
      const s = pick(d, section.id);
      if (s?.type !== "bar") return;
      const r = s.rows.find((x) => x.id === rid);
      if (r) fn(r);
    });

  return (
    <div className="space-y-5">
      {section.rows.map((r) => {
        const pct = Math.max(0, Math.min(100, (r.v / (r.max || 1)) * 100));
        const step = Math.max(1, parseInt(amount[r.id] ?? "1") || 1);
        return (
          <div key={r.id}>
            {edit ? (
              <div className="mb-2 flex items-center gap-2">
                <input
                  className="field-bare flex-1 font-semibold"
                  value={r.l}
                  aria-label="Nome da barra"
                  onChange={(e) => setRow(r.id, (x) => void (x.l = e.target.value))}
                />
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  máx
                  <input
                    type="number"
                    className="field-bare w-14 text-center font-semibold text-foreground"
                    value={r.max}
                    onChange={(e) =>
                      setRow(r.id, (x) => {
                        x.max = Math.max(1, parseFloat(e.target.value) || 1);
                        x.v = clampBar(x.v, x.max);
                      })
                    }
                  />
                </label>
                <input
                  type="color"
                  value={r.c}
                  aria-label="Cor da barra"
                  className="size-8 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                  onChange={(e) => setRow(r.id, (x) => void (x.c = e.target.value))}
                />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Remover barra"
                  onClick={() =>
                    update((d) => {
                      const s = pick(d, section.id);
                      if (s?.type === "bar") s.rows = s.rows.filter((x) => x.id !== r.id);
                    })
                  }
                >
                  <X />
                </Button>
              </div>
            ) : (
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="font-semibold">{r.l}</span>
                <span className="numeral text-lg">
                  {r.v}
                  <span className="text-sm font-medium text-muted-foreground"> / {r.max}</span>
                </span>
              </div>
            )}
            <div className="h-3.5 overflow-hidden rounded-full bg-muted ring-1 ring-border">
              <div
                className="h-full rounded-full transition-[width] duration-300 ease-out"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${r.c}, color-mix(in oklab, ${r.c} 70%, var(--card)))` }}
              />
            </div>
            {!edit && (
              <div className="mt-2.5 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setRow(r.id, (x) => void (x.v = clampBar(x.v - step, x.max)))}
                >
                  <Minus /> {step}
                </Button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  aria-label={`Quantidade para ${r.l}`}
                  className="h-8 w-14 rounded-lg border border-input bg-background/50 text-center text-sm font-semibold outline-none focus:border-primary"
                  value={amount[r.id] ?? "1"}
                  onChange={(e) => setAmount((a) => ({ ...a, [r.id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setRow(r.id, (x) => void (x.v = clampBar(x.v + step, x.max)))}
                >
                  <Plus /> {step}
                </Button>
              </div>
            )}
          </div>
        );
      })}
      {edit && (
        <Button
          size="sm"
          variant="soft"
          onClick={() =>
            update((d) => {
              const s = pick(d, section.id);
              if (s?.type === "bar")
                s.rows.push({ id: uid(), l: "Nova barra", v: 10, max: 10, c: BAR_COLORS[s.rows.length % BAR_COLORS.length]! });
            })
          }
        >
          <Plus /> Barra
        </Button>
      )}
    </div>
  );
}

function NumSection({ section, edit }: { section: Extract<Section, { type: "num" }>; edit: boolean }) {
  const { update, pushRoll } = useRpg();
  // Short labels (FOR, DES…) read best as tiles; longer ones as a list.
  const tiles = !edit && section.rows.length > 0 && section.rows.every((r) => r.l.length <= 4);

  const setVal = (rid: string, v: string) =>
    update((d) => {
      const s = pick(d, section.id);
      if (s?.type !== "num") return;
      const r = s.rows.find((x) => x.id === rid);
      if (r) r.v = v;
    });

  const roll = (label: string, v: number | string) => {
    const r = rollCheck(label || "Teste", parseInt(String(v)) || 0);
    pushRoll(r);
    showRoll(r);
  };

  if (tiles)
    return (
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {section.rows.map((r) => (
          <div key={r.id} className="group relative flex flex-col items-center rounded-xl border border-border bg-background/40 px-2 pb-2 pt-2.5">
            <span className="eyebrow">{r.l}</span>
            <input
              inputMode="numeric"
              aria-label={r.l}
              className="numeral w-full bg-transparent text-center text-3xl outline-none focus:text-primary"
              value={r.v}
              onChange={(e) => setVal(r.id, e.target.value)}
            />
            <button
              type="button"
              onClick={() => roll(r.l, r.v)}
              className="mt-1 flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              aria-label={`Rolar d20 + ${r.l}`}
            >
              <Dices className="size-3" /> d20
            </button>
          </div>
        ))}
      </div>
    );

  return (
    <div className="divide-y divide-border">
      {section.rows.map((r) => (
        <div key={r.id} className="flex items-center gap-2 py-2">
          {edit ? (
            <input
              className="field-bare flex-1"
              value={r.l}
              placeholder="Nome"
              onChange={(e) =>
                update((d) => {
                  const s = pick(d, section.id);
                  const row = s?.type === "num" ? s.rows.find((x) => x.id === r.id) : undefined;
                  if (row) row.l = e.target.value;
                })
              }
            />
          ) : (
            <span className="flex-1 font-medium">{r.l}</span>
          )}
          <input
            inputMode="numeric"
            aria-label={r.l}
            className="numeral h-9 w-16 rounded-lg border border-input bg-background/50 text-center text-lg outline-none focus:border-primary"
            value={r.v}
            placeholder="0"
            onChange={(e) => setVal(r.id, e.target.value)}
          />
          {edit ? (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Remover"
              onClick={() =>
                update((d) => {
                  const s = pick(d, section.id);
                  if (s?.type === "num") s.rows = s.rows.filter((x) => x.id !== r.id);
                })
              }
            >
              <X />
            </Button>
          ) : (
            <Button size="icon-sm" variant="soft" onClick={() => roll(r.l, r.v)} aria-label={`Rolar d20 + ${r.l}`}>
              <Dices />
            </Button>
          )}
        </div>
      ))}
      {edit && (
        <div className="pt-3">
          <Button
            size="sm"
            variant="soft"
            onClick={() =>
              update((d) => {
                const s = pick(d, section.id);
                if (s?.type === "num") s.rows.push({ id: uid(), l: "", v: 0 });
              })
            }
          >
            <Plus /> Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}

const CHIP = "rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold leading-tight text-primary";
/** Multi-line text that grows with its content instead of scrolling sideways. */
const GROW = "w-full resize-none bg-transparent outline-none [field-sizing:content]";

function ListSection({ section, edit }: { section: Extract<Section, { type: "list" }>; edit: boolean }) {
  const { update } = useRpg();
  const [draft, setDraft] = useState("");

  const setRow = (rid: string, fn: (r: Extract<Section, { type: "list" }>["rows"][number]) => void) =>
    update((d) => {
      const s = pick(d, section.id);
      const row = s?.type === "list" ? s.rows.find((x) => x.id === rid) : undefined;
      if (row) fn(row);
    });

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    update((d) => {
      const s = pick(d, section.id);
      if (s?.type === "list") s.rows.push({ id: uid(), l: name, v: "1" });
    });
    setDraft("");
  };

  return (
    <div>
      {section.rows.length === 0 && <p className="mb-3 text-sm text-muted-foreground">Nada aqui ainda.</p>}
      <ul className="divide-y divide-border">
        {section.rows.map((r) => {
          const tags = (r.tags ?? []).map((t) => t.trim()).filter(Boolean);
          return (
            <li key={r.id} className="flex items-start gap-2 py-2">
              <div className="min-w-0 flex-1">
                <input
                  className="field-bare border-transparent font-semibold"
                  value={r.l}
                  placeholder="Item"
                  onChange={(e) => setRow(r.id, (x) => void (x.l = e.target.value))}
                />
                {edit ? (
                  <input
                    className="field-bare mt-1 text-xs"
                    value={(r.tags ?? []).join(",")}
                    placeholder="Bônus e dano, separados por vírgula"
                    aria-label={`Bônus de ${r.l}`}
                    onChange={(e) => setRow(r.id, (x) => void (x.tags = e.target.value.split(",")))}
                  />
                ) : (
                  tags.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {tags.map((t, i) => (
                        <span key={i} className={CHIP}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )
                )}
                {(edit || r.d) && (
                  <textarea
                    rows={1}
                    className={cn(GROW, "mt-1 text-sm leading-snug text-muted-foreground focus:text-foreground")}
                    value={r.d ?? ""}
                    placeholder="Descrição (opcional)"
                    aria-label={`Descrição de ${r.l}`}
                    onChange={(e) => setRow(r.id, (x) => void (x.d = e.target.value))}
                  />
                )}
              </div>
              <span className="pt-2 text-xs text-muted-foreground">×</span>
              <input
                className="mt-0.5 h-8 w-14 rounded-lg border border-input bg-background/50 px-1 text-center text-sm font-semibold outline-none focus:border-primary sm:w-20"
                value={r.v}
                placeholder="qtd"
                aria-label={`Quantidade de ${r.l}`}
                onChange={(e) => setRow(r.id, (x) => void (x.v = e.target.value))}
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remover ${r.l}`}
                className="mt-0.5 text-muted-foreground hover:text-destructive"
                onClick={() =>
                  update((d) => {
                    const s = pick(d, section.id);
                    if (s?.type === "list") s.rows = s.rows.filter((x) => x.id !== r.id);
                  })
                }
              >
                <X />
              </Button>
            </li>
          );
        })}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Novo item…"
          className="h-9 flex-1 rounded-lg border border-input bg-background/50 px-3 text-sm outline-none focus:border-primary"
        />
        <Button type="submit" size="sm" variant="soft" disabled={!draft.trim()} className="h-9">
          <Plus /> Adicionar
        </Button>
      </form>
    </div>
  );
}

function FeatSection({ section, edit }: { section: Extract<Section, { type: "feat" }>; edit: boolean }) {
  const { update } = useRpg();

  const setRow = (rid: string, fn: (r: Extract<Section, { type: "feat" }>["rows"][number]) => void) =>
    update((d) => {
      const s = pick(d, section.id);
      const row = s?.type === "feat" ? s.rows.find((x) => x.id === rid) : undefined;
      if (row) fn(row);
    });

  return (
    <div className="space-y-2.5">
      {section.rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma habilidade ainda.</p>}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {section.rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2">
              <input
                className="field-bare min-w-0 flex-1 border-transparent font-semibold"
                value={r.l}
                placeholder="Nome da habilidade"
                onChange={(e) => setRow(r.id, (x) => void (x.l = e.target.value))}
              />
              {edit ? (
                <>
                  <input
                    className="field-bare w-24 text-xs"
                    value={r.tag}
                    placeholder="Origem"
                    aria-label={`Origem de ${r.l}`}
                    onChange={(e) => setRow(r.id, (x) => void (x.tag = e.target.value))}
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remover ${r.l}`}
                    onClick={() =>
                      update((d) => {
                        const s = pick(d, section.id);
                        if (s?.type === "feat") s.rows = s.rows.filter((x) => x.id !== r.id);
                      })
                    }
                  >
                    <X />
                  </Button>
                </>
              ) : (
                r.tag.trim() && <span className={cn(CHIP, "shrink-0")}>{r.tag}</span>
              )}
            </div>
            <textarea
              rows={1}
              className={cn(GROW, "mt-1 text-sm leading-relaxed text-muted-foreground focus:text-foreground")}
              value={r.d}
              placeholder="O que essa habilidade faz…"
              aria-label={`Descrição de ${r.l}`}
              onChange={(e) => setRow(r.id, (x) => void (x.d = e.target.value))}
            />
          </div>
        ))}
      </div>
      <Button
        size="sm"
        variant="soft"
        onClick={() =>
          update((d) => {
            const s = pick(d, section.id);
            if (s?.type === "feat") s.rows.push({ id: uid(), l: "", tag: "", d: "" });
          })
        }
      >
        <Plus /> Habilidade
      </Button>
    </div>
  );
}
