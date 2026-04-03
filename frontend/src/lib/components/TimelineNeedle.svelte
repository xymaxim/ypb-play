<script lang="ts">
  interface Props {
    px: number;
    color: string;
    width?: number;
    lineStyle?: string;
    style?: string;
    showHead: boolean;
  }

  const {
    px,
    color,
    width = 2,
    lineStyle = "solid",
    style = "",
    showHead = true,
  }: Props = $props();
</script>

<div
  class="pointer-events-none absolute z-20"
  style="
    left: {px}px;
    inset-block: 0px;
    filter: drop-shadow(0 0 2px lightgray);
    {style}     
  "
>
  <div
    class="absolute h-full rounded-full"
    style="left: 50%; transform: translateX(-50%); width: {width}px;"
  >
    <div
      class="h-full w-full rounded-full"
      style="border-left: {width}px {lineStyle} {color};"
    ></div>
  </div>
  {#if showHead}
    <div
      class="absolute h-5 w-4 rounded-sm"
      style="top: -9px; left: 50%; transform: translateX(-50%); background: {color};"
    ></div>
  {/if}
</div>
