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

/** Rolls two dice of the chosen size and keeps the highest or lowest result. */
export function rollAdvantage(
  dir: 1 | -1,
  mod: number,
  sidesOrRng: number | Rng = 20,
  providedRng: Rng = Math.random,
): RollResult {
  const sides = typeof sidesOrRng === "number" ? sidesOrRng : 20;
  const rng = typeof sidesOrRng === "function" ? sidesOrRng : providedRng;
  const a = rollDie(sides, rng);
  const b = rollDie(sides, rng);
  const kept = dir > 0 ? Math.max(a, b) : Math.min(a, b);
  const total = kept + mod;
  const label = dir > 0 ? "Vantagem" : "Desvantagem";
  return {
    total,
    text: `${label}: d${sides} [${a}, ${b}] → ${kept}${fmtMod(mod)} = ${total}`,
    crit: kept === sides ? "max" : kept === 1 ? "min" : undefined,
  };
}

/** Rolls the selected test die plus the row's attribute or skill modifier. */
export function rollCheck(
  label: string,
  value: number,
  sidesOrRng: number | Rng = 20,
  providedRng: Rng = Math.random,
): RollResult {
  const sides = typeof sidesOrRng === "number" ? sidesOrRng : 20;
  const rng = typeof sidesOrRng === "function" ? sidesOrRng : providedRng;
  const d = rollDie(sides, rng);
  const total = d + value;
  return {
    total,
    text: `${label}: d${sides} [${d}]${fmtMod(value)} = ${total}`,
    crit: d === sides ? "max" : d === 1 ? "min" : undefined,
  };
}
