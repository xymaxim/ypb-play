<script lang="ts">
  import { Doodle, Circle, Square } from "./doodle";
  import type { PrimitiveDescriptor, OklchRange } from "./doodle";

  // ─── oklch palette ────────────────────────────────────────────────────────
  const warm = [
    { l: 0.72, c: 0.18, h: 38 }, // amber
    { l: 0.65, c: 0.22, h: 22 }, // orange
    { l: 0.6, c: 0.2, h: 10 }, // coral
  ];

  const cool = [
    { l: 0.68, c: 0.16, h: 210 }, // sky
    { l: 0.58, c: 0.2, h: 255 }, // indigo
    { l: 0.72, c: 0.14, h: 185 }, // teal
  ];

  const mixed = [...warm, ...cool];

  const oklchRange: OklchRange = {
    l: [0.5, 0.82],
    c: [0.08, 0.26],
    h: [0, 360],
  };

  // Seed
  let seed = $state(0);

  function shuffle() {
    seed++;
    primitives = [...primitives].sort(() => Math.random() - 0.5);
  }

  let primitives = $state<PrimitiveDescriptor[]>([
    {
      component: Circle,
      config: {
        sizeRange: [60, 80],
        colorRange: oklchRange,
        opacity: [1, 1],
      },
    },
    {
      component: Circle,
      config: {
        sizeRange: [100, 100],
        colorRange: oklchRange,
        opacity: [1, 1],
      },
      onclick: shuffle,
    },
    {
      component: Square,
      config: {
        sizeRange: [60, 80],
        angleRange: [0, 180],
        colorRange: oklchRange,
        rounded: [0, 0],
        opacity: [0.8, 1],
      },
    },
    {
      component: Square,
      config: {
        sizeRange: [20, 44],
        angleRange: [0, 160],
        colorRange: oklchRange,
        rounded: [0, 0],
        opacity: [0.8, 1],
      },
    },
  ]);
</script>

<Doodle {primitives} width={560} height={120} {seed} />
