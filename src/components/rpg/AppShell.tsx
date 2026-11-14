import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Dices, Palette, Save, Users } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useRpg } from "@/lib/rpg/useRpg";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Ficha", icon: BookOpen },
  { to: "/dados", label: "Dados", icon: Dices },
  { to: "/personagens", label: "Personagens", icon: Users },
  { to: "/visual", label: "Visual", icon: Palette },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { activePreset, isDirty, saveActive, ready } = useRpg();

  return (
    <div className="min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/icon-192.png"
              alt=""
              aria-hidden="true"
              className="size-9 rounded-lg object-cover shadow-[var(--shadow-glow)]"
              width={36}
              height={36}
            />
            <span className="font-display text-lg font-semibold">Grimório</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Seções">
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
                  path === to && "bg-primary-soft text-primary",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto">
            {ready && activePreset && (
              <Button
                size="sm"
                variant={isDirty ? "default" : "ghost"}
                onClick={saveActive}
                disabled={!isDirty}
                title={
                  isDirty
                    ? `Salvar alterações em ${activePreset.name}`
                    : `Tudo salvo em ${activePreset.name}`
                }
              >
                <Save />
                <span className="max-w-32 truncate">{isDirty ? "Salvar" : "Salvo"}</span>
                {isDirty && <span className="size-1.5 rounded-full bg-primary-foreground" />}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pt-5 sm:px-6 lg:pt-7">{children}</main>

      <nav
        aria-label="Seções"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map(({ to, label, icon: Icon }) => {
            const on = path === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-muted-foreground transition-colors",
                  on && "text-primary",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-12 place-items-center rounded-full transition-colors",
                    on && "bg-primary-soft",
                  )}
                >
                  <Icon className="size-[18px]" />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Loading() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="panel h-36 animate-pulse" />
      ))}
    </div>
  );
}
