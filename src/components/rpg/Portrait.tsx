import { Camera, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { useRpg } from "@/lib/rpg/store";
import { shrinkImage } from "@/lib/rpg/storage";

export function Portrait() {
  const { sheet, update } = useRpg();
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative grid h-40 w-32 place-items-center overflow-hidden rounded-2xl border-2 border-primary/60 bg-primary-soft text-primary shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5 sm:h-48 sm:w-38"
        aria-label={sheet.photo ? "Trocar foto do personagem" : "Adicionar foto do personagem"}
      >
        {sheet.photo ? (
          <img src={sheet.photo} alt="Foto do personagem" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 px-3 text-center text-xs font-semibold">
            <Camera className="size-6" />
            Adicionar foto
          </span>
        )}
      </button>
      {sheet.photo && (
        <button
          type="button"
          onClick={() => update((d) => void delete d.photo)}
          className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow hover:text-destructive"
          aria-label="Remover foto"
        >
          <X className="size-4" />
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            const url = await shrinkImage(f, 360, 0.82);
            update((d) => void (d.photo = url));
          } catch {
            toast.error("Não consegui abrir essa imagem");
          }
        }}
      />
    </div>
  );
}
