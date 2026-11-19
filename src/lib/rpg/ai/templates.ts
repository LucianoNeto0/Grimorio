import type { GeneratedCharacter } from "./types";

export type TemplateInput = { idea: string; system: string; level: number };

/** A neutral editable starting sheet; it deliberately does not apply system rules. */
export function createTemplateCharacter(input: TemplateInput): GeneratedCharacter {
  const level = Math.min(30, Math.max(1, Math.trunc(input.level) || 1));
  const clean = (value: string) =>
    Array.from(value, (character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 ? " " : character;
    })
      .join("")
      .trim();
  const idea = clean(input.idea).slice(0, 1200);
  const system = clean(input.system).slice(0, 60);
  return {
    nome: "Novo personagem",
    raca: "A definir",
    classe: "A definir",
    nivel: level,
    vida: 10,
    mana: 0,
    atributos: [
      { nome: "FOR", valor: 10 },
      { nome: "DES", valor: 10 },
      { nome: "CON", valor: 10 },
      { nome: "INT", valor: 10 },
      { nome: "SAB", valor: 10 },
      { nome: "CAR", valor: 10 },
    ],
    pericias: [],
    habilidades: [],
    itens: [],
    historia:
      `Modelo inicial para ${system || "sistema a definir"}, nível ${level}. Ideia original: ${idea}`.slice(
        0,
        8000,
      ),
  };
}
