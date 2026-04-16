<script lang="ts">
  import type { DoodleProps, OklchRange } from "./types";
  import { evenSpacing } from "./utils";

  let {
    primitives,
    width = 640,
    height = 120,
    cy,
    seed = 0,
    class: className = "",
  }: DoodleProps = $props();

  const centreY = $derived(cy ?? height / 2);
  const xPositions = $derived(evenSpacing(primitives.length, width));
</script>

<div
  class="doodle-wrap {className}"
  style:width="{width}px"
  style:height="{height}px"
>
  <svg
    {width}
    {height}
    viewBox="0 0 {width} {height}"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {#each primitives as { component: Primitive, config, onclick }, i (i)}
      <Primitive x={xPositions[i]} y={centreY} {config} {seed} {onclick} />
    {/each}
  </svg>
</div>

<style>
  .doodle-wrap {
    display: block;
    overflow: hidden;
  }

  svg {
    display: block;
  }
</style>
