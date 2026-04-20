<script lang="ts">
  import Bead from "$lib/components/panneau/primitives/Bead.svelte";
  import Rectangle from "$lib/components/panneau/primitives/Rectangle.svelte";
  import GradientRectangle from "$lib/components/panneau/primitives/GradientRectangle.svelte";
  import { OKLCH_RANGE } from "$lib/components/panneau/utils";
  import type {
    PrimitiveDescriptor,
    OklchRange,
  } from "$lib/components/panneau/types";
  import {
    resolveRectangle,
    resolveBead,
  } from "$lib/components/panneau/resolvers";
  import ShufflePanneau from "$lib/components/panneau/ShufflePanneau.svelte";

  let playing = $state(true);

  let primitives = $state<PrimitiveDescriptor[]>([
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
      component: Rectangle,
      config: {
        sizeRange: [60, 80],
        ratioRange: [0.5, 0.8],
        angleRange: [0, 180],
        colorRange: OKLCH_RANGE,
      },
      resolve: resolveRectangle,
    },
    {
      component: GradientRectangle,
      config: {
        sizeRange: [60, 80],
        ratioRange: [0.2, 0.5],
        angleRange: [0, 180],
        colorRange: OKLCH_RANGE,
      },
      resolve: resolveRectangle,
    },
  ]);
</script>

<div
  class="pointer-events-auto relative flex w-full flex-col items-center justify-center"
>
  <ShufflePanneau
    {primitives}
    {playing}
    steps={10}
    stepInterval={100}
    dwellDuration={300}
  />
</div>
