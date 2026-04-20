<script lang="ts">
  import type { BasePrimitiveProps, BeadResolved } from "../types";

  let { x, y, resolved, onclick }: BasePrimitiveProps<BeadResolved> = $props();
</script>

<g transform="translate({x}, {y})" style="cursor: pointer;" {onclick}>
  {#each resolved.rings as ring}
    <circle r={ring.r} fill={ring.fill} />
  {/each}
</g>
