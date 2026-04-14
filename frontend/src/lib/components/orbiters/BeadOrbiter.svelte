<!--
  BeadOrbiter.svelte
  Renders a concentric-circle bead at a given x, y position.
  Adapted from Bead.svelte for use inside OrbitalCanvas.
  x, y are computed externally by orbitalUtils — this component is purely presentational.
-->

<script lang="ts">
  import { computeRadii } from "./beadUtils";
  import type { BeadOrbiterSettings } from "./orbitalTypes";

  let {
    x,
    y,
    settings,
  }: {
    x: number;
    y: number;
    settings: BeadOrbiterSettings;
  } = $props();

  const proportions = $derived(settings.radiiProportions ?? [0.32, 0.62, 1.0]);
  const radii = $derived(computeRadii(settings.outerR, proportions));

  // colors[0] = outer (back), colors[1] = mid, colors[2] = inner (front)
  const rings = $derived([
    { r: radii[2], fill: settings.colors?.[0] ?? "oklch(0.7 0.15 200)" },
    { r: radii[1], fill: settings.colors?.[1] ?? "oklch(0.6 0.18 220)" },
    { r: radii[0], fill: settings.colors?.[2] ?? "oklch(0.5 0.20 240)" },
  ]);

  const stroke = $derived(
    settings.stroke?.enabled ? settings.stroke.color : null,
  );
  const strokeWidth = $derived(settings.stroke?.width ?? 1);
</script>

<g class="bead-orbiter">
  {#each rings as ring}
    <circle
      cx={x}
      cy={y}
      r={ring.r}
      fill={ring.fill}
      stroke={stroke ?? "none"}
      stroke-width={stroke ? strokeWidth : 0}
    />
  {/each}
</g>
