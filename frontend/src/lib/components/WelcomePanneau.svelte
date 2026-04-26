<script lang="ts">
  import { onMount } from "svelte";
  import Bead from "$lib/components/panneau/primitives/Bead.svelte";
  import Empty from "$lib/components/panneau/primitives/Empty.svelte";
  import Rectangle from "$lib/components/panneau/primitives/Rectangle.svelte";
  import GradientRectangle from "$lib/components/panneau/primitives/GradientRectangle.svelte";
  import AnimatedPanneau from "$lib/components/panneau/AnimatedPanneau.svelte";
  import { OKLCH_RANGE } from "$lib/components/panneau/utils";
  import type {
    PrimitiveDescriptor,
    OklchRange,
  } from "$lib/components/panneau/types";
  import {
    resolveRectangle,
    resolveBead,
    resolveEmpty,
  } from "$lib/components/panneau/resolvers";
  import {
    ellipsePositions,
    tanPositions,
  } from "$lib/components/panneau/positions";

  interface Props {
    collapsing: boolean;
    collapsingDuration: number;
    playing: boolean;
    seed?: number;
  }

  let { collapsing, collapsingDuration, playing, seed = 0 }: Props = $props();

  const initialPrimitives: PrimitiveDescriptor[] = [
    {
      component: Bead,
      config: {
        sizeRange: [80, 80],
        ringProportions: [0.2, 0.4, 1.0],
        ringColors: [OKLCH_RANGE, OKLCH_RANGE, OKLCH_RANGE],
      },
      resolve: resolveBead,
    },
    {
      component: Bead,
      config: {
        sizeRange: [60, 60],
        ringProportions: [0.5, 1.0],
        ringColors: [OKLCH_RANGE, OKLCH_RANGE],
      },
      resolve: resolveBead,
    },
    {
      component: Bead,
      config: {
        sizeRange: [30, 30],
        ringProportions: [1.0],
        ringColors: [OKLCH_RANGE],
      },
      resolve: resolveBead,
    },
    {
      component: Rectangle,
      config: {
        sizeRange: [60, 70],
        ratioRange: [0.2, 0.2],
        angleRange: [0, 180],
        colorRange: OKLCH_RANGE,
      },
      resolve: resolveRectangle,
    },
    {
      component: GradientRectangle,
      config: {
        sizeRange: [70, 80],
        ratioRange: [0.6, 0.7],
        angleRange: [0, 180],
        colorRange: OKLCH_RANGE,
      },
      resolve: resolveRectangle,
    },
    {
      component: Empty,
      config: {},
      resolve: resolveEmpty,
    },
    {
      component: Empty,
      config: {},
      resolve: resolveEmpty,
    },
  ];

  function shuffle(arr: PrimitiveDescriptor[]): PrimitiveDescriptor[] {
    const hasAdjacentEmpty = (shuffled: PrimitiveDescriptor[]) => {
      for (let i = 0; i < shuffled.length - 1; i++) {
        if (
          shuffled[i].component === Empty &&
          shuffled[i + 1].component === Empty
        ) {
          return true;
        }
      }
      return false;
    };

    let shuffled: PrimitiveDescriptor[];

    do {
      shuffled = [...arr].sort(() => Math.random() - 0.5);
    } while (hasAdjacentEmpty(shuffled));

    return shuffled;
  }

  const primitives = $derived.by(() => {
    seed;
    return shuffle(initialPrimitives);
  });
</script>

<AnimatedPanneau
  class="overflow-visible!"
  {primitives}
  width={640}
  height={342}
  rx={250}
  aspect={16 / 9}
  nudge={[-10, 0]}
  {seed}
  getPositions={playing
    ? (params) => tanPositions({ ...params, maxTan: 2.0 })
    : ellipsePositions}
  collapsed={collapsing}
  {collapsingDuration}
  {playing}
  playSpeed={0.02}
/>
