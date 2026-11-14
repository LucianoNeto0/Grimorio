import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import type { RollResult } from "./dice";
import { baseSheet, clone, normalizeSheet, sameSheet, uid, type Preset, type Sheet } from "./sheet";
import { KEYS, load, save } from "./storage";
import { applyTheme, normalizeTheme, type SavedTheme, type ThemeSettings } from "./theme";

export type HistoryEntry = { id: string; text: string; total: number; crit?: "max" | "min" | undefined; at: number };

type Store = {
  ready: boolean;
  sheet: Sheet;
  /** Mutate a draft of the sheet; the result is saved locally right away. */
  update: (fn: (draft: Sheet) => void) => void;
  replaceSheet: (s: Sheet) => void;
  presets: Preset[];
  setPresets: (p: Preset[]) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  activePreset: Preset | undefined;
  isDirty: boolean;
  saveActive: () => void;
  theme: ThemeSettings | null;
  setTheme: (t: ThemeSettings | null) => void;
  patchTheme: (p: Partial<ThemeSettings>) => void;
  themes: SavedTheme[];
  setThemes: (t: SavedTheme[]) => void;
  history: HistoryEntry[];
  pushRoll: (r: RollResult) => HistoryEntry;
  clearHistory: () => void;
};

const Ctx = createContext<Store | null>(null);

const warnFull = () =>
  toast.error("Sem espaço para salvar", {
    description: "Imagens grandes ocupam muito espaço. Tente uma foto menor.",
  });

export function RpgProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(() => baseSheet());
  const [presets, setPresetsState] = useState<Preset[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [theme, setThemeState] = useState<ThemeSettings | null>(null);
  const [themes, setThemesState] = useState<SavedTheme[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const sheetRef = useRef(sheet);

  useEffect(() => {
    const s = normalizeSheet(load<Sheet | null>(KEYS.sheet, null));
    sheetRef.current = s;
    setSheet(s);
    setPresetsState(load<Preset[]>(KEYS.presets, []));
    setActiveIdState(load<string | null>(KEYS.active, null));
    const t = normalizeTheme(load<ThemeSettings | null>(KEYS.theme, null));
    setThemeState(t);
    applyTheme(t);
    setThemesState(load<SavedTheme[]>(KEYS.themes, []));
    setReady(true);
  }, []);

  const commit = useCallback((s: Sheet) => {
    sheetRef.current = s;
    setSheet(s);
    if (!save(KEYS.sheet, s)) warnFull();
  }, []);

  const update = useCallback(
    (fn: (d: Sheet) => void) => {
      const d = clone(sheetRef.current);
      fn(d);
      commit(d);
    },
    [commit],
  );

  const setPresets = useCallback((p: Preset[]) => {
    setPresetsState(p);
    if (!save(KEYS.presets, p)) warnFull();
  }, []);

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdState(id);
    save(KEYS.active, id);
  }, []);

  const setTheme = useCallback((t: ThemeSettings | null) => {
    setThemeState(t);
    applyTheme(t);
    if (!save(KEYS.theme, t)) warnFull();
  }, []);

  const patchTheme = useCallback(
    (p: Partial<ThemeSettings>) => {
      setThemeState((cur) => {
        const next: ThemeSettings = { ...(cur ?? { pal: "pergaminho", dim: 60 }), ...p };
        applyTheme(next);
        if (!save(KEYS.theme, next)) warnFull();
        return next;
      });
    },
    [],
  );

  const setThemes = useCallback((t: SavedTheme[]) => {
    setThemesState(t);
    if (!save(KEYS.themes, t)) warnFull();
  }, []);

  const activePreset = presets.find((p) => p.id === activeId);
  const isDirty = activePreset ? !sameSheet(activePreset.data, sheet) : false;

  const saveActive = useCallback(() => {
    if (!activePreset) return;
    setPresets(
      presets.map((p) => (p.id === activePreset.id ? { ...p, data: clone(sheetRef.current), updatedAt: Date.now() } : p)),
    );
    toast.success(`Salvo em “${activePreset.name}”`);
  }, [activePreset, presets, setPresets]);

  const pushRoll = useCallback((r: RollResult) => {
    const e: HistoryEntry = { id: uid(), text: r.text, total: r.total, crit: r.crit, at: Date.now() };
    setHistory((h) => [e, ...h].slice(0, 30));
    return e;
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      sheet,
      update,
      replaceSheet: commit,
      presets,
      setPresets,
      activeId,
      setActiveId,
      activePreset,
      isDirty,
      saveActive,
      theme,
      setTheme,
      patchTheme,
      themes,
      setThemes,
      history,
      pushRoll,
      clearHistory: () => setHistory([]),
    }),
    [ready, sheet, update, commit, presets, setPresets, activeId, setActiveId, activePreset, isDirty, saveActive, theme, setTheme, patchTheme, themes, setThemes, history, pushRoll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRpg() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRpg must be used inside RpgProvider");
  return v;
}
