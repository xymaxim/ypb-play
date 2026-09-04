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
  const openEndWidth = 20;

  // Context
  const explorer = getExplorerContext();

  // Derived
  const minimapSpan = $derived(minimapEnd - minimapStart);

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
        width: Math.min(openEndWidth, barWidth - px),
        kind: "open-right",
      };
    }

    if (B !== null) {
      const px = toPixel(B);
      if (!inRange(px)) return null;
      return {
        left: Math.max(0, px - openEndWidth),
        width: Math.min(px, openEndWidth),
        kind: "open-left",
      };
    }

    return null;
  });

  const intervalBackground = $derived.by<string>(() => {
    if (intervalFrame === null) return "";
    switch (intervalFrame.kind) {
      case "closed":
        return "color-mix(in srgb, var(--color-interval-light) 50%, transparent)";
      case "open-right":
        return "linear-gradient(to right, var(--color-interval-light), transparent)";
      case "open-left":
        return "linear-gradient(to left, var(--color-interval-light), transparent)";
    }
  });

  const intervalRounding = $derived.by<string>(() => {
    if (intervalFrame === null) return "";
    const size = "xl";
    switch (intervalFrame.kind) {
      case "closed":
        return `rounded-${size}`;
      case "open-right":
        return `rounded-l-${size}`;
      case "open-left":
        return `rounded-r-${size}`;
    }
  });

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
</script>

<div class="relative inset-x-[-0.25rem] h-full">
  {#if intervalFrame !== null}
    <div
      class="pointer-events-none absolute top-0 bottom-0 z-0 {intervalRounding}"
      style="left: {intervalFrame.left}px; width: {intervalFrame.width < 1
        ? 1
        : intervalFrame.width}px; background: {intervalBackground};"
    ></div>
  {/if}

  {#if playheadPx !== null}
    <div
      class="pointer-events-none absolute bottom-0 z-20 size-[0.5rem] -translate-x-1/2 rounded-full"
      style="left: {playheadPx}px; background: var(--color-play);"
    ></div>
  {/if}
</div>
