<script lang="ts">
  import type { BasePrimitiveProps, RectangleResolved } from "../types";

  let { x, y, resolved, onclick }: BasePrimitiveProps<RectangleResolved> =
    $props();

  const halfW = $derived(resolved.width / 2);
  const halfH = $derived(resolved.height / 2);

  const gradientId = `gradient-${Math.random().toString(36).substring(7)}`;
</script>

<defs>
  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" style="stop-color:{resolved.color};stop-opacity:1" />
    <stop offset="100%" style="stop-color:{resolved.color};stop-opacity:0" />
  </linearGradient>
</defs>

<g transform="translate({x}, {y})">
  <g transform="rotate({resolved.angle})" style="cursor: pointer;" {onclick}>
    <rect
      x={-halfW}
      y={-halfH}
      width={resolved.width}
      height={resolved.height}
      fill={`url(#${gradientId})`}
    />
  </g>
</g>
