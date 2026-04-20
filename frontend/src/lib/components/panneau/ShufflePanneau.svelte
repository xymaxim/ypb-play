<script lang="ts">
  import { untrack } from "svelte";
  import type { PrimitiveDescriptor, AnyResolved } from "./types";
  import { randFrom } from "./utils";

  interface Props {
    primitives: PrimitiveDescriptor[];
    width?: number;
    height?: number;
    seed?: number;
    playing?: boolean;
    steps?: number; // switches per cycle, default 3
    stepInterval?: number; // ms between steps, default 120
    dwellDuration?: number; // ms to pause after each cycle, default 1800
  }

  let {
    primitives,
    width = 120,
    height = 120,
    seed = 0,
    playing = false,
    steps = 3,
    stepInterval = 120,
    dwellDuration = 1800,
  }: Props = $props();

  // State
  let localSeed = $state(seed);

  // Derived
  const cx = $derived(width / 2);
  const cy = $derived(height / 2);

  const current = $derived.by(() => {
    localSeed;
    const descriptor = randFrom(primitives);
    return {
      component: descriptor.component,
      resolved: descriptor.resolve(descriptor.config as any) as AnyResolved,
    };
  });

  // Effects
  $effect(() => {
    const s = seed;
    untrack(() => {
      localSeed = s;
    });
  });

  $effect(() => {
    if (!playing) return;

    let cancelled = false;

    async function cycle() {
      while (!cancelled) {
        for (let i = 0; i < steps; i++) {
          if (cancelled) return;
          untrack(() => localSeed++);
          await wait(stepInterval);
        }
        await wait(dwellDuration);
      }
    }

    cycle();

    return () => {
      cancelled = true;
    };
  });

  // Functions
  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
</script>

<svg {width} {height} viewBox="0 0 {width} {height}">
  {#key localSeed}
    {@const Primitive = current.component}
    <Primitive x={cx} y={cy} resolved={current.resolved} />
  {/key}
</svg>
