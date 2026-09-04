<script lang="ts">
  import { Slider } from "bits-ui";
  import { getExplorerContext } from "$lib/explorer.svelte.js";
  import { MS_PER_MINUTE, MS_PER_HOUR } from "$lib/utils/dateUtils";
  import { findDay } from "$lib/utils/timelineUtils";
  import { useTimeSlider } from "$lib/components/sliders/useTimeSlider.svelte";
  import MinimapOverlay from "$lib/components/MinimapOverlay.svelte";
  import UnavailableMask from "$lib/components/UnavailableMask.svelte";

  interface Props {
    tickStepHours?: number;
    onTimeChange?: () => void;
  }

  const { tickStepHours = 4, onTimeChange }: Props = $props();

  const explorer = getExplorerContext();

  const currentDay = $derived.by(() => {
    const vr = explorer.viewRange;
    if (!vr) return explorer.days[0] ?? null;
    const center = (vr.start + vr.end) / 2;
    return findDay(center, explorer.days) ?? explorer.days[0] ?? null;
  });

  const dayStart = $derived.by(() => {
    if (explorer.centeredOnMidnight && currentDay) {
      // Find nearest midnight to view range center
      const vr = explorer.viewRange;
      if (!vr) return currentDay.dayStart;
      const center = (vr.start + vr.end) / 2;
      const nearest = explorer.days.reduce((best, d) =>
        Math.abs(d.dayStart - center) < Math.abs(best.dayStart - center)
          ? d
          : best,
      );
      return nearest.dayStart - 12 * MS_PER_HOUR;
    }
    return currentDay?.dayStart ?? 0;
  });

  const dayEnd = $derived.by(() => {
    if (explorer.centeredOnMidnight && currentDay) {
      return dayStart + 24 * MS_PER_HOUR;
    }
    return currentDay?.dayEnd ?? dayStart + 24 * MS_PER_HOUR;
  });

  // const dayStart = $derived(currentDay?.dayStart ?? 0);
  // const dayEnd = $derived(currentDay?.dayEnd ?? dayStart + 24 * MS_PER_HOUR);
  const daySpan = $derived(dayEnd - dayStart);

  const spanMs = $derived(explorer.viewRange.end - explorer.viewRange.start);
  const sliderStep = $derived.by(() => {
    if (slider.barWidth === 0) return 1000;
    return Math.round(spanMs / slider.barWidth / 1000) * 1000;
  });

  const allowedStart = $derived(
    Math.max(dayStart, explorer.availableRange?.start ?? dayStart),
  );
  const allowedEnd = $derived(
    Math.min(dayEnd, explorer.availableRange?.end ?? dayEnd),
  );

  const leftUnallowedPercent = $derived(
    daySpan > 0 ? ((allowedStart - dayStart) / daySpan) * 100 : 0,
  );
  const rightUnallowedPercent = $derived(
    daySpan > 0 ? ((dayEnd - allowedEnd) / daySpan) * 100 : 0,
  );

  const thumbOffset = 18;

  const leftMaskWidth = $derived.by(() => {
    if (slider.barWidth === 0) return `${leftUnallowedPercent}%`;
    const pixels = (leftUnallowedPercent / 100) * slider.barWidth + thumbOffset;
    return `${(pixels / (slider.barWidth + 2 * thumbOffset)) * 100}%`;
  });

  const rightMaskWidth = $derived.by(() => {
    if (slider.barWidth === 0) return `${rightUnallowedPercent}%`;
    const pixels =
      (rightUnallowedPercent / 100) * slider.barWidth + thumbOffset;
    return `${(pixels / (slider.barWidth + 2 * thumbOffset)) * 100}%`;
  });

  const slider = useTimeSlider({
    getMin: () => dayStart,
    getMax: () => dayEnd,
    getFallback: () => allowedStart + (allowedEnd - allowedStart) / 2,
    clampToSpan: true,
    onTimeChange,
  });

  let barEl = $state<HTMLDivElement | null>(null);
  $effect(() => {
    slider.setBarEl(barEl);
  });

  const thumbLabel = $derived.by<string>(() => {
    const shifted = new Date(
      slider.sliderValue + explorer.timezoneOffset * 60 * 1000,
    );
    const hour = shifted.getUTCHours();
    const cappedHour =
      hour === 0 && slider.sliderValue >= dayEnd - 1 ? 23 : hour;
    return `${cappedHour}h`;
  });

  const hourTicks = $derived.by<{ ts: number; px: number; label: string }[]>(
    () => {
      if (daySpan === 0 || slider.barWidth === 0) return [];
      const stepMs = tickStepHours * MS_PER_HOUR;
      const ticks: { ts: number; px: number; label: string }[] = [];
      let ts = dayStart;
      while (ts < dayEnd) {
        const px = ((ts - dayStart) / daySpan) * slider.barWidth;
        const shifted = new Date(ts + explorer.timezoneOffset * 60 * 1000);
        ticks.push({ ts, px, label: `${shifted.getUTCHours()}h` });
        ts += stepMs;
      }
      return ticks;
    },
  );

  function onValueChange(v: number) {
    const clamped = Math.min(Math.max(v, allowedStart), allowedEnd);
    slider.onValueChange(clamped);
  }
</script>

<div bind:this={barEl} class="relative h-9 w-full select-none">
  {#each hourTicks as tick}
    <span
      class="pointer-events-none absolute z-40 text-xs font-medium whitespace-nowrap text-muted-foreground"
      style="left: {tick.px}px; top: 50%; transform: translate(-50%, -50%);"
    >
      {tick.label}
    </span>
  {/each}

  <div class="pointer-events-none absolute inset-x-0 top-0 bottom-0">
    <MinimapOverlay
      minimapStart={dayStart}
      minimapEnd={dayEnd}
      barWidth={slider.barWidth}
    />
  </div>

  <div
    class="pointer-events-none absolute inset-y-0 z-30 overflow-hidden rounded-2xl"
    style="left: -{thumbOffset}px; right: -{thumbOffset}px;"
  >
    <UnavailableMask
      leftWidth={leftUnallowedPercent > 0 ? leftMaskWidth : undefined}
      rightWidth={rightUnallowedPercent > 0 ? rightMaskWidth : undefined}
      title="Outside rewind range"
    />
  </div>

  <div
    class="pointer-events-none absolute inset-y-0 z-50"
    style="left: -{thumbOffset}px; right: -{thumbOffset}px;"
  >
    <Slider.Root
      type="single"
      min={dayStart}
      max={dayEnd}
      step={sliderStep}
      bind:value={slider.sliderValue}
      {onValueChange}
      onpointerdown={slider.onPointerDown}
      onpointerup={slider.onPointerUp}
      class="pointer-events-auto relative flex h-full w-full cursor-pointer touch-none items-center"
    >
      <Slider.Thumb
        index={0}
        class="relative flex size-9 cursor-ew-resize items-center justify-center rounded-full
               bg-[var(--rewyt-selected)] shadow-sm transition-opacity outline-none
               {slider.thumbHidden
          ? 'pointer-events-none opacity-0'
          : 'opacity-100'}"
      >
        <span
          class="pointer-events-none text-sm font-bold tracking-wide text-foreground select-none"
        >
          {thumbLabel}
        </span>
      </Slider.Thumb>
    </Slider.Root>
  </div>
</div>
