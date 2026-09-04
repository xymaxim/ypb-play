<script lang="ts">
  import { getExplorerContext } from "../explorer.svelte.js";
  import { timeToPixel } from "../utils/timePixelUtils.ts";
  import { useElementSize } from "$lib/hooks/useElementSize.svelte";

  interface Props {
    color?: string;
  }

  const { color = "var(--color-interval-200)" }: Props = $props();

  const explorer = getExplorerContext();
  const container = useElementSize();
  const radius = $derived(container.height / 2);

  const edgeWidth = 1;
  const edgeColor = "bg-black";

  const computed = $derived.by(() => {
    if (container.width === 0) return null;

    const { A, B } = explorer.marks;
    if (A === null && B === null) return null;

    const vr = explorer.viewRange;
    if (!vr) return null;

    const aInView = A !== null ? timeToPixel(A, vr, container.width) : null;
    const bInView = B !== null ? timeToPixel(B, vr, container.width) : null;

    const showA = A !== null && A >= vr.start && A <= vr.end;
    const showB = B !== null && B >= vr.start && B <= vr.end;

    if (A !== null && B !== null) {
      if (A > vr.end && B > vr.end) return null;
      if (A < vr.start && B < vr.start) return null;

      const left = A < vr.start ? 0 : (aInView ?? 0);
      const right = B > vr.end ? container.width : (bInView ?? container.width);

      return { left, right, showA, showB };
    }

    if (A !== null) {
      if (!showA) return null;
      return { left: aInView!, right: null, showA, showB: false };
    }

    if (B !== null) {
      if (!showB) return null;
      return { left: null, right: bInView!, showA: false, showB };
    }

    return null;
  });
</script>

<div
  bind:this={container.el}
  class="pointer-events-none absolute inset-0 z-10 h-full items-center"
>
  {#if computed !== null}
    {#if computed.left !== null && computed.right !== null}
      <div
        class="absolute rounded-xl bg-[var(--color-interval-300)]!"
        style="
          left: calc({computed.left}px);
          width: {computed.right - computed.left}px;
          height: {container.height}px;
          top: 50%;
          transform: translateY(-50%);
          background: {color};
        "
      ></div>
    {/if}

    {#if computed.showA}
      {@const thumbOffset = !computed.showB ? Math.floor(edgeWidth / 2) : 0}
      {#if !computed.showB}
        <div
          class="absolute {edgeColor} top-0 bottom-0 {edgeWidth > 1
            ? '-translate-x-1/2'
            : ''}"
          style="
          width: {edgeWidth}px;
          left: {computed.left}px;
        "
        >
          <div class="b-rose-200 h-2 w-2">xx</div>
        </div>
      {/if}
      <div
        class="absolute -translate-y-1/2 rounded-full"
        style="
          left: {computed.left! - 2 * radius - thumbOffset}px;
          width: {container.height}px;
          height: {container.height}px;
          top: 50%;
          background: {color};
        "
      ></div>
    {/if}

    {#if computed.showB}
      {@const thumbOffset = !computed.showA ? Math.ceil(edgeWidth / 2) : 0}
      {#if !computed.showA}
        <div
          class="absolute {edgeColor} top-0 bottom-0 {edgeWidth > 1
            ? '-translate-x-1/2'
            : ''}"
          style="left: {computed.right}px; width: {edgeWidth}px"
        ></div>
      {/if}
      <div
        class="absolute rounded-full"
        style="
          left: {computed.right! + thumbOffset}px;
          width: {container.height}px;
          height: {container.height}px;
          top: 50%;
          transform: translateY(-50%);
          background: {color};
        "
      ></div>
    {/if}
  {/if}
</div>
