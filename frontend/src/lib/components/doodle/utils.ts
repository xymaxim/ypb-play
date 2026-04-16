import type { OklchColor, OklchRange, Range } from "./types";

/** Random float between min and max (inclusive) */
export function randBetween([min, max]: Range): number {
  return min + Math.random() * (max - min);
}

/** Random integer between min and max (inclusive) */
export function randIntBetween([min, max]: Range): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function randomOklch(range: OklchRange): string {
  const l = randBetween(range.l);
  const c = randBetween(range.c);
  const h = randBetween(range.h);
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

/** Pick a random item from an array */
export function randFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Serialise an OklchColor to a CSS string */
export function oklch({ l, c, h }: OklchColor): string {
  return `oklch(${l} ${c} ${h})`;
}

/**
 * Compute evenly-spaced x positions across a total width.
 * Pads by half-step so shapes aren't flush against the edge.
 *
 * E.g. n=3, width=300 → [50, 150, 250]
 */
export function evenSpacing(n: number, width: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [width / 2];
  const step = width / n;
  return Array.from({ length: n }, (_, i) => step * i + step / 2);
}

/** Clamp a value between lo and hi */
export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}
