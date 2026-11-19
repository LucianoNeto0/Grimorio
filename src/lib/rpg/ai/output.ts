import { z } from "zod";

import type { GeneratedCharacter } from "./types";

const noControls = (value: string) =>
  Array.from(value).every((character) => {
    const code = character.charCodeAt(0);
    return !(code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127);
  });
const text = (max: number) =>
  z.string().max(max).refine(noControls, "Control characters are not allowed");
const requiredText = (max: number) => text(max).trim().min(1);
const finite = (min: number, max: number) => z.number().finite().min(min).max(max);

export const GeneratedCharacterSchema = z
  .object({
    nome: requiredText(160),
    raca: requiredText(120),
    classe: requiredText(120),
    nivel: z.number().finite().int().min(1).max(30),
    vida: finite(0, 100_000),
    mana: finite(0, 100_000),
    atributos: z
      .array(z.object({ nome: requiredText(80), valor: finite(-10_000, 10_000) }).strict())
      .min(1)
      .max(12),
    pericias: z
      .array(z.object({ nome: requiredText(120), valor: finite(-10_000, 10_000) }).strict())
      .max(12),
    habilidades: z
      .array(
        z
          .object({
            nome: requiredText(160),
            origem: requiredText(60),
            descricao: text(1200),
          })
          .strict(),
      )
      .max(12),
    itens: z
      .array(
        z
          .object({
            nome: requiredText(160),
            quantidade: z.number().finite().int().min(1).max(1_000_000),
            bonus: text(120),
            dano: text(120),
            descricao: text(1200),
          })
          .strict(),
      )
      .max(12),
    historia: requiredText(8000),
  })
  .strict();

export type { GeneratedCharacter };

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const source = fenced?.[1] ?? trimmed;
  const start = source.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const char = source[i]!;
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  return null;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function field(record: UnknownRecord, names: string[]) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(record, name)) return record[name];
  }
  return undefined;
}

function finiteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return value;
}

function detail(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function joinedDetails(...values: string[]) {
  return values.filter(Boolean).join(" — ");
}

/** Converts common provider-specific name/value structures to canonical rows. */
function normalizeNameValueList(value: unknown): unknown {
  const normalizeRow = (row: unknown, fallbackName?: string) => {
    if (!isRecord(row)) return { nome: fallbackName, valor: finiteNumber(row) };
    return {
      nome: field(row, ["nome", "name", "label"]) ?? fallbackName,
      valor: finiteNumber(field(row, ["valor", "value", "modificador", "modifier"])),
    };
  };
  if (Array.isArray(value)) return value.map((row) => normalizeRow(row));
  if (!isRecord(value)) return value;
  return Object.entries(value).map(([nome, valor]) => normalizeRow(valor, nome));
}

function normalizeAbilities(value: unknown): unknown {
  const normalizeRow = (row: unknown, fallbackName?: string) => {
    if (!isRecord(row)) return row;
    const description = detail(field(row, ["descricao", "description", "efeito", "effect"]));
    const cost = detail(field(row, ["custo", "cost"]));
    return {
      nome: field(row, ["nome", "name", "label"]) ?? fallbackName,
      origem: field(row, ["origem", "tipo", "source", "type"]) ?? "Outro",
      descricao: joinedDetails(description, cost ? `Custo: ${cost}` : ""),
    };
  };
  if (Array.isArray(value)) return value.map((row) => normalizeRow(row));
  if (!isRecord(value)) return value;
  return Object.entries(value).map(([nome, ability]) => normalizeRow(ability, nome));
}

function normalizeItems(value: unknown): unknown {
  const normalizeRow = (row: unknown, fallbackName?: string) => {
    if (!isRecord(row)) return row;
    const type = detail(field(row, ["tipo", "type", "categoria", "category"]));
    const weight = detail(field(row, ["peso", "weight"]));
    const value = detail(field(row, ["valor", "value", "preco", "price"]));
    const description = detail(field(row, ["descricao", "description", "detalhes", "details"]));
    return {
      nome: field(row, ["nome", "name", "label"]) ?? fallbackName,
      quantidade: finiteNumber(field(row, ["quantidade", "quantity", "qtd"]) ?? 1),
      bonus: detail(field(row, ["bonus", "bônus", "modifier"])),
      dano: detail(field(row, ["dano", "damage"])),
      descricao: joinedDetails(
        description,
        type ? `Tipo: ${type}` : "",
        weight ? `Peso: ${weight}` : "",
        value ? `Valor: ${value}` : "",
      ),
    };
  };
  if (Array.isArray(value)) return value.map((row) => normalizeRow(row));
  if (!isRecord(value)) return value;
  return Object.entries(value).map(([nome, item]) => normalizeRow(item, nome));
}

function normalizeCharacterShape(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return {
    nome: field(value, ["nome", "name"]),
    raca: field(value, ["raca", "ra\u00e7a", "race", "ancestralidade"]),
    classe: field(value, ["classe", "class", "arquetipo", "archetype"]),
    nivel: finiteNumber(field(value, ["nivel", "level"])),
    vida: finiteNumber(field(value, ["vida", "hp", "health"])),
    mana: finiteNumber(field(value, ["mana", "mp"]) ?? 0),
    atributos: normalizeNameValueList(field(value, ["atributos", "attributes"])),
    pericias: normalizeNameValueList(field(value, ["pericias", "skills"])),
    habilidades: normalizeAbilities(field(value, ["habilidades", "abilities"])),
    itens: normalizeItems(field(value, ["itens", "items", "equipment"])),
    historia: field(value, ["historia", "hist\u00f3ria", "backstory", "history"]),
  };
}

export function parseCharacterOutput(
  value: string,
): { ok: true; character: GeneratedCharacter } | { ok: false; message: string } {
  if (value.length > 32_000) return { ok: false, message: "Output exceeded the size limit" };
  const json = extractJsonObject(value);
  if (!json) return { ok: false, message: "No complete JSON object found" };
  try {
    const parsed: unknown = JSON.parse(json);
    const result = GeneratedCharacterSchema.safeParse(normalizeCharacterShape(parsed));
    return result.success
      ? { ok: true, character: result.data }
      : {
          ok: false,
          message: `Output schema invalid: ${result.error.issues
            .slice(0, 4)
            .map((issue) => `${issue.path.join(".") || "root"}:${issue.code}`)
            .join(", ")}`,
        };
  } catch {
    return { ok: false, message: "Output contained invalid or truncated JSON" };
  }
}
