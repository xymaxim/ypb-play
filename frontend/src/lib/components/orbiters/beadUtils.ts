/**
 * beadUtils.ts
 * Pure utility functions for bead generation.
 * No Svelte dependencies — fully testable in isolation.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColorSettings {
  lightness: [number, number];
  chroma: [number, number];
  hue: [number, number];
}

export interface BeadSettings {
  count: number;
  minSize: number;
  maxSize: number;
  radiiProportions: [number, number, number];
}

export interface StrokeSettings {
  enabled: boolean;
  color: string;
  width: number;
}

export interface Settings {
  beads?: Partial<BeadSettings>;
  colors?: Partial<ColorSettings>;
  stroke?: Partial<StrokeSettings>;
}

export interface BeadData {
  id: string;
  x: number;
  y: number;
  outerR: number;
  colors: [string, string, string];
}

interface GenerateBeadsConfig {
  canvas: { width: number; height: number };
  beads: BeadSettings;
  colors: ColorSettings;
}

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Generate a random number between min and max (inclusive).
 */
export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Generate a random oklch color string within configured ranges.
 * e.g. "oklch(0.65 0.18 210)"
 */
export function randomOklch(colorSettings: ColorSettings): string {
  const { lightness, chroma, hue } = colorSettings;
  const L = randomBetween(lightness[0], lightness[1]);
  const C = randomBetween(chroma[0], chroma[1]);
  const H = randomBetween(hue[0], hue[1]);
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

/**
 * Generate an array of bead data objects.
 *
 * Each bead:
 *   id        — unique string
 *   x, y      — center position within canvas
 *   outerR    — the largest radius (bounding circle)
 *   colors    — [outerColor, midColor, innerColor]
 */
export function generateBeads(config: GenerateBeadsConfig): BeadData[] {
  const { canvas, beads, colors } = config;
  const { count, minSize, maxSize } = beads;

  return Array.from({ length: count }, (_, i) => {
    const outerR = randomBetween(minSize, maxSize);

    // Keep bead fully within canvas bounds
    const x = randomBetween(outerR, canvas.width - outerR);
    const y = randomBetween(outerR, canvas.height - outerR);

    return {
      id: `bead-${i}-${Math.random().toString(36).slice(2, 7)}`,
      x,
      y,
      outerR,
      colors: [
        randomOklch(colors),
        randomOklch(colors),
        randomOklch(colors),
      ] as [string, string, string],
    };
  });
}

/**
 * Compute the three absolute radii for a bead from its outerR and proportion ratios.
 * Proportions are [inner, mid, outer] as fractions of outerR.
 */
export function computeRadii(
  outerR: number,
  proportions: [number, number, number],
): [number, number, number] {
  return proportions.map((p) => outerR * p) as [number, number, number];
}
