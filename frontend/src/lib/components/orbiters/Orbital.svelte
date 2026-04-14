<!--
  Orbital.svelte
  Renders one orbital ring (optionally visible) and all its orbiters.
-->

<script lang="ts">
  import type { ResolvedOrbital } from "./orbitalTypes.ts";
  import Orbiter from "./Orbiter.svelte";

  let {
    orbital,
    cx,
    cy,
    showOrbitPath = false,
    orbitPathColor = "oklch(0.8 0.0 0 / 0.25)",
    orbitPathWidth = 1,
  }: {
    orbital: ResolvedOrbital;
    cx: number;
    cy: number;
    /** Draw a faint guide circle for the orbital path */
    showOrbitPath?: boolean;
    orbitPathColor?: string;
    orbitPathWidth?: number;
  } = $props();
</script>

<g class="orbital" id={orbital.id}>
  {#if showOrbitPath}
    <circle
      {cx}
      {cy}
      r={orbital.radius}
      fill="none"
      stroke={orbitPathColor}
      stroke-width={orbitPathWidth}
      stroke-dasharray="4 6"
    />
  {/if}

  {#each orbital.orbiters as orbiter (orbiter.id)}
    <Orbiter
      x={orbiter.x}
      y={orbiter.y}
      angle={orbiter.angle}
      config={orbiter.config}
    />
  {/each}
</g>
