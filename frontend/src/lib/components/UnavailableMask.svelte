<script lang="ts">
  import { useElementSize } from "$lib/hooks/useElementSize.svelte";

  interface Props {
    leftWidth?: string;
    rightWidth?: string;
    title?: string;
    class?: string;
    waveWidth?: number;
  }

  const {
    leftWidth,
    rightWidth,
    title,
    class: className = "",
    waveWidth: waveWidthProp,
  }: Props = $props();

  const size = useElementSize();

  const darkColor = "#b0b0b0";
  const lightColor = "#d0d0d0";

  const waveWidth = $derived(Math.round(waveWidthProp ?? size.height * 6));

  const gradient = $derived.by(() => {
    const w = waveWidth;
    if (w <= 0) return "none";
    return (
      `repeating-linear-gradient(to right, ` +
      `${darkColor} 0, ${darkColor} ${w * 0.2}px, ` +
      `${lightColor} ${w * 0.4}px, ${lightColor} ${w * 0.6}px, ` +
      `${darkColor} ${w * 0.8}px, ${darkColor} ${w}px)`
    );
  });
</script>

<div
  bind:this={size.el}
  class="pointer-events-none absolute inset-0 z-10 {className}"
  aria-hidden="true"
>
  {#if leftWidth}
    <div
      {title}
      class="unavailable-mask unavailable-mask--left absolute top-0 bottom-0 left-0 cursor-not-allowed"
      style="width: {leftWidth}; background-image: {gradient};"
    ></div>
  {/if}

  {#if rightWidth}
    <div
      {title}
      class="unavailable-mask unavailable-mask--right absolute top-0 right-0 bottom-0 cursor-not-allowed"
      style="width: {rightWidth}; background-image: {gradient};"
    ></div>
  {/if}
</div>

<style>
  @reference "tailwindcss";

  .unavailable-mask {
    background-color: #c0c0c0;
    pointer-events: auto;
  }

  .unavailable-mask--left {
    @apply rounded-r-2xl;
  }

  .unavailable-mask--right {
    @apply rounded-l-2xl;
  }
</style>
