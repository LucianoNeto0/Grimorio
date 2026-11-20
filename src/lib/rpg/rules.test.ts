import { describe, expect, it } from "vitest";

import { rollAdvantage, rollCheck, rollPool } from "./dice";
import type { GeneratedCharacter } from "./ai.functions";
import { sheetFromAi, splitLong } from "./fromAi";
import { baseSheet, clampBar, stripSheet } from "./sheet";
import { MAX_PROFILE_IMAGE_SOURCE_BYTES, profileImageError } from "./storage";
import { MAX_ROLL_HISTORY, prependRollHistory, type HistoryEntry } from "./store-context";

// rng returning fixed values in order; value v maps to face 1 + floor(v * sides)
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length]!;
};

describe("dados", () => {
  it("soma o conjunto de dados mais o modificador", () => {
    // d6 -> 0.5 => 4, 0.0 => 1 ; d20 -> 0.95 => 20
    const r = rollPool({ 6: 2, 20: 1 }, 3, seq(0.5, 0.0, 0.95));
    expect(r?.total).toBe(4 + 1 + 20 + 3);
  });

  it("vantagem fica com o maior d20 e desvantagem com o menor", () => {
    expect(rollAdvantage(1, 0, seq(0.1, 0.6)).total).toBe(13);
    expect(rollAdvantage(-1, 0, seq(0.1, 0.6)).total).toBe(3);
  });

  it("teste da ficha rola d20 + valor do atributo", () => {
    expect(rollCheck("FOR", 5, seq(0.45)).total).toBe(10 + 5);
  });

  it("mantém somente as dez rolagens mais recentes no histórico", () => {
    const history = Array.from({ length: MAX_ROLL_HISTORY }, (_, index): HistoryEntry => ({
      id: String(index),
      text: `d20: ${index}`,
      total: index,
      at: index,
    }));
    const next = prependRollHistory(history, { id: "nova", text: "d20: 20", total: 20, at: 20 });

    expect(next).toHaveLength(MAX_ROLL_HISTORY);
    expect(next[0]?.id).toBe("nova");
    expect(next.at(-1)?.id).toBe("8");
  });
});

describe("imagem de perfil", () => {
  it("recusa formatos não suportados e arquivos muito grandes antes da leitura", () => {
    expect(profileImageError({ type: "image/gif", size: 100 } as File)).toContain("JPG");
    expect(
      profileImageError({ type: "image/jpeg", size: MAX_PROFILE_IMAGE_SOURCE_BYTES + 1 } as File),
    ).toContain("8 MB");
    expect(profileImageError({ type: "image/webp", size: 100 } as File)).toBeNull();
  });
});

describe("ficha", () => {
  it("modelo em branco zera números, esvazia listas e enche as barras", () => {
    const s = baseSheet();
    s.head[0]!.v = "Aria";
    s.photo = "data:x";
    for (const sec of s.secs) {
      if (sec.type === "num") sec.rows.forEach((r) => (r.v = 7));
      if (sec.type === "list") sec.rows.push({ id: "a", l: "Espada", v: "1" });
      if (sec.type === "bar") sec.rows.forEach((r) => (r.v = 2));
      if (sec.type === "text") sec.text = "abc";
    }
    const b = stripSheet(s);
    expect(b.photo).toBeUndefined();
    expect(b.head[0]!.v).toBe("");
    for (const sec of b.secs) {
      if (sec.type === "num") sec.rows.forEach((r) => expect(r.v).toBe(0));
      if (sec.type === "list") expect(sec.rows).toHaveLength(0);
      if (sec.type === "bar") sec.rows.forEach((r) => expect(r.v).toBe(r.max));
      if (sec.type === "text") expect(sec.text).toBe("");
    }
  });

  it("barra nunca passa do máximo nem fica abaixo de zero", () => {
    expect(clampBar(15, 10)).toBe(10);
    expect(clampBar(-3, 10)).toBe(0);
  });
});

describe("ficha criada pela IA", () => {
  const base: GeneratedCharacter = {
    nome: "Lia Pés-de-Brisa",
    raca: "Halfling Pés-Leves, com +2 de Destreza e Sorte Halfling para rerrolar 1s",
    classe: "Ladina",
    nivel: 3,
    vida: 21,
    mana: 0,
    atributos: [{ nome: "DES", valor: 16 }],
    pericias: [{ nome: "Furtividade", valor: 7 }],
    habilidades: [
      { nome: "Ataque Furtivo", origem: "Classe", descricao: "+2d6 de dano uma vez por turno." },
    ],
    itens: [
      {
        nome: "Adaga",
        quantidade: 2,
        bonus: "+5 ataque",
        dano: "1d4+3 perfurante",
        descricao: "Leve e arremessável.",
      },
    ],
    historia: "Era uma vez.",
  };

  it("raça longa fica curta no topo e o detalhe vira habilidade", () => {
    const s = sheetFromAi(base);
    expect(s.head[1]!.v).toBe("Halfling Pés-Leves");
    const feats = s.secs.find((x) => x.type === "feat");
    expect(feats?.type === "feat" && feats.rows[0]).toMatchObject({
      l: "Halfling Pés-Leves",
      tag: "Raça",
    });
    expect(feats?.type === "feat" && feats.rows[0]!.d).toContain("+2 de Destreza");
  });

  it("item guarda bônus e dano separados do nome", () => {
    const s = sheetFromAi(base);
    const itens = s.secs.find((x) => x.type === "list");
    const adaga = itens?.type === "list" ? itens.rows[0] : undefined;
    expect(adaga).toMatchObject({
      l: "Adaga",
      v: "2",
      tags: ["+5 ataque", "1d4+3 perfurante"],
      d: "Leve e arremessável.",
    });
  });

  it("nível mostra só o número", () => {
    expect(sheetFromAi(base).head[3]!.v).toBe("3");
  });

  it("texto curto não é cortado", () => {
    expect(splitLong("Elfo", 28)).toEqual(["Elfo", ""]);
  });
});
