/**
 * orbitalUtils.ts
 * Pure utility functions for the OrbitalCanvas system.
 * No Svelte dependencies — fully testable in isolation.
 */

import { randomBetween, randomOklch } from "./beadUtils.ts";
import type {
  OrbiterConfig,
  GenerateConfig,
  ResolvedOrbiter,
  BeadOrbiterSettings,
  CircleOrbiterSettings,
  RectOrbiterSettings,
  OrbitalCanvasSettings,
} from "./orbitalTypes.ts";
import type { ColorSettings } from "../beadUtils.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_COLOR_RANGE: ColorSettings = {
  lightness: [0.5, 0.82],
  chroma: [0.08, 0.26],
  hue: [0, 360],
};

const DEFAULT_BEAD_PROPORTIONS: [number, number, number] = [0.32, 0.62, 1.0];
const DEFAULT_NUDGE = 10;

// ─── Math ─────────────────────────────────────────────────────────────────────

/**
 * Compute x, y on an ellipse given center, radii, and angle in degrees.
 * 0° = right, 90° = bottom (SVG coordinate space).
 */
export function positionOnOrbit(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + rx * Math.cos(rad),
    y: cy + ry * Math.sin(rad),
  };
}

/**
 * Fisher-Yates shuffle — returns a new array, does not mutate.
 */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Generate N evenly spaced angles across 360°, shuffled.
 * Every slot is unique and evenly spread, but order is random.
 */
function evenShuffledAngles(total: number): number[] {
  const step = 360 / total;
  const offset = randomBetween(0, 360);
  const angles = Array.from(
    { length: total },
    (_, i) => (offset + i * step) % 360,
  );
  return shuffle(angles);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 7)}`;
}

function resolveColorRange(partial?: Partial<ColorSettings>): ColorSettings {
  return { ...DEFAULT_COLOR_RANGE, ...partial };
}

// ─── Config generation ────────────────────────────────────────────────────────

function generateBeadConfig(gen: GenerateConfig): BeadOrbiterSettings {
  const outerR = gen.size ? randomBetween(gen.size[0], gen.size[1]) : 24;
  return {
    outerR,
    radiiProportions: DEFAULT_BEAD_PROPORTIONS,
    randomiseColors: gen.colors ?? true,
    colorRange: gen.colorRange,
  };
}

function generateCircleConfig(gen: GenerateConfig): CircleOrbiterSettings {
  const r = gen.size ? randomBetween(gen.size[0], gen.size[1]) : 12;
  return {
    r,
    randomiseColor: gen.colors ?? true,
    colorRange: gen.colorRange,
  };
}

function generateRectConfig(gen: GenerateConfig): RectOrbiterSettings {
  const size = gen.size ?? [10, 30];
  return {
    width: randomBetween(size[0], size[1]),
    height: randomBetween(size[0], size[1]),
    randomiseColor: gen.colors ?? true,
    colorRange: gen.colorRange,
  };
}

function expandGenerate(gen: GenerateConfig): OrbiterConfig[] {
  return Array.from({ length: gen.count }, () => {
    if (gen.type === "bead") {
      return {
        type: "bead",
        settings: generateBeadConfig(gen),
      } satisfies OrbiterConfig;
    }
    if (gen.type === "circle") {
      return {
        type: "circle",
        settings: generateCircleConfig(gen),
      } satisfies OrbiterConfig;
    }
    return {
      type: "rect",
      settings: generateRectConfig(gen),
    } satisfies OrbiterConfig;
  });
}

// ─── Color resolution ─────────────────────────────────────────────────────────

function resolveOrbiterColors(config: OrbiterConfig): OrbiterConfig {
  if (config.type === "bead") {
    const s = config.settings;
    const range = resolveColorRange(s.colorRange);
    return {
      ...config,
      settings: {
        ...s,
        colors: s.randomiseColors
          ? [randomOklch(range), randomOklch(range), randomOklch(range)]
          : (s.colors ?? [
              randomOklch(range),
              randomOklch(range),
              randomOklch(range),
            ]),
      },
    };
  }
  if (config.type === "circle") {
    const s = config.settings;
    const range = resolveColorRange(s.colorRange);
    return {
      ...config,
      settings: {
        ...s,
        fill: s.randomiseColor
          ? randomOklch(range)
          : (s.fill ?? randomOklch(range)),
      },
    };
  }
  if (config.type === "rect") {
    const s = config.settings;
    const range = resolveColorRange(s.colorRange);
    return {
      ...config,
      settings: {
        ...s,
        fill: s.randomiseColor
          ? randomOklch(range)
          : (s.fill ?? randomOklch(range)),
      },
    };
  }
  return config;
}

// ─── Main resolver ────────────────────────────────────────────────────────────

/**
 * Resolve all orbiters onto a single elliptical orbit.
 * Angles are evenly spaced and shuffled globally across all orbiters.
 * Each orbiter gets a small random nudge from its orbit position.
 */
export function resolveOrbit(
  settings: OrbitalCanvasSettings,
  canvasWidth: number,
  canvasHeight: number,
): ResolvedOrbiter[] {
  const cx = settings.center?.x ?? canvasWidth / 2;
  const cy = settings.center?.y ?? canvasHeight / 2;
  const rx = settings.radius;
  const ry = settings.radius * (canvasHeight / canvasWidth);
  const nudge = settings.nudge ?? DEFAULT_NUDGE;

  // Collect all orbiter configs
  const explicit = settings.orbiters ?? [];
  const generated = settings.generate ? expandGenerate(settings.generate) : [];
  const allConfigs = [...explicit, ...generated];

  // Evenly spaced + shuffled angles for the full set
  const angles = evenShuffledAngles(allConfigs.length);

  return allConfigs.map((raw, i) => {
    const angle = angles[i];
    const base = positionOnOrbit(cx, cy, rx, ry, angle);

    // Small random nudge in x and y
    const x = base.x + randomBetween(-nudge, nudge);
    const y = base.y + randomBetween(-nudge, nudge);

    const colorResolved = resolveOrbiterColors(raw);

    return {
      id: makeId(`orbiter-${i}`),
      angle,
      x,
      y,
      config: colorResolved,
    };
  });
}
