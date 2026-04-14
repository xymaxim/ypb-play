<!--
  Orbiter.svelte
  Dispatcher — reads the orbiter type and renders the correct component.
  This is the only place that knows about all orbiter variants.
-->

<script lang="ts">
  import type { OrbiterConfig } from "./orbitalTypes.ts";
  import BeadOrbiter from "./BeadOrbiter.svelte";
  import CircleOrbiter from "./CircleOrbiter.svelte";
  import RectOrbiter from "./RectOrbiter.svelte";

  let {
    x,
    y,
    angle,
    config,
  }: {
    x: number;
    y: number;
    angle: number;
    config: OrbiterConfig;
  } = $props();
</script>

{#if config.type === "bead"}
  <BeadOrbiter {x} {y} settings={config.settings} />
{:else if config.type === "circle"}
  <CircleOrbiter {x} {y} settings={config.settings} />
{:else if config.type === "rect"}
  <RectOrbiter {x} {y} {angle} settings={config.settings} />
{:else if config.type === "component"}
  {@const C = config.component}
  <C {x} {y} {angle} {...config.props ?? {}} />
{/if}
