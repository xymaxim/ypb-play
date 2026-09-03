<script lang="ts">
  import { getExplorerContext } from "$lib/explorer.svelte";
  import { useElementSize } from "$lib/hooks/useElementSize.svelte";
  import { pixelToTime } from "$lib/utils/timePixelUtils";

  interface Props {
    color?: string;
  }

  const { color = "var(--rewyt-interval-200)" }: Props = $props();

  const explorer = getExplorerContext();
  const container = useElementSize();

  const vr = $derived(explorer.viewRange);
  const { A, B } = $derived(explorer.marks);

  const hasA = $derived(A !== null);
  const hasB = $derived(B !== null);
  const hasBoth = $derived(hasA && hasB);
  const hasEither = $derived(hasA || hasB);

  const isAVisible = $derived(
    hasA && vr !== null && A! >= vr.start && A! <= vr.end,
  );
  const isBVisible = $derived(
    hasB && vr !== null && B !== null && B >= vr.start && B <= vr.end,
  );

  const fill = $derived.by(() => {
    if (!vr || container.width === 0) return null;
    if (A === null && B === null) return null;

    if (hasBoth) {
      if (A! > vr.end && B! > vr.end) return null;
      if (A! < vr.start && B! < vr.start) return null;
      const left =
        A! < vr.start
          ? 0
          : ((A! - vr.start) / (vr.end - vr.start)) * container.width;
      const right =
        B! > vr.end
          ? container.width
          : ((B! - vr.start) / (vr.end - vr.start)) * container.width;
      return { left, right };
    }

    if (hasA && isAVisible) {
      const px = ((A! - vr.start) / (vr.end - vr.start)) * container.width;
      return { left: px, right: null };
    }

    if (hasB && isBVisible) {
      const px = ((B! - vr.start) / (vr.end - vr.start)) * container.width;
      return { left: null, right: px };
    }

    return null;
  });

  const thumbSize = $derived(container.height);

  let dragging = $state<"A" | "B" | null>(null);

  function onThumbPointerDown(e: PointerEvent, mark: "A" | "B") {
    if (!container.el || !vr) return;
    dragging = mark;
    explorer.setIsIntervalDragging(true);
    container.el.setPointerCapture(e.pointerId);
  }

  function onPointerUp(e: PointerEvent) {
    if (dragging && container.el) {
      container.el.releasePointerCapture(e.pointerId);
      const blockClick = (ev: MouseEvent) => {
        ev.stopPropagation();
        window.removeEventListener("click", blockClick, true);
      };
      window.addEventListener("click", blockClick, true);
    }
    dragging = null;
    explorer.setIsIntervalDragging(false);
    explorer.setIsSliding(false);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !container.el || !vr) return;
    const rect = container.el.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 0), container.width);
    const ts = pixelToTime(x, vr, container.width);
    if (ts === null) return;

    let clamped = ts;
    if (dragging === "A" && B !== null) clamped = Math.min(ts, B);
    if (dragging === "B" && A !== null) clamped = Math.max(ts, A);

    explorer.assignMark(dragging, clamped);
  }
</script>

<div
  bind:this={container.el}
  class="pointer-events-none absolute inset-0 z-20 h-full touch-none"
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
>
  {#if fill !== null && vr !== null && hasEither}
    <!-- Interval fill -->
    {#if fill.left !== null && fill.right !== null}
      <div
        class="pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-xl"
        style="
          left: {fill.left + 1}px;
          width: {fill.right - fill.left - 2}px;
          height: {container.height}px;
          background: {color};
        "
      ></div>
    {/if}

    <!-- Edge line -->
    {#if isAVisible && fill.left !== null}
      <div
        class="pointer-events-none absolute top-0 bottom-0 flex -translate-x-px"
        style="left: {fill.left}px; height: {thumbSize}px"
      >
        <div
          class="h-full w-[2px] rounded-full bg-[var(--rewyt-interval-200)]"
        ></div>
        {#if fill.right === null}
          <div
            class="h-full rounded-l-xl"
            style="
                         width: {thumbSize}px;
                         background: linear-gradient(to right, {color}, transparent);
                         "
          ></div>
        {/if}
      </div>
    {/if}
    {#if isBVisible && fill.right !== null}
      <div
        class="pointer-events-none absolute top-0 bottom-0 flex -translate-x-px"
        style="left: {fill.right}px; height: {thumbSize}px"
      >
        <div
          class="h-full w-[2px] rounded-full bg-[var(--rewyt-interval-200)]"
        ></div>

        {#if fill.left === null}
          <div
            class="h-full -translate-x-full rounded-r-xl"
            style="
                         width: {thumbSize}px;
                         transform: translateX(-2px);
                         background: linear-gradient(to left, {color}, transparent);
                         "
          ></div>
        {/if}
      </div>
    {/if}

    <!-- A thumb -->
    {#if isAVisible && fill.left !== null}
      <div
        class="pointer-events-auto absolute top-1/2 flex -translate-y-1/2 cursor-ew-resize rounded-full shadow-sm"
        onpointerdown={(e) => onThumbPointerDown(e, "A")}
        style="
                   left: {fill.left - thumbSize - 1}px;
                   width: {thumbSize}px;
                   height: {thumbSize}px;
                   background: var(--rewyt-interval-100);
                   "
      >
        <div
          class="flex flex-1 items-center justify-center text-base font-medium"
        >
          A
        </div>
      </div>
    {/if}

    <!-- B thumb -->
    {#if isBVisible && fill.right !== null}
      <div
        class="pointer-events-auto absolute top-1/2 flex -translate-y-1/2 cursor-ew-resize rounded-full"
        onpointerdown={(e) => onThumbPointerDown(e, "B")}
        style="
          left: {fill.right + 1}px;
          width: {thumbSize}px;
          height: {thumbSize}px;
          background: var(--rewyt-interval-100);
        "
      >
        <span
          class="flex flex-1 items-center justify-center text-base font-medium"
          >B</span
        >
      </div>
    {/if}
  {/if}
</div>
