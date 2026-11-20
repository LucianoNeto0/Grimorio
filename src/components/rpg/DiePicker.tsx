import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DICE } from "@/lib/rpg/dice";

export function DiePicker({
  value,
  label,
  onChange,
  compact = false,
}: {
  value: number | null;
  label: string;
  onChange: (sides: number) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={compact ? "h-8 min-w-12 px-2" : "h-9 min-w-20 px-3"}
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        {value ? `d${value}` : "Escolher"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>Escolha um dos dados disponíveis.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {DICE.map((sides) => (
              <Button
                key={sides}
                type="button"
                size="lg"
                variant={value === sides ? "default" : "outline"}
                className="h-12 text-base"
                onClick={() => {
                  onChange(sides);
                  setOpen(false);
                }}
              >
                d{sides}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
