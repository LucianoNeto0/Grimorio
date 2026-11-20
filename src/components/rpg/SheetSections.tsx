import { ArrowDown, ArrowUp, Dices, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DICE, rollCheck } from "@/lib/rpg/dice";
import { BAR_COLORS, clampBar, clone, uid, type Section } from "@/lib/rpg/sheet";
import { useRpg } from "@/lib/rpg/useRpg";
import { cn } from "@/lib/utils";

import { showRoll } from "./rollToast";
import { DiePicker } from "./DiePicker";

type Props = { section: Section; index: number };
type SectionChange = (change: (section: Section) => void) => void;

/** Finds the live section inside a draft by id. */
const sectionIndex = (sections: Section[], id: string) => sections.findIndex((s) => s.id === id);

export function SectionCard({ section, index }: Props) {
  const { update, sheet } = useRpg();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Section>(() => clone(section));
  const [confirm, setConfirm] = useState<"edit" | "save" | "discard" | "delete" | null>(null);
  const last = index === sheet.secs.length - 1;
  const shown = editing ? draft : section;

  const change: SectionChange = (apply) => {
    if (editing) {
      setDraft((current) => {
        const next = clone(current);
        apply(next);
        return next;
      });
      return;
    }
    update((current) => {
      const live = current.secs[sectionIndex(current.secs, section.id)];
      if (live) apply(live);
    });
  };

  const move = (dir: -1 | 1) =>
    update((d) => {
      const currentIndex = sectionIndex(d.secs, section.id);
      const j = currentIndex + dir;
      const a = d.secs[currentIndex];
      const b = d.secs[j];
      if (!a || !b) return;
      d.secs[currentIndex] = b;
      d.secs[j] = a;
    });

  const confirmAction = () => {
    if (confirm === "edit") {
      setDraft(clone(section));
      setEditing(true);
    } else if (confirm === "save") {
      update((d) => {
        const i = sectionIndex(d.secs, section.id);
        if (i >= 0) d.secs[i] = clone(draft);
      });
      setEditing(false);
    } else if (confirm === "discard") {
      setDraft(clone(section));
      setEditing(false);
    } else if (confirm === "delete") {
      update((d) => {
        d.secs = d.secs.filter((s) => s.id !== section.id);
      });
    }
    setConfirm(null);
  };

  const copy = {
    edit: {
      title: "Editar esta seção?",
      description: `Você vai editar somente “${section.t}”. As mudanças ficam em rascunho até confirmar o salvamento.`,
      action: "Editar seção",
    },
    save: {
      title: "Salvar as alterações?",
      description: `As mudanças em “${draft.t}” serão aplicadas à ficha.`,
      action: "Salvar alterações",
    },
    discard: {
      title: "Descartar as alterações?",
      description:
        "O rascunho desta seção será descartado e a ficha continuará como estava antes da edição.",
      action: "Descartar",
    },
    delete: {
      title: "Excluir esta seção?",
      description: `“${section.t}” e seus dados serão removidos da ficha.`,
      action: "Excluir seção",
    },
  } as const;
  const prompt = confirm ? copy[confirm] : null;

  return (
    <section className="panel p-4 sm:p-5" data-section-id={section.id}>
      {editing ? (
        <div className="mb-4">
          <div className="flex items-center gap-1.5">
            <input
              className="field-bare section-title min-w-0 flex-1"
              value={shown.t}
              aria-label="Nome da seção"
              onChange={(e) => change((s) => void (s.t = e.target.value))}
            />
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={index === 0}
              onClick={() => move(-1)}
              aria-label="Mover para cima"
            >
              <ArrowUp />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={last}
              onClick={() => move(1)}
              aria-label="Mover para baixo"
            >
              <ArrowDown />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setConfirm("delete")}
              aria-label="Apagar seção"
            >
              <Trash2 />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setConfirm("save")}>
              Salvar alterações
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirm("discard")}>
              Cancelar edição
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="section-title">{section.t}</h2>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Editar seção ${section.t}`}
            title={`Editar seção ${section.t}`}
            onClick={() => setConfirm("edit")}
          >
            <Pencil />
          </Button>
        </div>
      )}

      {shown.type === "bar" && <BarSection section={shown} edit={editing} change={change} />}
      {shown.type === "num" && <NumSection section={shown} edit={editing} change={change} />}
      {shown.type === "list" && <ListSection section={shown} edit={editing} change={change} />}
      {shown.type === "feat" && <FeatSection section={shown} edit={editing} change={change} />}
      {shown.type === "text" && (
        <Textarea
          value={shown.text}
          readOnly={!editing}
          placeholder="Escreva aqui…"
          className="min-h-32 resize-y rounded-xl bg-background/40 text-[15px] leading-relaxed read-only:border-transparent read-only:px-0 read-only:py-0"
          onChange={(e) =>
            change((s) => {
              if (s.type === "text") s.text = e.target.value;
            })
          }
        />
      )}

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{prompt?.title}</DialogTitle>
            <DialogDescription>{prompt?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Voltar
            </Button>
            <Button
              variant={confirm === "delete" || confirm === "discard" ? "destructive" : "default"}
              onClick={confirmAction}
            >
              {prompt?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function BarSection({
  section,
  edit,
  change,
}: {
  section: Extract<Section, { type: "bar" }>;
  edit: boolean;
  change: SectionChange;
}) {
  const [amount, setAmount] = useState<Record<string, string>>({});

  const setRow = (
    rid: string,
    fn: (r: Extract<Section, { type: "bar" }>["rows"][number]) => void,
  ) =>
    change((s) => {
      if (s.type !== "bar") return;
      const row = s.rows.find((x) => x.id === rid);
      if (row) fn(row);
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
                    change((s) => {
                      if (s.type === "bar") s.rows = s.rows.filter((x) => x.id !== r.id);
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
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${r.c}, color-mix(in oklab, ${r.c} 70%, var(--card)))`,
                }}
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
            change((s) => {
              if (s.type === "bar")
                s.rows.push({
                  id: uid(),
                  l: "Nova barra",
                  v: 10,
                  max: 10,
                  c: BAR_COLORS[s.rows.length % BAR_COLORS.length]!,
                });
            })
          }
        >
          <Plus /> Barra
        </Button>
      )}
    </div>
  );
}

