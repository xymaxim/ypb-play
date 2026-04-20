import type {
  RectangleConfig,
  RectangleResolved,
  BeadConfig,
  BeadResolved,
  EmptyConfig,
  EmptyResolved,
  OklchRange,
} from "./types";
import { randBetween, randomOklch } from "./utils";

export function resolveRectangle(config: RectangleConfig): RectangleResolved {
  const h = randBetween(config.sizeRange);
  const w = h * randBetween(config.ratioRange);
  return {
    width: w,
    height: h,
    angle: randBetween(config.angleRange),
    color: color(config.colorRange),
  };
}

export function resolveBead(config: BeadConfig): BeadResolved {
  const outerR = randBetween(config.sizeRange) / 2;
  const radii = computeRadii(outerR, config.ringProportions);
  return {
    rings: config.ringColors
      .map((range, i) => ({ r: radii[i], fill: randomOklch(range) }))
      .reverse(),
  };
}

export function resolveEmpty(config: EmptyConfig): EmptyResolved {
  return {};
}

// Helper functions

function color(range: OklchRange): string {
  return randomOklch(range);
}

function opacity(range?: [number, number]): number {
  return range ? randBetween(range) : 1;
}

function computeRadii(
  outerR: number,
  proportions: [number, number, number],
): [number, number, number] {
  return proportions.map((p) => outerR * p) as [number, number, number];
}
