import type { Component } from "svelte";

export type Range = [min: number, max: number];

export interface OklchRange {
  l: Range;
  c: Range;
  h: Range;
}

// Primitives

// Rectangle
export interface RectangleResolved {
  width: number;
  height: number;
  angle: number;
  color: string;
}

export interface RectangleConfig {
  sizeRange: Range;
  ratioRange: Range;
  angleRange: Range;
  colorRange?: OklchRange;
}

// Bead
export interface BeadRing {
  r: number;
  fill: string;
}

export interface BeadResolved {
  rings: BeadRing[];
  opacity: number;
}

export interface BeadConfig {
  sizeRange: Range;
  ringProportions: [number, number, number];
  ringColors: [OklchRange, OklchRange, OklchRange];
}

// Empty
export interface EmptyResolved {}
export interface EmptyConfig {}

// Primitive framework

export interface BasePrimitiveProps<TResolved> {
  x: number;
  y: number;
  resolved: TResolved;
  onclick?: () => void;
}

export type AnyResolved = RectangleResolved | BeadResolved;

export type AnyConfig = RectangleConfig | BeadConfig;

export interface PrimitiveDescriptor<
  TConfig extends AnyConfig = AnyConfig,
  TResolved extends AnyResolved = AnyResolved,
> {
  component: Component<BasePrimitiveProps<TResolved>>;
  config: TConfig;
  resolve: (config: TConfig) => TResolved;
  onclick?: () => void;
}
