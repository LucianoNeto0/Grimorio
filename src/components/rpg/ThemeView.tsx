import { Check, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { uid } from "@/lib/rpg/sheet";
import { shrinkImage } from "@/lib/rpg/storage";
import { useRpg } from "@/lib/rpg/useRpg";
import { PALETTES, type PaletteKey, type ThemeSettings } from "@/lib/rpg/theme";
import { cn } from "@/lib/utils";

import { Loading, PageTitle } from "./AppShell";
import { ConfirmButton } from "./ConfirmButton";

const COLOR_FIELDS: { key: "tx" | "card" | "ac" | "bg"; label: string }[] = [
  { key: "ac", label: "Destaque (botões e realces)" },
  { key: "bg", label: "Fundo" },
  { key: "card", label: "Seções" },
  { key: "tx", label: "Letras" },
];

export function ThemeView() {
  const { ready, theme, setTheme, patchTheme, themes, setThemes } = useRpg();
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");

  if (!ready) return <Loading />;

  const cur = PALETTES[theme?.pal ?? "pergaminho"];

  return (
    <div className="space-y-4">
      <PageTitle title="Visual" subtitle="Deixe a ficha com a cara da sua campanha." />

      <section className="panel p-4 sm:p-5">
        <h2 className="section-title mb-3">Tema</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <ThemeCard
            label="Automático"
            active={!theme}
            onClick={() => setTheme(null)}
            swatch={[PALETTES.pergaminho, PALETTES.noite]}
          />
          {(Object.keys(PALETTES) as PaletteKey[]).map((k) => (
            <ThemeCard
              key={k}
              label={PALETTES[k].name}
              active={!!theme && theme.pal === k}
              swatch={[PALETTES[k]]}
              onClick={() => setTheme({ pal: k, dim: theme?.dim ?? 60, img: theme?.img ?? null })}
            />
          ))}
        </div>
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Cores personalizadas</h2>
          {theme && (theme.ac || theme.bg || theme.card || theme.tx) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => patchTheme({ ac: null, bg: null, card: null, tx: null })}
            >
              Restaurar
            </Button>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {COLOR_FIELDS.map(({ key, label }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
            >
              <span className="text-sm font-semibold">{label}</span>
              <input
                type="color"
                className="size-9 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                value={theme?.[key] ?? cur[key]}
                onChange={(e) => patchTheme({ [key]: e.target.value } as Partial<ThemeSettings>)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="panel p-4 sm:p-5">
        <h2 className="section-title mb-3">Imagem de fundo</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => file.current?.click()}>
            <ImagePlus /> {theme?.img ? "Trocar imagem" : "Escolher imagem"}
          </Button>
          {theme?.img && (
            <Button variant="outline" onClick={() => patchTheme({ img: null })}>
              Remover
            </Button>
          )}
        </div>
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              patchTheme({ img: await shrinkImage(f, 1000, 0.72) });
              toast.success("Fundo aplicado");
            } catch {
              toast.error("Não consegui abrir essa imagem");
            }
          }}
        />
        {theme?.img && (
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-semibold">Cobertura da cor</span>
              <span className="tabular-nums text-muted-foreground">{theme.dim ?? 60}%</span>
            </div>
            <Slider
              min={0}
              max={95}
              step={1}
              value={[theme.dim ?? 60]}
              onValueChange={(v) => patchTheme({ dim: v[0] ?? 60 })}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Quanto maior, mais discreta a imagem e mais fácil de ler.
            </p>
          </div>
        )}
      </section>

      <section className="panel p-4 sm:p-5">
        <h2 className="section-title mb-1">Meus visuais</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Salve o visual atual para voltar a ele quando quiser.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) {
              toast("Dê um nome ao visual");
              return;
            }
            setThemes([
              ...themes,
              { id: uid(), name: n, t: theme ? JSON.parse(JSON.stringify(theme)) : null },
            ]);
            setName("");
            toast.success("Visual salvo");
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Masmorra sombria"
            className="h-9 rounded-xl"
          />
          <Button type="submit">Salvar</Button>
        </form>
        {themes.length > 0 && (
          <ul className="mt-3 divide-y divide-border">
            {themes.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-2">
                <span className="flex-1 font-medium">{s.name}</span>
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => {
                    setTheme(s.t);
                    toast.success("Visual aplicado");
                  }}
                >
                  Usar
                </Button>
                <ConfirmButton
                  size="sm"
                  variant="ghost"
                  confirmLabel="Apagar?"
                  aria-label={`Apagar ${s.name}`}
                  onConfirm={() => setThemes(themes.filter((x) => x.id !== s.id))}
                >
                  <Trash2 />
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ThemeCard({
  label,
  active,
  onClick,
  swatch,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  swatch: { bg: string; card: string; tx: string; ac: string }[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border-2 border-border text-left transition-all hover:-translate-y-0.5",
        active && "border-primary shadow-[var(--shadow-glow)]",
      )}
    >
      <div className="flex h-16">
        {swatch.map((p, i) => (
          <div key={i} className="flex flex-1 items-end gap-1 p-2" style={{ background: p.bg }}>
            <span className="h-7 flex-1 rounded-md" style={{ background: p.card }} />
            <span className="size-4 rounded-full" style={{ background: p.ac }} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between bg-card px-2.5 py-1.5 text-sm font-semibold">
        {label}
        {active && <Check className="size-4 text-primary" />}
      </div>
    </button>
  );
}
