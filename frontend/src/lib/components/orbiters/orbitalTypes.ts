/**
 * orbitalTypes.ts
 * Shared types for the OrbitalCanvas system.
 * Import from here throughout the feature folder.
 */

import type { Component } from "svelte";
import type { ColorSettings, StrokeSettings } from "../beadUtils.ts";

// ─── Orbiter visual settings ──────────────────────────────────────────────────

export interface BeadOrbiterSettings {
  outerR: number;
  radiiProportions?: [number, number, number];
  colors?: [string, string, string];
  stroke?: Partial<StrokeSettings>;
  randomiseColors?: boolean;
  colorRange?: Partial<ColorSettings>;
}

export interface CircleOrbiterSettings {
  r: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  randomiseColor?: boolean;
  colorRange?: Partial<ColorSettings>;
}

export interface RectOrbiterSettings {
  width: number;
  height: number;
  rx?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  randomiseColor?: boolean;
  colorRange?: Partial<ColorSettings>;
}

// ─── Orbiter config (discriminated union) ─────────────────────────────────────

export type OrbiterConfig =
  | { type: "bead"; settings: BeadOrbiterSettings }
  | { type: "circle"; settings: CircleOrbiterSettings }
  | { type: "rect"; settings: RectOrbiterSettings }
  | {
      type: "component";
      component: Component;
      props?: Record<string, unknown>;
    };

// ─── Generation config ────────────────────────────────────────────────────────

export interface GenerateConfig {
  count: number;
  type: "bead" | "circle" | "rect";
  /** Randomise size within [min, max] range */
  size?: [number, number];
  /** Randomise colors */
  colors?: boolean;
  colorRange?: Partial<ColorSettings>;
}

// ─── Canvas config ────────────────────────────────────────────────────────────

export interface OrbitalCanvasSettings {
  /**
   * Orbit radius in px (horizontal axis).
   * Vertical axis is derived automatically: ry = radius * (height / width).
   */
  radius: number;
  /**
   * Max random x/y displacement from orbit position in px.
   * Gives a natural, hand-drawn feel. Default: 10.
   */
  nudge?: number;
  /** Manually placed orbiters */
  orbiters?: OrbiterConfig[];
  /** Auto-generated orbiters */
  generate?: GenerateConfig;
  /** Center point — defaults to canvas center */
  center?: { x: number; y: number };
  /** Show the elliptical orbit path (useful during development) */
  showOrbitPath?: boolean;
}

// ─── Resolved data (internal) ─────────────────────────────────────────────────

export interface ResolvedOrbiter {
  id: string;
  /** Angle in degrees — this is what GSAP will tween later */
  angle: number;
  x: number;
  y: number;
  config: OrbiterConfig;
}
