import { createContext } from "react";

import type { RollResult } from "./dice";
import type { Preset, Sheet } from "./sheet";
import type { SavedTheme, ThemeSettings } from "./theme";

export type HistoryEntry = {
  id: string;
  text: string;
  total: number;
  crit?: "max" | "min" | undefined;
  at: number;
};

export type RpgStore = {
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

export const RpgContext = createContext<RpgStore | null>(null);
