<script lang="ts">
  import { getExplorerContext } from "../explorer.svelte";
  import { MS_PER_HOUR } from "../utils/dateUtils";
  import MinimapOverlay from "./MinimapOverlay.svelte";
  import type { DayEntry } from "../types";

  const explorer = getExplorerContext();

  // State
  let barEl = $state<HTMLDivElement | null>(null);
  let barWidth = $state(0);
  let hoverDay = $state<DayEntry | null>(null);

  // Derived
  const minimapStart = $derived(
    explorer.days[explorer.days.length - 1].dayStart,
  );
  const minimapEnd = $derived(explorer.days[0].dayEnd);
  const minimapSpan = $derived(minimapEnd - minimapStart);

  const activeRect = $derived.by<{ left: number; width: number } | null>(() => {
    const dw = explorer.dayWindow;
    if (!dw) return null;
    const start = Math.max(dw.start, minimapStart);
    const end = Math.min(dw.end, minimapEnd);
    return { left: toPixel(start), width: toPixel(end) - toPixel(start) };
  });

  const hoverRect = $derived.by<{ left: number; width: number } | null>(() => {
    if (!hoverDay) return null;
    return dayWindowRect(hoverDay);
  });

  // Effects
  $effect(() => {
    if (!barEl) return;
    const ro = new ResizeObserver((entries) => {
      barWidth = entries[0].contentRect.width;
    });
    ro.observe(barEl);
    return () => ro.disconnect();
  });

  // Pixel helpers
  function toPixel(ts: number): number {
    return ((ts - minimapStart) / minimapSpan) * barWidth;
  }

  function dayWindowTs(day: DayEntry): { start: number; end: number } {
    return explorer.centeredOnMidnight
      ? {
          start: day.dayStart - 12 * MS_PER_HOUR,
          end: day.dayStart + 12 * MS_PER_HOUR,
        }
      : { start: day.dayStart, end: day.dayEnd };
  }

  function dayWindowRect(day: DayEntry): { left: number; width: number } {
    const { start, end } = dayWindowTs(day);
    const clampedStart = Math.max(start, minimapStart);
    const clampedEnd = Math.min(end, minimapEnd);
    return {
      left: toPixel(clampedStart),
      width: toPixel(clampedEnd) - toPixel(clampedStart),
    };
  }

  function dayAtPixel(px: number): DayEntry | null {
    const ts = minimapStart + (px / barWidth) * minimapSpan;

    if (explorer.centeredOnMidnight) {
      const todayEnd = explorer.days[0].dayEnd;
      const nearest = explorer.days.reduce((best, d) =>
        Math.abs(d.dayStart - ts) < Math.abs(best.dayStart - ts) ? d : best,
      );
      if (Math.abs(todayEnd - ts) < Math.abs(nearest.dayStart - ts)) {
        return {
          ...explorer.days[0],
          dayStart: todayEnd,
          dayEnd: todayEnd + 24 * MS_PER_HOUR,
        };
      }
      return nearest;
    }

    return explorer.days.find((d) => ts >= d.dayStart && ts < d.dayEnd) ?? null;
  }

  // Formatting
  function formatLabel(day: DayEntry): string {
    const off = explorer.timezoneOffset;
    const nowShifted = new Date(Date.now() + off * 60 * 1000);
    const dayShifted = new Date(day.dayStart + off * 60 * 1000);
    const isToday =
      nowShifted.getUTCFullYear() === dayShifted.getUTCFullYear() &&
      nowShifted.getUTCMonth() === dayShifted.getUTCMonth() &&
      nowShifted.getUTCDate() === dayShifted.getUTCDate();
    if (isToday) return "Today";
    return dayShifted.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }

  // Event handlers
  function onMouseMove(e: MouseEvent) {
    if (!barEl) return;
    hoverDay = dayAtPixel(e.clientX - barEl.getBoundingClientRect().left);
  }

  function onMouseLeave() {
    hoverDay = null;
  }

  function onClick(e: MouseEvent) {
    if (!barEl) return;
    const day = dayAtPixel(e.clientX - barEl.getBoundingClientRect().left);
    if (!day) return;
    const spanMs = explorer.zoomLevel;
    const { start, end } = dayWindowTs(day);
    const center = (start + end) / 2;

    let newStart = center - spanMs / 2;
    let newEnd = newStart + spanMs;
    if (newStart < start) {
      newStart = start;
      newEnd = newStart + spanMs;
    }
    if (newEnd > end) {
      newEnd = end;
      newStart = newEnd - spanMs;
    }

    explorer.setViewRange({ start: newStart, end: newEnd });
  }
</script>

<div
  bind:this={barEl}
  class="relative mt-1 h-[36px] w-full cursor-pointer p-[3px] select-none"
  onmousemove={onMouseMove}
  onmouseleave={onMouseLeave}
  onclick={onClick}
>
  {#if hoverRect !== null}
    <div
      class="pointer-events-none absolute inset-y-1 rounded-lg border-2 border-gray-200 transition-[left,width]"
      style="left: {hoverRect.left}px; width: {hoverRect.width}px;"
    ></div>
  {/if}

  {#if activeRect !== null}
    <div
      class="pointer-events-none absolute inset-y-1 rounded-lg border-2 border-gray-300"
      style="left: {activeRect.left}px; width: {activeRect.width}px;"
    ></div>
  {/if}

  {#each explorer.days.slice(0, -1) as day}
    {@const dw = explorer.dayWindow}
    {@const isActiveEdge =
      dw && (day.dayStart === dw.start || day.dayStart === dw.end)}
    {#if !isActiveEdge && !hoverDay}
      <div
        class="pointer-events-none absolute w-[2px] bg-gray-300"
        style="left: {toPixel(
          day.dayStart,
        )}px; height: 10px; top: 50%; transform: translate(-50%, -50%);"
      ></div>
    {/if}
  {/each}

  {#each explorer.days as day}
    <span
      class="pointer-events-none absolute text-sm whitespace-nowrap text-muted-foreground"
      style="left: {toPixel(
        day.dayStart + 12 * MS_PER_HOUR,
      )}px; top: 50%; transform: translate(-50%, -50%);"
    >
      {formatLabel(day)}
    </span>
  {/each}

  <MinimapOverlay {minimapStart} {minimapEnd} {barWidth} />
</div>
