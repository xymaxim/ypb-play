<!--
  CircleOrbiter.svelte
  Renders a plain circle at a given x, y position.
-->

<script lang="ts">
  import type { CircleOrbiterSettings } from "./orbitalTypes.ts";

  let {
    x,
    y,
    settings,
  }: {
    x: number;
    y: number;
    settings: CircleOrbiterSettings;
  } = $props();
</script>

<circle
  class="circle-orbiter"
  cx={x}
  cy={y}
  r={settings.r}
  fill={settings.fill ?? "oklch(0.7 0.1 200)"}
  stroke={settings.stroke ?? "none"}
  stroke-width={settings.strokeWidth ?? 0}
/>
