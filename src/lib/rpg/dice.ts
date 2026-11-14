export const DICE = [4, 6, 8, 10, 12, 20, 100] as const;

export type Rng = () => number;

export const rollDie = (sides: number, rng: Rng = Math.random) => 1 + Math.floor(rng() * sides);

export const fmtMod = (m: number) => (m ? (m > 0 ? ` + ${m}` : ` − ${Math.abs(m)}`) : "");

export type RollResult = { total: number; text: string; crit?: "max" | "min" | undefined };

/** Rolls a pool like {6: 2, 20: 1} plus a flat modifier. */
export function rollPool(
  pool: Record<number, number>,
  mod: number,
  rng: Rng = Math.random,
): RollResult | null {
  const sides = Object.keys(pool)
    .map(Number)
    .filter((n) => (pool[n] ?? 0) > 0)
    .sort((a, b) => a - b);
  if (!sides.length) return null;
  let total = mod;
  const parts: string[] = [];
  for (const n of sides) {
    const count = pool[n] ?? 0;
    const rs = Array.from({ length: count }, () => rollDie(n, rng));
    total += rs.reduce((x, y) => x + y, 0);
    parts.push(`${count}d${n} [${rs.join(", ")}]`);
  }
  return { total, text: parts.join(" + ") + fmtMod(mod) + ` = ${total}` };
}

/** Rolls 2d20 and keeps the highest (advantage) or lowest (disadvantage). */
export function rollAdvantage(dir: 1 | -1, mod: number, rng: Rng = Math.random): RollResult {
  const a = rollDie(20, rng);
  const b = rollDie(20, rng);
  const kept = dir > 0 ? Math.max(a, b) : Math.min(a, b);
  const total = kept + mod;
  const label = dir > 0 ? "Vantagem" : "Desvantagem";
  return {
    total,
    text: `${label}: d20 [${a}, ${b}] → ${kept}${fmtMod(mod)} = ${total}`,
    crit: kept === 20 ? "max" : kept === 1 ? "min" : undefined,
  };
}

/** d20 + the row's value, used by the dice button on attributes and skills. */
export function rollCheck(label: string, value: number, rng: Rng = Math.random): RollResult {
  const d = rollDie(20, rng);
  const total = d + value;
  return {
    total,
    text: `${label}: d20 [${d}]${fmtMod(value)} = ${total}`,
    crit: d === 20 ? "max" : d === 1 ? "min" : undefined,
  };
}
