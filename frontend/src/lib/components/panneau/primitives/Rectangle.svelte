<script lang="ts">
  import type { BasePrimitiveProps, RectangleResolved } from "../types";

  let { x, y, resolved, onclick }: BasePrimitiveProps<RectangleResolved> =
    $props();

  const halfW = $derived(resolved.width / 2);
  const halfH = $derived(resolved.height / 2);
</script>

<g transform="translate({x}, {y})">
  <g transform="rotate({resolved.angle})" style="cursor: pointer;" {onclick}>
    <rect
      x={-halfW}
      y={-halfH}
      width={resolved.width}
      height={resolved.height}
      fill={resolved.color}
    />
  </g>
</g>
