import { Link } from "@tanstack/react-router";
import { AlignLeft, BarChart3, Check, Hash, List, Pencil, Plus, ScrollText, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { newSection, uid, type SectionType } from "@/lib/rpg/sheet";
import { useRpg } from "@/lib/rpg/store";

import { AiDialog } from "./AiDialog";
import { Loading } from "./AppShell";
import { Portrait } from "./Portrait";
import { SectionCard } from "./SheetSections";

const NEW_SECTIONS: { type: SectionType; label: string; icon: typeof Hash }[] = [
  { type: "num", label: "Números", icon: Hash },
  { type: "list", label: "Lista", icon: List },
  { type: "feat", label: "Habilidades", icon: ScrollText },
  { type: "bar", label: "Barras", icon: BarChart3 },
  { type: "text", label: "Texto", icon: AlignLeft },
];

export function SheetView() {
  const { ready, sheet, update, activePreset } = useRpg();
  const [edit, setEdit] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  if (!ready) return <Loading />;

  const name = sheet.head[0]?.v.trim();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="hero" onClick={() => setAiOpen(true)}>
          <Sparkles /> Criar com IA
        </Button>
        <Button variant={edit ? "default" : "outline"} onClick={() => setEdit((e) => !e)}>
          {edit ? <Check /> : <Pencil />}
          {edit ? "Concluir edição" : "Editar estrutura"}
        </Button>
        {!activePreset && (
          <Link to="/personagens" className="ml-auto text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
            Guardar este personagem →
          </Link>
        )}
      </div>

      {/* Identity */}
      <section className="panel relative overflow-hidden p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary-soft blur-2xl" />
        <div className="relative flex flex-col items-center gap-4 min-[420px]:flex-row min-[420px]:items-start sm:gap-6">
          <Portrait />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{activePreset ? activePreset.name : "Personagem"}</p>
            <h1 className="mb-3 truncate text-2xl font-semibold sm:text-3xl">{name || "Sem nome"}</h1>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
              {sheet.head.map((f, i) => (
                <div key={f.id} className="min-w-0">
                  {edit ? (
                    <div className="flex items-center gap-1">
                      <input
                        className="field-bare text-xs font-bold uppercase tracking-wider text-muted-foreground"
                        value={f.l}
                        aria-label="Nome do campo"
                        onChange={(e) => update((d) => void (d.head[i]!.l = e.target.value))}
                      />
                      <Button size="icon-sm" variant="ghost" aria-label="Remover campo" onClick={() => update((d) => void d.head.splice(i, 1))}>
                        <X />
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor={`head-${f.id}`} className="eyebrow">
                      {f.l}
                    </label>
                  )}
                  <textarea
                    id={`head-${f.id}`}
                    rows={1}
                    className="field-bare resize-none font-semibold leading-snug [field-sizing:content]"
                    value={f.v}
                    placeholder="—"
                    onChange={(e) => update((d) => void (d.head[i]!.v = e.target.value))}
                  />
                </div>
              ))}
            </div>
            {edit && (
              <Button
                size="sm"
                variant="soft"
                className="mt-3"
                onClick={() => update((d) => void d.head.push({ id: uid(), l: "Novo campo", v: "" }))}
              >
                <Plus /> Campo
              </Button>
            )}
          </div>
        </div>
      </section>

      {sheet.secs.map((s, i) => (
        <SectionCard key={s.id} section={s} index={i} edit={edit} />
      ))}

      {edit && (
        <section className="rounded-2xl border-2 border-dashed border-border p-4">
          <p className="section-title mb-3">Nova seção</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {NEW_SECTIONS.map(({ type, label, icon: Icon }) => (
              <Button key={type} variant="tile" className="h-16 flex-col gap-1" onClick={() => update((d) => void d.secs.push(newSection(type)))}>
                <Icon className="text-primary" />
                {label}
              </Button>
            ))}
          </div>
        </section>
      )}

      <AiDialog open={aiOpen} onOpenChange={setAiOpen} />
    </div>
  );
}
