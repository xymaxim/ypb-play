<script lang="ts">
  import type { BasePrimitiveProps, BeadResolved } from "../types";

  let { x, y, resolved, onclick }: BasePrimitiveProps<BeadResolved> = $props();
</script>

<g transform="translate({x}, {y})" style="cursor: pointer;" {onclick}>
  {#each resolved.rings as ring}
    {@const w = 2 * ring.r * 1.1}
    {@const h = 2 * ring.r}
    <rect
      x={-w / 2}
      y={-h / 2}
      width={w}
      height={h}
      rx={(2 * ring.r) / 2.1}
      fill={ring.fill}
    />
  {/each}
</g>
