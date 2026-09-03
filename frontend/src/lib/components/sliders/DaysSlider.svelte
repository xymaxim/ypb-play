<script lang="ts">
  import { Slider } from "bits-ui";
  import { getExplorerContext } from "$lib/explorer.svelte.js";
  import { MS_PER_MINUTE, MS_PER_HOUR } from "$lib/utils/dateUtils";
  import { useTimeSlider } from "$lib/components/sliders/useTimeSlider.svelte";
  import MinimapOverlay from "$lib/components/MinimapOverlay.svelte";
  import UnavailableMask from "$lib/components/UnavailableMask.svelte";
  import type { DayEntry } from "$lib/types";

  const explorer = getExplorerContext();

  interface Props {
    onTimeChange?: () => void;
  }

  const { onTimeChange }: Props = $props();

  const sliderStep = 10 * MS_PER_MINUTE;

  const minimapStart = $derived(explorer.days.at(-1)?.dayStart ?? 0);
  const minimapEnd = $derived(explorer.days.at(0)?.dayEnd ?? 0);
  const minimapSpan = $derived(minimapEnd - minimapStart);

  const allowedStart = $derived(explorer.availableRange?.start ?? minimapStart);
  const allowedEnd = $derived(explorer.availableRange?.end ?? minimapEnd);

  const leftUnallowedPercent = $derived(
    minimapSpan > 0 ? ((allowedStart - minimapStart) / minimapSpan) * 100 : 0,
  );
  const rightUnallowedPercent = $derived(
    minimapSpan > 0 ? ((minimapEnd - allowedEnd) / minimapSpan) * 100 : 0,
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
    getMin: () => minimapStart,
    getMax: () => minimapEnd,
    getFallback: () => allowedStart,
    clampToSpan: false,
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
    return String(shifted.getUTCDate());
  });

  const thumbFillPercent = $derived.by<number>(() => {
    const vr = explorer.viewRange;
    if (!vr) return 0;
    const center = slider.sliderValue;
    const day =
      explorer.days.find((d) => center >= d.dayStart && center < d.dayEnd) ??
      explorer.days.find((d) => center === d.dayStart);
    if (!day) return 0;
    return ((center - day.dayStart) / (day.dayEnd - day.dayStart)) * 100;
  });

  const thumbStyle = $derived(
    `background: linear-gradient(to right, var(--rewyt-selected) ${thumbFillPercent}%, rgb(255 255 255 / 60%) ${thumbFillPercent}%);`,
  );

  function toPixel(ts: number): number {
    if (minimapSpan === 0 || slider.barWidth === 0) return 0;
    return ((ts - minimapStart) / minimapSpan) * slider.barWidth;
  }

  const dayLabels = $derived.by(() => {
    let currentMonth = -1;
    const today = new Date(Date.now() + explorer.timezoneOffset * 60 * 1000);
    return [...explorer.days].reverse().map((day) => {
      const shifted = new Date(
        day.dayStart + explorer.timezoneOffset * 60 * 1000,
      );
      const month = shifted.getUTCMonth();
      const isNewMonth = month !== currentMonth;
      currentMonth = month;
      const isToday = shifted.toDateString() === today.toDateString();
      const label = isToday
        ? "Today"
        : isNewMonth
          ? shifted.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })
          : String(shifted.getUTCDate());
      return { day, label };
    });
  });
</script>

<div bind:this={barEl} class="relative h-9 w-full select-none">
  {#each dayLabels as { day, label }}
    <span
      class="pointer-events-none absolute z-40 overflow-visible! text-xs font-medium whitespace-nowrap text-muted-foreground"
      style="left: {toPixel(
        day.dayStart + 12 * MS_PER_HOUR,
      )}px; top: 50%; transform: translate(-50%, -50%);"
    >
      {label}
    </span>
  {/each}

  <div class="pointer-events-none absolute inset-x-0 top-0 bottom-0">
    <MinimapOverlay {minimapStart} {minimapEnd} barWidth={slider.barWidth} />
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
      min={minimapStart}
      max={minimapEnd}
      step={sliderStep}
      bind:value={slider.sliderValue}
      onValueChange={(v) => {
        const clamped = Math.min(Math.max(v, allowedStart), allowedEnd);
        slider.onValueChange(clamped);
      }}
      onpointerdown={slider.onPointerDown}
      onpointerup={slider.onPointerUp}
      class="pointer-events-auto relative flex h-full w-full touch-none items-center"
    >
      <Slider.Track
        class="relative h-full w-full cursor-pointer overflow-hidden rounded-2xl bg-transparent"
      >
        <Slider.Range class="absolute h-full bg-transparent" />
      </Slider.Track>

      <Slider.Thumb
        index={0}
        class="block flex size-9 cursor-ew-resize items-center justify-center rounded-full bg-[var(--rewyt-selected)]! shadow-sm transition-opacity outline-none
                {slider.thumbHidden
          ? 'pointer-events-none opacity-0'
          : 'opacity-100'}"
        style={thumbStyle}
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
