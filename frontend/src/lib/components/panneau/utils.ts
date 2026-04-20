import type { OklchRange, Range } from "./types";

export function randBetween([min, max]: Range): number {
  return min + Math.random() * (max - min);
}

export function randFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomOklch(range: OklchRange): string {
  const l = randBetween(range.l);
  const c = randBetween(range.c);
  const h = randBetween(range.h);
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

export function orbitalPositions(
  n: number,
  cx: number,
  cy: number,
  rx: number,
  aspect: number,
  nudge: Range,
): { x: number; y: number }[] {
  if (n === 0) return [];
  const ry = rx / aspect;
  return Array.from({ length: n }, (_, i) => {
    const angle = ((2 * Math.PI) / n) * i - Math.PI / 2;
    const nudgeOffset = randBetween(nudge);
    return {
      x: cx + (rx + nudgeOffset) * Math.cos(angle),
      y: cy + (ry + nudgeOffset) * Math.sin(angle),
    };
  });
}

export const OKLCH_RANGE: OklchRange = {
  l: [0.7, 0.85],
  c: [0.05, 0.25],
  h: [0, 360],
};
