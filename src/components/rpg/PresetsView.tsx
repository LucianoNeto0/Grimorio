import { useNavigate } from "@tanstack/react-router";
import { FilePlus2, Save, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { baseSheet, clone, describePreset, stripSheet, uid } from "@/lib/rpg/sheet";
import { useRpg } from "@/lib/rpg/useRpg";
import { cn } from "@/lib/utils";

import { Loading, PageTitle } from "./AppShell";
import { ConfirmButton } from "./ConfirmButton";

export function PresetsView() {
  const {
    ready,
    sheet,
    replaceSheet,
    presets,
    setPresets,
    activeId,
    setActiveId,
    activePreset,
    isDirty,
    saveActive,
  } = useRpg();
  const [name, setName] = useState("");
  const navigate = useNavigate();

  if (!ready) return <Loading />;

  const saveNew = (blank: boolean) => {
    const n = name.trim();
    if (!n) {
      toast("Dê um nome primeiro");
      return;
    }
    const p = {
      id: uid(),
      name: n,
      data: blank ? stripSheet(sheet) : clone(sheet),
      updatedAt: Date.now(),
    };
    setPresets([...presets, p]);
    if (!blank) setActiveId(p.id);
    setName("");
    toast.success(blank ? "Modelo em branco salvo" : `“${n}” salvo`);
  };

  return (
    <div className="space-y-4">
      <PageTitle
        title="Personagens"
        subtitle="Guarde fichas prontas ou modelos em branco para novos personagens."
      />

      {activePreset && (
        <section className="panel flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Em uso agora</p>
            <p className="truncate font-display text-lg font-semibold">{activePreset.name}</p>
            <p className="text-xs text-muted-foreground">
              {isDirty ? "Há alterações não salvas" : "Tudo salvo"}
            </p>
          </div>
          <Button disabled={!isDirty} onClick={saveActive}>
            <Save /> Salvar alterações
          </Button>
        </section>
      )}

      <section className="panel p-4 sm:p-5">
        <h2 className="section-title mb-1">Salvar ficha atual</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Como está (personagem pronto) ou em branco (modelo de sistema).
        </p>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveNew(false);
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (ex.: Aria, D&D 5e, Tormenta)"
            className="h-10 rounded-xl"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              <Save /> Salvar como está
            </Button>
            <Button type="button" variant="outline" onClick={() => saveNew(true)}>
              <FilePlus2 /> Salvar em branco
            </Button>
          </div>
        </form>
      </section>

      <section className="panel p-4 sm:p-5">
        <h2 className="section-title mb-3">Meus personagens</h2>
        {presets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
            <UserRound className="size-8" />
            <p className="text-sm">Nenhum personagem salvo ainda.</p>
          </div>
        ) : (
          <ul className="grid min-w-0 gap-2 md:grid-cols-2">
            {presets.map((p) => {
              const on = p.id === activeId;
              return (
                <li
                  key={p.id}
                  className={cn(
                    "flex min-w-0 items-center gap-3 rounded-xl border border-border p-3",
                    on && "border-primary bg-primary-soft",
                  )}
                >
                  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
                    {p.data.photo ? (
                      <img src={p.data.photo} alt="" className="size-full object-cover" />
                    ) : (
                      <UserRound className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {on ? "Em uso" : describePreset(p.data)}
                    </p>
                  </div>
                  {!on && (
                    <ConfirmButton
                      size="sm"
                      variant="soft"
                      confirmLabel="Abrir?"
                      onConfirm={() => {
                        replaceSheet(clone(p.data));
                        setActiveId(p.id);
                        toast.success(`“${p.name}” aberto`);
                        void navigate({ to: "/" });
                      }}
                    >
                      Abrir
                    </ConfirmButton>
                  )}
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    confirmLabel="Apagar?"
                    aria-label={`Apagar ${p.name}`}
                    onConfirm={() => {
                      setPresets(presets.filter((x) => x.id !== p.id));
                      if (on) setActiveId(null);
                    }}
                  >
                    <Trash2 />
                  </ConfirmButton>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel p-4 sm:p-5">
        <h2 className="section-title mb-3">Ficha aberta</h2>
        <div className="flex flex-wrap gap-2">
          <ConfirmButton
            variant="outline"
            onConfirm={() => {
              replaceSheet(stripSheet(sheet));
              void navigate({ to: "/" });
            }}
          >
            Limpar valores
          </ConfirmButton>
          <ConfirmButton
            variant="outline"
            onConfirm={() => {
              replaceSheet(baseSheet());
              setActiveId(null);
              void navigate({ to: "/" });
            }}
          >
            Restaurar padrão
          </ConfirmButton>
        </div>
      </section>
    </div>
  );
}
