import type { Component } from "svelte";

// ─── Color ───────────────────────────────────────────────────────────────────

/** oklch(L C H) — all values raw numbers, e.g. oklch(0.7 0.2 140) */
export interface OklchColor {
  l: number; // 0–1
  c: number; // 0–0.4 typical
  h: number; // 0–360
}

// ─── Range helpers ────────────────────────────────────────────────────────────

export type Range = [min: number, max: number];

export interface OklchRange {
  l: Range; // lightness
  c: Range; // chroma
  h: Range; // hue
}

// ─── Base config every primitive shares ──────────────────────────────────────

export interface BasePrimitiveConfig {
  sizeRange: Range;
  colorRange: OklchRange;
  opacity?: Range;
}

// ─── Per-primitive configs ────────────────────────────────────────────────────

export interface CircleConfig extends BasePrimitiveConfig {
  strokeWidth?: Range;
  filled?: boolean;
}

export interface SquareConfig extends BasePrimitiveConfig {
  angleRange: Range;
  strokeWidth?: Range;
  filled?: boolean;
  rounded?: Range;
}

// ─── Primitive props contract — every primitive component must accept these ──

export interface PrimitiveProps<
  TConfig extends BasePrimitiveConfig = BasePrimitiveConfig,
> {
  x: number;
  y: number;
  config: TConfig;
  seed?: number;
  onclick?: () => void; // optional — only wired when descriptor provides it
}

// ─── Descriptor — what the consumer puts in their array ──────────────────────

export interface PrimitiveDescriptor<
  TConfig extends BasePrimitiveConfig = BasePrimitiveConfig,
> {
  component: Component<PrimitiveProps<TConfig>>;
  config: TConfig;
  onclick?: () => void; // consumer-owned callback, passed through by Doodle
}

// ─── Doodle props ─────────────────────────────────────────────────────────────

export interface DoodleProps {
  primitives: PrimitiveDescriptor[];
  width?: number;
  height?: number;
  cy?: number;
  seed?: number;
  class?: string;
}
