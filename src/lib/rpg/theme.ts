export type PaletteKey = "pergaminho" | "noite" | "floresta" | "oceano" | "rubi" | "arcano";

/** Hex approximations of the CSS palettes, used for previews and color-picker defaults. */
export const PALETTES: Record<
  PaletteKey,
  { name: string; bg: string; card: string; tx: string; ac: string; dark: boolean }
> = {
  pergaminho: { name: "Pergaminho", bg: "#f3ede3", card: "#fdfaf4", tx: "#2b241e", ac: "#8b3a2f", dark: false },
  noite: { name: "Noite", bg: "#1a1715", card: "#25211f", tx: "#efe8de", ac: "#e0745f", dark: true },
  floresta: { name: "Floresta", bg: "#ebf2ea", card: "#fafdf9", tx: "#1d2b20", ac: "#2f7d4a", dark: false },
  oceano: { name: "Oceano", bg: "#0f1c2c", card: "#172739", tx: "#e6eef7", ac: "#4aa8e0", dark: true },
  rubi: { name: "Rubi", bg: "#faeef0", card: "#fffdfd", tx: "#2e1519", ac: "#c2185b", dark: false },
  arcano: { name: "Arcano", bg: "#1b1428", card: "#271d38", tx: "#f0e9fb", ac: "#a97bff", dark: true },
};

export type ThemeSettings = {
  pal: PaletteKey;
  tx?: string | null;
  card?: string | null;
  ac?: string | null;
  bg?: string | null;
  img?: string | null;
  dim?: number;
};

export type SavedTheme = { id: string; name: string; t: ThemeSettings | null };

const LEGACY: Record<string, PaletteKey> = {
  Pergaminho: "pergaminho",
  Noite: "noite",
  Floresta: "floresta",
  Oceano: "oceano",
  Rubi: "rubi",
  Arcano: "arcano",
};

/** Accepts themes saved by the original single-file sheet (capitalized palette names). */
export function normalizeTheme(t: ThemeSettings | null): ThemeSettings | null {
  if (!t) return null;
  const pal = (LEGACY[t.pal] ?? t.pal) as PaletteKey;
  return { ...t, pal: PALETTES[pal] ? pal : "pergaminho" };
}

export function applyTheme(t: ThemeSettings | null) {
  const root = document.documentElement;
  const st = root.style;
  ["--foreground", "--card", "--primary", "--background", "--bg-image", "--bg-dim"].forEach((k) =>
    st.removeProperty(k),
  );
  if (!t) {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", t.pal);
  if (t.tx) st.setProperty("--foreground", t.tx);
  if (t.card) st.setProperty("--card", t.card);
  if (t.ac) st.setProperty("--primary", t.ac);
  if (t.bg) st.setProperty("--background", t.bg);
  if (t.img) {
    st.setProperty("--bg-image", `url("${t.img}")`);
    st.setProperty("--bg-dim", `${t.dim ?? 60}%`);
  }
}
