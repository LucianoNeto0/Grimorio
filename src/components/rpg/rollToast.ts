import { toast } from "sonner";

import type { RollResult } from "@/lib/rpg/dice";

export function showRoll(r: RollResult) {
  const title =
    r.crit === "max"
      ? `${r.total} · Crítico!`
      : r.crit === "min"
        ? `${r.total} · Falha crítica`
        : String(r.total);
  toast(title, { description: r.text, duration: 2600 });
}
