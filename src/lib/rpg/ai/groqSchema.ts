const string = { type: "string" };
const number = { type: "number" };
const integer = { type: "integer" };

const nameValueRow = {
  type: "object",
  additionalProperties: false,
  properties: { nome: string, valor: number },
  required: ["nome", "valor"],
};

const abilityRow = {
  type: "object",
  additionalProperties: false,
  properties: { nome: string, origem: string, descricao: string },
  required: ["nome", "origem", "descricao"],
};

const itemRow = {
  type: "object",
  additionalProperties: false,
  properties: {
    nome: string,
    quantidade: integer,
    bonus: string,
    dano: string,
    descricao: string,
  },
  required: ["nome", "quantidade", "bonus", "dano", "descricao"],
};

/**
 * Strict Structured Outputs contract supported by Groq's GPT-OSS models.
 * Keep it deliberately limited to the JSON Schema subset accepted by Groq.
 */
export const groqCharacterSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    nome: string,
    raca: string,
    classe: string,
    nivel: integer,
    vida: number,
    mana: number,
    atributos: { type: "array", items: nameValueRow },
    pericias: { type: "array", items: nameValueRow },
    habilidades: { type: "array", items: abilityRow },
    itens: { type: "array", items: itemRow },
    historia: string,
  },
  required: [
    "nome",
    "raca",
    "classe",
    "nivel",
    "vida",
    "mana",
    "atributos",
    "pericias",
    "habilidades",
    "itens",
    "historia",
  ],
};
