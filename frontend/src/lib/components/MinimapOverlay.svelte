<script lang="ts">
  import { getExplorerContext } from "../explorer.svelte.js";

  interface Props {
    minimapStart: number;
    minimapEnd: number;
    barWidth: number;
  }

  const { minimapStart, minimapEnd, barWidth }: Props = $props();

  // Types
  type IntervalKind = "closed" | "open-right" | "open-left";

  interface FrameGeometry {
    left: number;
    width: number;
    kind: IntervalKind;
  }

  // Constants
  const OPEN_END_WIDTH = 25;

  // Context
  const explorer = getExplorerContext();

  // Derived: base
  const minimapSpan = $derived(minimapEnd - minimapStart);

  // Helpers
  function toPixel(ts: number): number {
    return ((ts - minimapStart) / minimapSpan) * barWidth;
  }

  function clamp(px: number): number {
    return Math.max(0, Math.min(barWidth, px));
  }

  function inRange(px: number): boolean {
    return px >= 0 && px <= barWidth;
  }

  // Derived: markers
  const playheadPx = $derived.by<number | null>(() => {
    const t = explorer.playheadTime;
    if (t === null || minimapSpan === 0 || barWidth === 0) return null;
    const px = toPixel(t);
    return inRange(px) ? px : null;
  });

  const selectedPx = $derived.by<number | null>(() => {
    const t = explorer.selectedTime;
    if (t === null || minimapSpan === 0 || barWidth === 0) return null;
    const px = toPixel(t);
    return inRange(px) ? px : null;
  });

  // Derived: interval frame
  const intervalFrame = $derived.by<FrameGeometry | null>(() => {
    const { A, B } = explorer.marks;
    if ((A === null && B === null) || minimapSpan === 0 || barWidth === 0)
      return null;

    if (A !== null && B !== null) {
      if (A > minimapEnd || B < minimapStart) return null;
      const left = clamp(toPixel(A));
      const right = clamp(toPixel(B));
      return { left, width: right - left, kind: "closed" };
    }

    if (A !== null) {
      const px = toPixel(A);
      if (!inRange(px)) return null;
      return {
        left: px,
        width: Math.min(OPEN_END_WIDTH, barWidth - px),
        kind: "open-right",
      };
    }

    if (B !== null) {
      const px = toPixel(B);
      if (!inRange(px)) return null;
      return {
        left: Math.max(0, px - OPEN_END_WIDTH),
        width: Math.min(px, OPEN_END_WIDTH),
        kind: "open-left",
      };
    }

    return null;
  });

  const intervalBackground = $derived.by<string>(() => {
    if (intervalFrame === null) return "";
    switch (intervalFrame.kind) {
      case "closed":
        return "color-mix(in srgb, var(--ypb-interval) 10%, transparent)";
      case "open-right":
        return "linear-gradient(to right, color-mix(in srgb, var(--ypb-interval) 20%, transparent), transparent)";
      case "open-left":
        return "linear-gradient(to left, color-mix(in srgb, var(--ypb-interval) 20%, transparent), transparent)";
    }
  });
</script>

{#if intervalFrame !== null}
  <div
    class="pointer-events-none absolute top-0 bottom-0 z-10"
    style="left: {intervalFrame.left}px; width: {intervalFrame.width}px; background: {intervalBackground};"
  ></div>
{/if}

{#if selectedPx !== null}
  <div
    class="pointer-events-none absolute top-[0px] bottom-[0px] z-30 w-[2px] opacity-70"
    style="left: {selectedPx}px; background: var(--ypb-selected);"
  ></div>
{/if}

{#if playheadPx !== null}
  <div
    class="pointer-events-none absolute top-[0px] bottom-[0px] z-40 w-[2px] opacity-100"
    style="left: {playheadPx}px; background: var(--ypb-play-light);"
  ></div>
{/if}
