<!--
  RectOrbiter.svelte
  Renders a rectangle centered at x, y, optionally rotated to face the orbit tangent.
-->

<script lang="ts">
  import type { RectOrbiterSettings } from "./orbitalTypes.ts";

  let {
    x,
    y,
    angle = 0,
    settings,
  }: {
    x: number;
    y: number;
    /** Orbital angle in degrees — used to orient the rect along the orbit */
    angle?: number;
    settings: RectOrbiterSettings;
  } = $props();

  const hw = $derived(settings.width / 2);
  const hh = $derived(settings.height / 2);
</script>

<rect
  class="rect-orbiter"
  x={x - hw}
  y={y - hh}
  width={settings.width}
  height={settings.height}
  rx={settings.rx ?? 0}
  fill={settings.fill ?? "oklch(0.7 0.1 200)"}
  stroke={settings.stroke ?? "none"}
  stroke-width={settings.strokeWidth ?? 0}
  transform="rotate({angle}, {x}, {y})"
/>
