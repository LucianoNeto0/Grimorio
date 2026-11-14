import { useEffect, useState, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

/** Two-tap confirm: first tap arms the button, second tap runs the action. */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Confirmar?",
  ...props
}: Omit<ButtonProps, "onClick"> & { onConfirm: () => void; children: ReactNode; confirmLabel?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      {...props}
      variant={armed ? "destructive" : props.variant}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
