<script lang="ts">
  import { onMount } from "svelte";
  import type { AnyResolved } from "./types";
  import { randBetween } from "./utils";
  import { ellipsePositions } from "./positions";

  interface Props {
    primitives: PrimitiveDescriptor[];
    angle?: number;
    width?: number;
    height?: number;
    cy?: number;
    propSeed?: number;
    rx?: number;
    aspect?: number;
    nudge?: Range;
    collapsed?: boolean;
    collapsingDuration?: number;
    playing?: boolean;
    playSpeed?: number;
    getPositions?: PositionFn;
    class?: string;
  }

  let {
    primitives,
    angle: propAngle = 0,
    width = 640,
    height = 360,
    cy: propCy,
    propSeed = 0,
    rx: propRx,
    aspect = 1,
    nudge = [0, 0],
    collapsed = false,
    collapsingDuration = 600,
    playing = false,
    playSpeed = 0.01,
    getPositions = ellipsePositions,
    class: className = "",
  }: Props = $props();

  // Types
  export type PositionParams = {
    n: number;
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    nudges: number[];
    angle: number;
  };

  export type PositionFn = (
    params: PositionParams,
  ) => { x: number; y: number }[];

  // State
  let seed = $state(propSeed);
  let ready = $state(false);
  let angle = $state(propAngle);

  // Derived
  const cx = $derived(width / 2);
  const cy = $derived(propCy ?? height / 2);
  const rx = $derived(propRx ?? width * 0.4);
  const ry = $derived(rx / aspect);

  const { nudgeOffsets, rotationSpeeds } = $derived.by(() => {
    seed;
    const rotationSpeedRange: Range = [-3, 3];
    return {
      nudgeOffsets: primitives.map(() => randBetween(nudge)),
      rotationSpeeds: primitives.map(() => {
        let value = Math.floor(randBetween(rotationSpeedRange));
        while (value === 0) value = Math.floor(randBetween(rotationSpeedRange));
        return value;
      }),
    };
  });

  const positionParams = $derived<PositionParams>({
    n: primitives.length,
    cx,
    cy,
    rx,
    ry,
    nudges: nudgeOffsets,
    angle,
  });

  const computedPositions = $derived(getPositions(positionParams));

  const positions = $derived(
    !ready || collapsed
      ? primitives.map(() => ({ x: cx, y: cy }))
      : computedPositions,
  );

  const rotations = $derived(
    primitives.map((_, i) => angle * rotationSpeeds[i]),
  );

  const resolved = $derived.by(() => {
    seed;
    return primitives.map(
      ({ config, resolve }) => resolve(config as any) as AnyResolved,
    );
  });

  // Effects
  $effect(() => {
    if (!playing) angle = propAngle;
  });

  onMount(() => {
    requestAnimationFrame(() => (ready = true));

    let animationFrameId: number;
    const animate = () => {
      if (playing && !collapsed) angle += playSpeed;
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animationFrameId);
  });
</script>

<div
  class="block {className}"
  style:width="{width}px"
  style:height="{height}px"
>
  <svg
    {width}
    {height}
    viewBox="0 0 {width} {height}"
    class="overflow-none block"
    style="--collapsing-duration: {collapsingDuration}ms;"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {#each primitives as { component: Primitive, onclick }, i (i)}
      <g
        class="slot"
        class:collapsed
        class:playing={playing && !collapsed}
        style="translate: {positions[i].x}px {positions[i]
          .y}px; rotate: {rotations[i]}rad;"
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

  .slot.playing {
    transition: none;
  }
</style>