function NumSection({
  section,
  edit,
  change,
}: {
  section: Extract<Section, { type: "num" }>;
  edit: boolean;
  change: SectionChange;
}) {
  const { pushRoll } = useRpg();
  // Short labels (FOR, DES…) read best as tiles; longer ones as a list.
  const tiles = !edit && section.rows.length > 0 && section.rows.every((r) => r.l.length <= 4);

  const setVal = (rid: string, v: string) =>
    change((s) => {
      if (s.type !== "num") return;
      const row = s.rows.find((x) => x.id === rid);
      if (row) row.v = v;
    });

  const firstDie = section.rows[0]?.die ?? 20;
  const sharedDie =
    section.rows.length > 0 && section.rows.every((row) => (row.die ?? 20) === firstDie)
      ? String(firstDie)
      : "";

  const roll = (label: string, v: number | string, sides = 20) => {
    const r = rollCheck(label || "Teste", parseInt(String(v)) || 0, sides);
    pushRoll(r);
    showRoll(r);
  };

  if (tiles)
    return (
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {section.rows.map((r) => (
          <div
            key={r.id}
            className="group relative flex flex-col items-center rounded-xl border border-border bg-background/40 px-2 pb-2 pt-2.5"
          >
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
              onClick={() => roll(r.l, r.v, r.die ?? 20)}
              className="mt-1 flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              aria-label={`Rolar d${r.die ?? 20} + ${r.l}`}
            >
              <Dices className="size-3" /> d{r.die ?? 20}
            </button>
          </div>
        ))}
      </div>
    );

  return (
    <div className="divide-y divide-border">
      {edit && (
        <div className="flex items-center justify-between gap-3 pb-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Dado para todos os atributos</p>
            <p className="text-xs text-muted-foreground">Aplica a escolha a todos nesta seção.</p>
          </div>
          <DiePicker
            value={sharedDie ? Number(sharedDie) : null}
            label="Dado para todos os atributos"
            onChange={(sides) =>
              change((s) => {
                if (s.type === "num") s.rows.forEach((row) => void (row.die = sides));
              })
            }
          />
        </div>
      )}
      {section.rows.map((r) => (
        <div key={r.id} className="flex items-center gap-2 py-2">
          {edit ? (
            <input
              className="field-bare flex-1"
              value={r.l}
              placeholder="Nome"
              onChange={(e) =>
                change((s) => {
                  if (s.type === "num") {
                    const row = s.rows.find((x) => x.id === r.id);
                    if (row) row.l = e.target.value;
                  }
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
            <>
              <DiePicker
                value={r.die ?? 20}
                label={`Dado de teste para ${r.l || "atributo"}`}
                onChange={(sides) =>
                  change((s) => {
                    if (s.type === "num") {
                      const row = s.rows.find((x) => x.id === r.id);
                      if (row) row.die = sides;
                    }
                  })
                }
                compact
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remover ${r.l || "atributo"}`}
                onClick={() =>
                  change((s) => {
                    if (s.type === "num") s.rows = s.rows.filter((x) => x.id !== r.id);
                  })
                }
              >
                <X />
              </Button>
            </>
          ) : (
            <Button
              size="icon-sm"
              variant="soft"
              onClick={() => roll(r.l, r.v, r.die ?? 20)}
              aria-label={`Rolar d${r.die ?? 20} + ${r.l}`}
            >
              <span className="flex items-center gap-1">
                <Dices />d{r.die ?? 20}
              </span>
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
              change((s) => {
                if (s.type === "num")
                  s.rows.push({ id: uid(), l: "", v: 0, die: s.rows[0]?.die ?? 20 });
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

const CHIP =
  "rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold leading-tight text-primary";
/** Multi-line text that grows with its content instead of scrolling sideways. */
const GROW = "w-full resize-none bg-transparent outline-none [field-sizing:content]";

function ListSection({
  section,
  edit,
  change,
}: {
  section: Extract<Section, { type: "list" }>;
  edit: boolean;
  change: SectionChange;
}) {
  const [draft, setDraft] = useState("");

  const setRow = (
    rid: string,
    fn: (r: Extract<Section, { type: "list" }>["rows"][number]) => void,
  ) =>
    change((s) => {
      if (s.type !== "list") return;
      const row = s.rows.find((x) => x.id === rid);
      if (row) fn(row);
    });

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    change((s) => {
      if (s.type === "list") s.rows.push({ id: uid(), l: name, v: "1" });
    });
    setDraft("");
  };

  return (
    <div>
      {section.rows.length === 0 && (
        <p className="mb-3 text-sm text-muted-foreground">Nada aqui ainda.</p>
      )}
      <ul className="divide-y divide-border">
        {section.rows.map((r) => {
          const tags = (r.tags ?? []).map((t) => t.trim()).filter(Boolean);
          return (
            <li key={r.id} className="flex items-start gap-2 py-2">
              <div className="min-w-0 flex-1">
                {edit ? (
                  <input
                    className="field-bare border-transparent font-semibold"
                    value={r.l}
                    placeholder="Item"
                    onChange={(e) => setRow(r.id, (x) => void (x.l = e.target.value))}
                  />
                ) : (
                  <p className="font-semibold">{r.l || "Item sem nome"}</p>
                )}
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
                {edit ? (
                  <textarea
                    rows={1}
                    className={cn(
                      GROW,
                      "mt-1 text-sm leading-snug text-muted-foreground focus:text-foreground",
                    )}
                    value={r.d ?? ""}
                    placeholder="Descrição (opcional)"
                    aria-label={`Descrição de ${r.l}`}
                    onChange={(e) => setRow(r.id, (x) => void (x.d = e.target.value))}
                  />
                ) : r.d ? (
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">{r.d}</p>
                ) : null}
              </div>
              <span className="pt-2 text-xs text-muted-foreground">×</span>
              <input
                className="mt-0.5 h-8 w-14 rounded-lg border border-input bg-background/50 px-1 text-center text-sm font-semibold outline-none focus:border-primary sm:w-20"
                value={r.v}
                placeholder="qtd"
                aria-label={`Quantidade de ${r.l}`}
                onChange={(e) => setRow(r.id, (x) => void (x.v = e.target.value))}
              />
              {edit && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remover ${r.l}`}
                  className="mt-0.5 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    change((s) => {
                      if (s.type === "list") s.rows = s.rows.filter((x) => x.id !== r.id);
                    })
                  }
                >
                  <X />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {edit && (
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
      )}
    </div>
  );
}

function FeatSection({
  section,
  edit,
  change,
}: {
  section: Extract<Section, { type: "feat" }>;
  edit: boolean;
  change: SectionChange;
}) {
  const setRow = (
    rid: string,
    fn: (r: Extract<Section, { type: "feat" }>["rows"][number]) => void,
  ) =>
    change((s) => {
      if (s.type !== "feat") return;
      const row = s.rows.find((x) => x.id === rid);
      if (row) fn(row);
    });

  return (
    <div className="space-y-2.5">
      {section.rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma habilidade ainda.</p>
      )}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {section.rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2">
              {edit ? (
                <input
                  className="field-bare min-w-0 flex-1 border-transparent font-semibold"
                  value={r.l}
                  placeholder="Nome da habilidade"
                  onChange={(e) => setRow(r.id, (x) => void (x.l = e.target.value))}
                />
              ) : (
                <span className="min-w-0 flex-1 font-semibold">{r.l || "Habilidade sem nome"}</span>
              )}
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
                      change((s) => {
                        if (s.type === "feat") s.rows = s.rows.filter((x) => x.id !== r.id);
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
            {edit ? (
              <textarea
                rows={1}
                className={cn(
                  GROW,
                  "mt-1 text-sm leading-relaxed text-muted-foreground focus:text-foreground",
                )}
                value={r.d}
                placeholder="O que essa habilidade faz…"
                aria-label={`Descrição de ${r.l}`}
                onChange={(e) => setRow(r.id, (x) => void (x.d = e.target.value))}
              />
            ) : r.d ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.d}</p>
            ) : null}
          </div>
        ))}
      </div>
      {edit && (
        <Button
          size="sm"
          variant="soft"
          onClick={() =>
            change((s) => {
              if (s.type === "feat") s.rows.push({ id: uid(), l: "", tag: "", d: "" });
            })
          }
        >
          <Plus /> Habilidade
        </Button>
      )}
    </div>
  );
}
