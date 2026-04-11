<script lang="ts">
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Minus, Plus } from "lucide-svelte";
  import { getExplorerContext } from "../explorer.svelte";
  import { ZOOM_LEVELS, type ZoomLevelKey } from "../types";
  import { MS_PER_HOUR } from "../utils/dateUtils";
  import MinimapOverlay from "./MinimapOverlay.svelte";

  interface Props {
    showControls?: boolean;
    class?: string;
  }

  let { showControls = true, class: className }: Props = $props();

  const explorer = getExplorerContext();

  let barEl = $state<HTMLDivElement | null>(null);
  let barWidth = $state(0);
  let isDragging = $state(false);
  let dragStartX = $state(0);
  let dragStartRangeStart = $state(0);
  let dragWindowStart = $state(0);
  let dragWindowEnd = $state(0);

  $effect(() => {
    if (!barEl) return;
    const ro = new ResizeObserver((entries) => {
      barWidth = entries[0].contentRect.width;
    });
    ro.observe(barEl);
    return () => ro.disconnect();
  });

  const windowStart = $derived(
    isDragging ? dragWindowStart : (explorer.dayWindow?.start ?? 0),
  );
  const windowEnd = $derived(
    isDragging ? dragWindowEnd : (explorer.dayWindow?.end ?? 0),
  );
  const windowSpan = $derived(windowEnd - windowStart);

  const zoomKeys = Object.keys(ZOOM_LEVELS) as ZoomLevelKey[];
  const zoomKey = $derived(
    (Object.entries(ZOOM_LEVELS).find(
      ([, v]) => v === explorer.zoomLevel,
    )?.[0] ?? "1d") as ZoomLevelKey,
  );
  const zoomIdx = $derived(zoomKeys.indexOf(zoomKey));

  function zoomOut() {
    const next = zoomIdx + 1;
    if (next < zoomKeys.length) explorer.setZoom(ZOOM_LEVELS[zoomKeys[next]]);
  }

  function zoomIn() {
    const next = zoomIdx - 1;
    if (next >= 0) explorer.setZoom(ZOOM_LEVELS[zoomKeys[next]]);
  }

  interface Label {
    px: number;
    text: string;
  }

  const labels = $derived.by<Label[]>(() => {
    if (barWidth === 0 || windowSpan === 0) return [];
    const result: Label[] = [];
    let t = windowStart;
    while (t < windowEnd) {
      const hourIndex = Math.round((t - windowStart) / MS_PER_HOUR);
      const wallHour = new Date(
        t + explorer.timezoneOffset * 60 * 1000,
      ).getUTCHours();
      if (hourIndex % 2 === 0) {
        const center = t + 30 * 60 * 1000;
        const px = ((center - windowStart) / windowSpan) * barWidth;
        result.push({ px, text: `${wallHour}h` });
      }
      t += MS_PER_HOUR;
    }
    return result;
  });

  const dots = $derived.by<number[]>(() => {
    if (barWidth === 0 || windowSpan === 0) return [];
    const result: number[] = [];
    let t = windowStart;
    while (t < windowEnd) {
      const hourIndex = Math.round((t - windowStart) / MS_PER_HOUR);
      if (hourIndex % 2 !== 0) {
        const center = t + 30 * 60 * 1000;
        result.push(((center - windowStart) / windowSpan) * barWidth);
      }
      t += MS_PER_HOUR;
    }
    return result;
  });

  const spanLeft = $derived.by(() => {
    const vr = explorer.viewRange;
    if (!vr || windowSpan === 0) return 0;
    return ((vr.start - windowStart) / windowSpan) * barWidth;
  });

  const spanWidth = $derived.by(() => {
    const vr = explorer.viewRange;
    if (!vr || windowSpan === 0) return 0;
    return ((vr.end - vr.start) / windowSpan) * barWidth;
  });

  function onSpanMouseDown(e: MouseEvent) {
    e.preventDefault();
    dragStartX = e.clientX;
    dragStartRangeStart = explorer.viewRange?.start ?? windowStart;
    dragWindowStart = windowStart;
    dragWindowEnd = windowEnd;
    isDragging = true;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dtMs = (dx / barWidth) * windowSpan;
    const spanDuration =
      (explorer.viewRange?.end ?? 0) - (explorer.viewRange?.start ?? 0);

    let newStart = dragStartRangeStart + dtMs;
    let newEnd = newStart + spanDuration;

    if (newStart < dragWindowStart) {
      newStart = dragWindowStart;
      newEnd = newStart + spanDuration;
    }
    if (newEnd > dragWindowEnd) {
      newEnd = dragWindowEnd;
      newStart = newEnd - spanDuration;
    }

    explorer.setViewRange({ start: newStart, end: newEnd });
  }

  function onMouseUp() {
    isDragging = false;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  function onBarClick(e: MouseEvent) {
    if (!barEl || isDragging) return;
    const rect = barEl.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const spanDuration =
      (explorer.viewRange?.end ?? 0) - (explorer.viewRange?.start ?? 0);
    const center = windowStart + (px / barWidth) * windowSpan;

    let newStart = center - spanDuration / 2;
    let newEnd = newStart + spanDuration;

    if (newStart < windowStart) {
      newStart = windowStart;
      newEnd = newStart + spanDuration;
    }
    if (newEnd > windowEnd) {
      newEnd = windowEnd;
      newStart = newEnd - spanDuration;
    }

    explorer.setViewRange({ start: newStart, end: newEnd });
  }
</script>

<div class="flex w-full flex-row items-center gap-2 {className}">
  <div
    bind:this={barEl}
    class="relative h-[38px] flex-1 cursor-pointer select-none"
    onclick={onBarClick}
  >
    {#each labels as label}
      <span
        class="pointer-events-none absolute text-xs whitespace-nowrap text-muted-foreground"
        style="left: {label.px}px; top: 50%; transform: translate(-50%, -50%);"
      >
        {label.text}
      </span>
    {/each}
    {#each dots as px}
      <div
        class="pointer-events-none absolute h-1 w-1 rounded-full bg-gray-300/60"
        style="left: {px}px; top: 50%; transform: translate(-50%, -50%);"
      ></div>
    {/each}

    <div
      class="absolute top-1 bottom-1 z-30 cursor-ew-resize rounded-lg border-2 border-gray-300/60 bg-gray-300/20"
      style="left: {spanLeft}px; width: {spanWidth}px;"
      onmousedown={onSpanMouseDown}
      onclick={(e) => e.stopPropagation()}
    ></div>
    <MinimapOverlay
      minimapStart={windowStart}
      minimapEnd={windowEnd}
      {barWidth}
    />
  </div>

  {#if showControls}
    <div class="flex shrink-0 gap-1">
      <ButtonGroup.Root aria-label="Zoom controls" class="h-fit">
        <Button
          variant="ghost"
          size="icon-sm"
          class="cursor-pointer"
          onclick={zoomOut}
          disabled={zoomIdx >= zoomKeys.length - 1}
        >
          <Minus />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          class="cursor-pointer"
          onclick={zoomIn}
          disabled={zoomIdx <= 0}
        >
          <Plus />
        </Button>
      </ButtonGroup.Root>
    </div>
  {/if}
</div>
