<script lang="ts">
  import { onMount } from "svelte";
  import type { PanneauProps, AnyResolved } from "./types";
  import { orbitalPositions } from "./utils";

  interface Props {
    primitives: PrimitiveDescriptor[];
    width?: number;
    height?: number;
    cy?: number;
    seed?: number;
    rx?: number;
    aspect?: number;
    nudge?: Range;
    collapsed?: boolean;
    collapsingDuration?: number;
    blurAmount?: number;
    class?: string;
  }

  let {
    primitives,
    width = 640,
    height = 360,
    cy,
    seed = 0,
    rx,
    aspect = 1,
    nudge = [0, 0],
    collapsed = false,
    collapsingDuration = 600,
    blurAmount = 5,
    class: className = "",
  }: Props = $props();

  // State
  let blurred = $state(new Set<number>());
  let ready = $state(false);

  // Derived
  const cx = $derived(width / 2);
  const centreY = $derived(cy ?? height / 2);
  const orbitRx = $derived(rx ?? width * 0.4);

  const orbitalPos = $derived(
    orbitalPositions(primitives.length, cx, centreY, orbitRx, aspect, nudge),
  );

  const targetPositions = $derived(
    !ready || collapsed
      ? primitives.map(() => ({ x: cx, y: centreY }))
      : orbitalPos,
  );

  const resolved = $derived.by(() => {
    seed;
    return primitives.map(
      ({ config, resolve }) => resolve(config as any) as AnyResolved,
    );
  });

  // Functions
  function toggleBlur(i: number) {
    const next = new Set(blurred);
    next.has(i) ? next.delete(i) : next.add(i);
    blurred = next;
  }

  onMount(() => {
    requestAnimationFrame(() => (ready = true));
  });
</script>

<div
  class="block overflow-hidden {className}"
  style:width="{width}px"
  style:height="{height}px"
>
  <svg
    {width}
    {height}
    viewBox="0 0 {width} {height}"
    class="block"
    style="--collapsing-duration: {collapsingDuration}ms;"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <filter id="primitive-blur">
        <feGaussianBlur stdDeviation={blurAmount} />
      </filter>
    </defs>

    {#each primitives as { component: Primitive, onclick }, i (i)}
      <g
        class="slot"
        class:collapsed
        style="translate: {targetPositions[i].x}px {targetPositions[i].y}px;"
        filter={blurred.has(i) ? "url(#primitive-blur)" : ""}
        onclick={() => toggleBlur(i)}
      >
        <Primitive x={0} y={0} resolved={resolved[i]} {onclick} />
      </g>
    {/each}
  </svg>
</div>

<style>
  .slot {
    transition: translate var(--collapsing-duration)
      cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: center;
    transform-box: fill-box;
  }
</style>
