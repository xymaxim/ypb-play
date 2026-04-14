<!--
  OrbitalCanvas.svelte
  Single elliptical orbit canvas.
  Orbiters are evenly spaced, shuffled, and nudged for a natural feel.

  Props:
    settings — OrbitalCanvasSettings (see orbitalTypes.ts)

  Exposes:
    regenerate() — re-resolve all orbiters with new random values

  Usage:
    <OrbitalCanvas {settings} />
    <OrbitalCanvas {settings} bind:this={canvas} />  ← for regenerate()
-->

<script lang="ts">
  import { useElementSize } from "$lib/utils/domUtils.svelte";
  import { resolveOrbit } from "./orbitalUtils.ts";
  import Orbiter from "./Orbiter.svelte";
  import type {
    OrbitalCanvasSettings,
    ResolvedOrbiter,
  } from "./orbitalTypes.ts";

  // ─── Props ───────────────────────────────────────────────────────────────────

  let { settings }: { settings: OrbitalCanvasSettings } = $props();

  // ─── Size ────────────────────────────────────────────────────────────────────

  const size = useElementSize();

  // ─── Derived ellipse radii ───────────────────────────────────────────────────

  const rx = $derived(settings.radius);
  const ry = $derived(settings.radius * (size.height / size.width));

  const cx = $derived(settings.center?.x ?? size.width / 2);
  const cy = $derived(settings.center?.y ?? size.height / 2);

  // ─── State ───────────────────────────────────────────────────────────────────

  let orbiters = $state<ResolvedOrbiter[]>([]);

  $effect(() => {
    if (!size.width || !size.height) return;
    orbiters = resolveOrbit(settings, size.width, size.height);
  });

  // ─── Public API ──────────────────────────────────────────────────────────────

  export function regenerate(): void {
    orbiters = resolveOrbit(settings, size.width, size.height);
  }
</script>

<div class="orbital-canvas-container z-100" bind:this={size.el}>
  {#if size.width && size.height}
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 {size.width} {size.height}"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Orbital canvas"
      role="img"
    >
      <!-- Dev helper: center point -->
      <!-- <circle cx={cx} cy={cy} r="3" fill="red" /> -->

      {#if settings.showOrbitPath}
        <ellipse
          {cx}
          {cy}
          {rx}
          {ry}
          fill="none"
          stroke="oklch(0.8 0.0 0 / 0.25)"
          stroke-width="1"
          stroke-dasharray="4 6"
        />
      {/if}

      {#each orbiters as orbiter (orbiter.id)}
        <Orbiter
          x={orbiter.x}
          y={orbiter.y}
          angle={orbiter.angle}
          config={orbiter.config}
        />
      {/each}
    </svg>
  {/if}
</div>

<style>
  .orbital-canvas-container {
    width: 100%;
    height: 100%;
  }
</style>
