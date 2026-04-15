<script lang="ts">
  const CIRCLE_DIAMETER: number = 95;
  const CONTAINER_W: number = 640;
  const CONTAINER_H: number = 120;
  const TARGET_GAP: number = 10;
  const r: number = CIRCLE_DIAMETER / 2;

  const N: number =
    Math.round(CONTAINER_W / (CIRCLE_DIAMETER + TARGET_GAP)) + 1;
  const step: number = (CONTAINER_W - r) / (N - 1);

  const cy: number = CONTAINER_H / 2;
  const columns: number[] = Array.from({ length: N }, (_, i) => r + i * step);
</script>

<div
  class="bg-neutral-0 relative mt-10 overflow-hidden rounded-2xl"
  style="width: {CONTAINER_W}px; height: {CONTAINER_H}px; margin-left: auto; margin-right: auto;"
>
  <svg
    width={CONTAINER_W}
    height={CONTAINER_H}
    aria-hidden="true"
    class="absolute inset-0"
  >
    {#each columns as cx}
      <circle {cx} {cy} {r} style="fill: var(--ypb-play);" />
    {/each}
  </svg>
</div>
