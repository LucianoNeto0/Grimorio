import type { GeneratedCharacter } from "./ai/types";
import { uid, type FeatRow, type Sheet } from "./sheet";

const SEPARATORS = [" — ", " – ", " - ", " (", ": ", "; ", ", ", ". ", " com "];

/**
 * Keeps a field to one short fact. When the text is too long, returns the part
 * before the first separator and the leftover detail, so nothing is lost.
 */
export function splitLong(value: string, max: number): [string, string] {
  const v = value.trim().replace(/\s+/g, " ");
  if (v.length <= max) return [v, ""];
  let cut = -1;
  for (const sep of SEPARATORS) {
    const i = v.indexOf(sep);
    if (i >= 2 && i <= max && (cut === -1 || i < cut)) cut = i;
  }
  if (cut === -1) {
    const space = v.lastIndexOf(" ", max);
    return [`${v.slice(0, space > 2 ? space : max).trim()}…`, v];
  }
  const rest = v
    .slice(cut)
    .replace(/^[\s—–\-(:;,.]+/, "")
    .replace(/^com\s+/i, "")
    .replace(/\)\s*$/, "")
    .trim();
  return [v.slice(0, cut).trim(), rest];
}

const clean = (v: string) => v.trim().replace(/\s+/g, " ");

/** Turns the AI's character into a full sheet, keeping the current portrait. */
export function sheetFromAi(c: GeneratedCharacter, photo?: string): Sheet {
  const vida = Math.max(1, Math.round(c.vida));
  const mana = Math.max(0, Math.round(c.mana));
  const nivel = Math.max(1, Math.min(30, Math.round(c.nivel) || 1));

  // Any detail the AI squeezed into the header becomes its own ability card.
  const overflow: FeatRow[] = [];
  const head = (value: string, max: number, origin: string) => {
    const [short, rest] = splitLong(value, max);
    if (rest) overflow.push({ id: uid(), l: short.replace(/…$/, ""), tag: origin, d: rest });
    return short;
  };

  const feats: FeatRow[] = c.habilidades.map((h) => {
    const [name, rest] = splitLong(h.nome, 36);
    return {
      id: uid(),
      l: name,
      tag: clean(h.origem),
      d: [rest, clean(h.descricao)].filter(Boolean).join(" — "),
    };
  });

  const sheet: Sheet = {
    head: [
      { id: uid(), l: "Nome", v: head(c.nome, 40, "Personagem") },
      { id: uid(), l: "Raça", v: head(c.raca, 28, "Raça") },
      { id: uid(), l: "Classe / Arquétipo", v: head(c.classe, 32, "Classe") },
      { id: uid(), l: "Nível", v: String(nivel) },
    ],
    secs: [
      {
        id: uid(),
        t: "Barras",
        type: "bar",
        rows: [
          { id: uid(), l: "Vida", v: vida, max: vida, c: "#c0392b" },
          ...(mana > 0 ? [{ id: uid(), l: "Mana", v: mana, max: mana, c: "#2e6fd0" }] : []),
        ],
      },
      {
        id: uid(),
        t: "Atributos",
        type: "num",
        rows: c.atributos.map((a) => ({
          id: uid(),
          l: splitLong(a.nome, 12)[0],
          v: Math.round(a.valor),
        })),
      },
      {
        id: uid(),
        t: "Perícias",
        type: "num",
        rows: c.pericias.map((a) => ({
          id: uid(),
          l: splitLong(a.nome, 24)[0],
          v: Math.round(a.valor),
        })),
      },
      { id: uid(), t: "Habilidades e traços", type: "feat", rows: [...overflow, ...feats] },
      {
        id: uid(),
        t: "Itens",
        type: "list",
        rows: c.itens.map((i) => {
          const [name, rest] = splitLong(i.nome, 32);
          const tags = [clean(i.bonus), clean(i.dano)].filter(Boolean);
          const d = [rest, clean(i.descricao)].filter(Boolean).join(" — ");
          return {
            id: uid(),
            l: name,
            v: String(Math.max(1, Math.round(i.quantidade) || 1)),
            ...(tags.length ? { tags } : {}),
            ...(d ? { d } : {}),
          };
        }),
      },
      { id: uid(), t: "História", type: "text", text: c.historia.trim() },
      { id: uid(), t: "Anotações", type: "text", text: "" },
    ],
  };
  if (photo) sheet.photo = photo;
  return sheet;
}
