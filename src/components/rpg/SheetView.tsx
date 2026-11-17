import { Link } from "@tanstack/react-router";
import {
  AlignLeft,
  BarChart3,
  Check,
  Hash,
  List,
  Pencil,
  Plus,
  ScrollText,
  Sparkles,
  X,
} from "lucide-react";
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
import { clone, newSection, uid, type HeadField, type SectionType } from "@/lib/rpg/sheet";
import { useRpg } from "@/lib/rpg/useRpg";

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
  const [aiOpen, setAiOpen] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);

  if (!ready) return <Loading />;

  const aiEnabled = import.meta.env.VITE_ENABLE_AI === "true";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {aiEnabled && (
          <Button variant="hero" onClick={() => setAiOpen(true)}>
            <Sparkles /> Criar com IA
          </Button>
        )}
        {!activePreset && (
          <Link
            to="/personagens"
            className="ml-auto text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Guardar este personagem →
          </Link>
        )}
      </div>

      <IdentityFields />

      {sheet.secs.map((s, i) => (
        <SectionCard key={s.id} section={s} index={i} />
      ))}

      <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova seção</DialogTitle>
            <DialogDescription>
              Escolha o tipo de conteúdo que deseja adicionar à ficha.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {NEW_SECTIONS.map(({ type, label, icon: Icon }) => (
              <Button
                key={type}
                variant="tile"
                className="h-16 flex-col gap-1"
                onClick={() => {
                  const section = newSection(type);
                  update((d) => void d.secs.push(section));
                  setAddSectionOpen(false);
                  requestAnimationFrame(() =>
                    document
                      .querySelector(`[data-section-id="${section.id}"]`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" }),
                  );
                }}
              >
                <Icon className="text-primary" />
                {label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Button
        size="icon"
        variant="hero"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-20 size-12 rounded-full shadow-[var(--shadow-glow)] md:bottom-6"
        aria-label="Adicionar seção à ficha"
        title="Adicionar seção"
        onClick={() => setAddSectionOpen(true)}
      >
        <Plus className="size-5" />
      </Button>

      {aiEnabled && <AiDialog open={aiOpen} onOpenChange={setAiOpen} />}
    </div>
  );
}

function IdentityFields() {
  const { sheet, update, activePreset } = useRpg();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<HeadField[]>(() => clone(sheet.head));
  const [confirm, setConfirm] = useState<"edit" | "save" | "discard" | null>(null);
  const fields = editing ? draft : sheet.head;

  const changeField = (id: string, change: (field: HeadField) => void) => {
    if (editing) {
      setDraft((current) => {
        const next = clone(current);
        const field = next.find((item) => item.id === id);
        if (field) change(field);
        return next;
      });
      return;
    }
    update((current) => {
      const field = current.head.find((item) => item.id === id);
      if (field) change(field);
    });
  };

  const confirmAction = () => {
    if (confirm === "edit") {
      setDraft(clone(sheet.head));
      setEditing(true);
    } else if (confirm === "save") {
      update((current) => void (current.head = clone(draft)));
      setEditing(false);
    } else if (confirm === "discard") {
      setDraft(clone(sheet.head));
      setEditing(false);
    }
    setConfirm(null);
  };

  const prompt =
    confirm === "edit"
      ? {
          title: "Editar os campos do personagem?",
          description:
            "Você poderá renomear, adicionar e remover campos. As mudanças ficam em rascunho até salvar.",
          action: "Editar campos",
        }
      : confirm === "save"
        ? {
            title: "Salvar alterações?",
            description: "Os campos de identidade serão atualizados na ficha.",
            action: "Salvar alterações",
          }
        : confirm === "discard"
          ? {
              title: "Descartar alterações?",
              description: "O rascunho dos campos será descartado.",
              action: "Descartar",
            }
          : null;

  return (
    <section className="panel relative overflow-hidden p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary-soft blur-2xl" />
      <div className="relative flex flex-col items-center gap-4 min-[420px]:flex-row min-[420px]:items-start sm:gap-6">
        <Portrait />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">{activePreset ? activePreset.name : "Personagem"}</p>
            {!editing && (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Editar campos do personagem"
                title="Editar campos do personagem"
                onClick={() => setConfirm("edit")}
              >
                <Pencil />
              </Button>
            )}
          </div>
          <h1 className="mb-3 truncate text-2xl font-semibold sm:text-3xl">
            {fields[0]?.v.trim() || "Sem nome"}
          </h1>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.id} className="min-w-0">
                {editing ? (
                  <div className="flex items-center gap-1">
                    <input
                      className="field-bare text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      value={field.l}
                      aria-label="Nome do campo"
                      onChange={(e) => changeField(field.id, (f) => void (f.l = e.target.value))}
                    />
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Remover campo"
                      onClick={() =>
                        setDraft((current) => current.filter((f) => f.id !== field.id))
                      }
                    >
                      <X />
                    </Button>
                  </div>
                ) : (
                  <label htmlFor={`head-${field.id}`} className="eyebrow">
                    {field.l}
                  </label>
                )}
                <textarea
                  id={`head-${field.id}`}
                  rows={1}
                  className="field-bare resize-none font-semibold leading-snug [field-sizing:content]"
                  value={field.v}
                  placeholder="—"
                  onChange={(e) => changeField(field.id, (f) => void (f.v = e.target.value))}
                />
              </div>
            ))}
          </div>
          {editing && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="soft"
                onClick={() =>
                  setDraft((current) => [...current, { id: uid(), l: "Novo campo", v: "" }])
                }
              >
                <Plus /> Campo
              </Button>
              <Button size="sm" onClick={() => setConfirm("save")}>
                <Check /> Salvar campos
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirm("discard")}>
                Cancelar edição
              </Button>
            </div>
          )}
        </div>
      </div>
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
              variant={confirm === "discard" ? "destructive" : "default"}
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
