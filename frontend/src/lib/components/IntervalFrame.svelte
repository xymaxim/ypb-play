<script lang="ts">
  import { getExplorerContext } from "../explorer.svelte.js";
  import { timeToPixel } from "../utils/timePixelUtils.ts";

  interface Props {
    barWidth: number;
  }

  const { barWidth }: Props = $props();

  interface FrameGeometry {
    left: number;
    width: number;
    borderLeft: boolean;
    borderRight: boolean;
  }

  // Constants
  const OPEN_END_WIDTH = 50;

  // Context
  const explorer = getExplorerContext();

  // Derived
  const frame = $derived.by<FrameGeometry | null>(() => {
    if (barWidth === 0) return null;
    const { A, B } = explorer.marks;
    if (A === null && B === null) return null;
    const vr = explorer.viewRange;
    if (!vr) return null;

    const aInView = A !== null ? timeToPixel(A, vr, barWidth) : null;
    const bInView = B !== null ? timeToPixel(B, vr, barWidth) : null;

    // Both marks set
    if (A !== null && B !== null) {
      if (A > vr.end && B > vr.end) return null;
      if (A < vr.start && B < vr.start) return null;
      const left = A < vr.start ? 0 : (aInView ?? 0);
      const right = B > vr.end ? barWidth : (bInView ?? barWidth);
      return {
        left,
        width: right - left,
        borderLeft: A >= vr.start,
        borderRight: B <= vr.end,
      };
    }

    // Only A set — extends right, right side always open
    if (A !== null) {
      if (aInView === null) return null;
      return {
        left: aInView,
        width: Math.min(aInView + OPEN_END_WIDTH, barWidth) - aInView,
        borderLeft: true,
        borderRight: false,
      };
    }

    // Only B set — extends left, left side always open
    if (B !== null) {
      if (bInView === null) return null;
      const left = Math.max(bInView - OPEN_END_WIDTH, 0);
      return {
        left,
        width: bInView - left,
        borderLeft: false,
        borderRight: true,
      };
    }

    return null;
  });

  const borderRadius = $derived.by(() => {
    if (!frame) return "0";
    const tl = frame.borderLeft ? "12px" : "0";
    const tr = frame.borderRight ? "12px" : "0";
    const br = frame.borderRight ? "12px" : "0";
    const bl = frame.borderLeft ? "12px" : "0";
    return `${tl} ${tr} ${br} ${bl}`;
  });

  const maskImage = $derived.by(() => {
    if (!explorer.marks.A)
      return "linear-gradient(to right, transparent, white 30%)";
    if (!explorer.marks.B)
      return "linear-gradient(to left, transparent, white 30%)";
    return "none";
  });
</script>

{#if frame !== null}
  <div
    class="drop-shadow-md] absolute z-10 rounded-lg"
    style="
                left: {frame.left}px;
                width: {frame.width}px;
                top: -2px;
                bottom: -2px;
                "
  >
    <div
      class="absolute flex h-full w-full"
      style="
               border-radius: {borderRadius};
               border-top: 0px solid var(--rewyt-interval);
               border-bottom: 0px solid var(--rewyt-interval);
               border-left: {frame.borderLeft
        ? '4px'
        : '0'} solid var(--rewyt-interval);
               border-right: {frame.borderRight
        ? '4px'
        : '0'} solid var(--rewyt-interval);
               mask-image: {maskImage};
               "
    >
      <div
        class="pointer-events-none absolute inline-flex h-full w-full rounded-[8px]"
        style="background: var(--rewyt-interval); opacity: 0.2;"
      ></div>
    </div>
  </div>
{/if}
