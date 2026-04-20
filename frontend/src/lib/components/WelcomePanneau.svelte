<script lang="ts">
  import { onMount } from "svelte";
  import Bead from "$lib/components/panneau/primitives/Bead.svelte";
  import Empty from "$lib/components/panneau/primitives/Empty.svelte";
  import Rectangle from "$lib/components/panneau/primitives/Rectangle.svelte";
  import GradientRectangle from "$lib/components/panneau/primitives/GradientRectangle.svelte";
  import OrbitalPanneau from "$lib/components/panneau/OrbitalPanneau.svelte";
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

  interface Props {
    collapsing: boolean;
    collapsingDuration: number;
  }

  let { collapsing, collapsingDuration }: Props = $props();

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
        sizeRange: [80, 80],
        ringProportions: [0.32, 0.62, 1.0],
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
        sizeRange: [20, 20],
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
  ];

  let seed = $state(0);

  const primitives = $derived.by(() => {
    seed;
    return [...initialPrimitives].sort(() => Math.random() - 0.5);
  });
</script>

<OrbitalPanneau
  {primitives}
  width={640}
  height={342}
  rx={270}
  aspect={16 / 7}
  nudge={[-10, 10]}
  {seed}
  collapsed={collapsing}
  {collapsingDuration}
/>
