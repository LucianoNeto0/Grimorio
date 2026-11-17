export type HeadField = { id: string; l: string; v: string };
export type NumRow = { id: string; l: string; v: number | string; die?: number };
/** `tags` hold short facts (attack bonus, damage); `d` a one-line description. */
export type ListRow = { id: string; l: string; v: string; tags?: string[]; d?: string };
/** Ability / trait: short name, where it comes from (Raça, Classe…), and its description. */
export type FeatRow = { id: string; l: string; tag: string; d: string };
export type BarRow = { id: string; l: string; v: number; max: number; c: string };

export type Section =
  | { id: string; t: string; type: "num"; rows: NumRow[] }
  | { id: string; t: string; type: "list"; rows: ListRow[] }
  | { id: string; t: string; type: "feat"; rows: FeatRow[] }
  | { id: string; t: string; type: "bar"; rows: BarRow[] }
  | { id: string; t: string; type: "text"; text: string };

export type SectionType = Section["type"];

export type Sheet = { head: HeadField[]; secs: Section[]; photo?: string };

export type Preset = { id: string; name: string; data: Sheet; updatedAt?: number };

export const uid = () => Math.random().toString(36).slice(2, 10);

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const BAR_COLORS = ["#c0392b", "#2e6fd0", "#2e9e5b", "#d4a017", "#8e44ad", "#e67e22"];

export function baseSheet(): Sheet {
  return {
    head: ["Nome", "Raça", "Classe / Arquétipo", "Nível"].map((l) => ({ id: uid(), l, v: "" })),
    secs: [
      {
        id: uid(),
        t: "Barras",
        type: "bar",
        rows: [
          { id: uid(), l: "Vida", v: 10, max: 10, c: "#c0392b" },
          { id: uid(), l: "Mana", v: 10, max: 10, c: "#2e6fd0" },
        ],
      },
      {
        id: uid(),
        t: "Atributos",
        type: "num",
        rows: ["FOR", "DES", "CON", "INT", "SAB", "CAR"].map((l) => ({ id: uid(), l, v: 10 })),
      },
      {
        id: uid(),
        t: "Perícias",
        type: "num",
        rows: ["Furtividade", "Percepção", "Persuasão"].map((l) => ({ id: uid(), l, v: 0 })),
      },
      { id: uid(), t: "Itens", type: "list", rows: [] },
      { id: uid(), t: "Anotações", type: "text", text: "" },
    ],
  };
}

export function newSection(type: SectionType): Section {
  const id = uid();
  if (type === "text") return { id, t: "Nova seção", type, text: "" };
  if (type === "bar") return { id, t: "Nova seção", type, rows: [] };
  if (type === "list") return { id, t: "Nova seção", type, rows: [] };
  if (type === "feat") return { id, t: "Habilidades", type, rows: [] };
  return { id, t: "Nova seção", type, rows: [] };
}

/** Blank template: keeps the structure, clears every value. Bars refill to max. */
export function stripSheet(s: Sheet): Sheet {
  const c = clone(s);
  delete c.photo;
  c.head.forEach((x) => (x.v = ""));
  c.secs.forEach((x) => {
    if (x.type === "num") x.rows.forEach((r) => (r.v = 0));
    if (x.type === "list" || x.type === "feat") x.rows = [];
    if (x.type === "bar") x.rows.forEach((r) => (r.v = r.max));
    if (x.type === "text") x.text = "";
  });
  return c;
}

export const characterName = (s: Sheet) => s.head.find((x) => x.v.trim())?.v.trim() ?? "";

export const describePreset = (s: Sheet) => {
  const filled = s.head.filter((x) => x.v.trim()).map((x) => x.v.trim());
  return filled.length ? filled.slice(0, 3).join(" · ") : "Modelo em branco";
};

export const sameSheet = (a: Sheet, b: Sheet) => JSON.stringify(a) === JSON.stringify(b);

export function clampBar(v: number, max: number) {
  return Math.max(0, Math.min(max, v));
}

/** Ensures data loaded from older versions still has a bar section. */
export function normalizeSheet(s: Sheet | null | undefined): Sheet {
  if (!s || !Array.isArray(s.head) || !Array.isArray(s.secs)) return baseSheet();
  if (!s.secs.some((x) => x.type === "bar")) {
    const bars = baseSheet().secs[0];
    if (bars) s.secs.unshift(bars);
  }
  return s;
}
