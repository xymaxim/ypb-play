export { default as Doodle } from "./Doodle.svelte";
export { default as Circle } from "./primitives/Circle.svelte";
export { default as Square } from "./primitives/Square.svelte";

export type {
  OklchColor,
  OklchRange,
  Range,
  BasePrimitiveConfig,
  CircleConfig,
  SquareConfig,
  PrimitiveProps,
  PrimitiveDescriptor,
  DoodleProps,
} from "./types";

export { randBetween, randFrom, evenSpacing, oklch } from "./utils";
