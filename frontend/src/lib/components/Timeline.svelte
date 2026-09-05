<script lang="ts">
  import { getExplorerContext } from "$lib/explorer.svelte";
  import { MS_PER_HOUR } from "$lib/utils/dateUtils";
  import { formatTime } from "$lib/utils/dateTimeUtils";
  import { useElementSize } from "$lib/hooks/useElementSize.svelte";
  import { pixelToTime, timeToPixel } from "$lib/utils/timePixelUtils";
  import {
    buildTicks,
    findDay,
    getStripeBackground,
    snapTime,
  } from "$lib/utils/timelineUtils";
  import PanGuideButton from "$lib/components/PanGuideButton.svelte";
  import IntervalSlider from "$lib/components/sliders/IntervalSlider.svelte";
  import RewindSlider from "$lib/components/sliders/RewindSlider.svelte";
  import UnavailableMask from "$lib/components/UnavailableMask.svelte";

  import {
    Camera,
    Circle,
    Pause,
    Play,
    Radio,
    RotateCcw,
    Settings,
    ZoomIn,
  } from "lucide-svelte";

  interface Props {
    seekableRange: { start: number; end: number } | null;
    mpdStartTime: number;
    isRewound: boolean;
    onRewind: (isoTime: string, pause?: boolean) => Promise<boolean>;
    onSeekTo: (time: number, pause?: boolean) => void;
    onTimeChange?: () => void;
  }

  let {
    seekableRange,
    mpdStartTime,
    isRewound,
    onRewind,
    onSeekTo,
    onTimeChange,
  }: Props = $props();

  const explorer = getExplorerContext();
  const bar = useElementSize();

  let timelineEl = $state<HTMLDivElement | null>(null);
  let hoverPx = $state<number | null>(null);

  const notAvailableMessage = "Outside rewind range";

  const range = $derived(
    explorer.viewRange && bar.width > 0 ? explorer.viewRange : null,
  );

  const ticks = $derived.by(() => {
    if (range === null) return [];
    const center = (range.start + range.end) / 2;
    const day = findDay(center, explorer.days);
    const dayStart =
      day?.dayStart ?? Math.floor(center / MS_PER_HOUR) * MS_PER_HOUR;
    return buildTicks(range, bar.width, dayStart, explorer.timezoneOffset).map(
      (tick) => {
        if (!tick.major || tick.label !== "00:00")
          return { ...tick, dayLabel: null };
        const ts = pixelToTime(tick.px, range, bar.width);
        return {
          ...tick,
          dayLabel:
            ts !== null ? formatDayLabel(ts, explorer.timezoneOffset) : null,
        };
      },
    );
  });

  const { stripeWidthPx, stripeOffsetPx, stripeGradient } = $derived.by(() =>
    range
      ? getStripeBackground(
          range,
          bar.width,
          explorer.timezoneOffset * 60 * 1000,
        )
      : { stripeWidthPx: 0, stripeOffsetPx: 0, stripeGradient: "" },
  );

  const seekableLeft = $derived.by<number | null>(() => {
    if (!seekableRange || !range) return null;
    if (seekableRange.end < range.start || seekableRange.start > range.end)
      return null;
    return timeToPixel(
      Math.max(seekableRange.start, range.start),
      range,
      bar.width,
    );
  });

  const seekableRight = $derived.by<number | null>(() => {
    if (!seekableRange || !range) return null;
    if (seekableRange.end < range.start || seekableRange.start > range.end)
      return null;
    return timeToPixel(
      Math.min(seekableRange.end, range.end),
      range,
      bar.width,
    );
  });

  const unavailableLeftPx = $derived.by<number | null>(() => {
    const ar = explorer.availableRange;
    if (!ar || !range) return null;
    if (ar.start <= range.start) return null;
    return timeToPixel(Math.min(ar.start, range.end), range, bar.width);
  });

  const unavailableRightPx = $derived.by<number | null>(() => {
    const ar = explorer.availableRange;
    if (!ar || !range) return null;
    if (ar.end >= range.end) return null;
    return timeToPixel(Math.max(ar.end, range.start), range, bar.width);
  });

  const playheadPx = $derived.by<number | null>(() => {
    if (range === null) return null;
    const t = explorer.playheadTime;
    if (t === null) return null;
    return timeToPixel(t, range, bar.width);
  });

  const playheadLabelFlipped = $derived(
    playheadPx !== null && bar.width > 0 && playheadPx / bar.width > 0.85,
  );

  function isAvailable(ts: number): boolean {
    const ar = explorer.availableRange;
    if (!ar) return true;
    return ts >= ar.start && ts <= ar.end;
  }

  function formatDayLabel(ts: number, offsetMinutes: number): string | null {
    const shifted = new Date(ts + offsetMinutes * 60 * 1000);
    if (shifted.getUTCHours() !== 0 || shifted.getUTCMinutes() !== 0)
      return null;
    const now = new Date(Date.now() + offsetMinutes * 60 * 1000);
    const isToday = now.toDateString() === shifted.toDateString();
    if (isToday) return "Today";
    return shifted.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }

  function onPointerMove(e: PointerEvent) {
    if (!timelineEl) return;
    if (
      explorer.isSliding ||
      explorer.isIntervalDragging ||
      explorer.isIntervalInteracting
    ) {
      hoverPx = null;
      return;
    }
    const px = e.clientX - timelineEl.getBoundingClientRect().left;
    if (px < 0 || px > bar.width) {
      hoverPx = null;
      return;
    }
    const ts = range ? pixelToTime(px, range, bar.width) : null;
    hoverPx = ts && isAvailable(ts) ? px : null;
  }

  function onPointerLeave() {
    hoverPx = null;
  }

  function onClick(e: MouseEvent) {
    if (explorer.isSliding) return;
    if (!timelineEl || range === null) return;
    const spanMs = range.end - range.start;
    const ts = Math.round(
      snapTime(
        pixelToTime(
          e.clientX - timelineEl.getBoundingClientRect().left,
          range,
          bar.width,
        ),
        spanMs,
      ),
    );
    if (!isAvailable(ts)) return;
    explorer.setSelectedTime(ts);
    if (!e.ctrlKey)
      onRewind(new Date(ts).toISOString(), explorer.pauseAfterRewind);
    hoverPx = null;
  }

  $effect(() => {
    if (
      explorer.isSliding ||
      explorer.isIntervalDragging ||
      explorer.isIntervalInteracting
    )
      hoverPx = null;
  });
</script>

<div bind:this={bar.el} class="relative w-full pb-0 outline-hidden select-none">
  <div class="relative h-6 w-full">
    {#each ticks.filter((t) => t.major) as tick}
      <span
        class="absolute text-sm whitespace-nowrap"
        class:text-foreground={!tick.dayLabel}
        class:text-muted-foreground={!!tick.dayLabel}
        class:text-gray-300={!isAvailable(tick.ts)}
        style="left: {tick.px}px; transform: translateX(-50%);"
        >{tick.dayLabel ?? tick.label}</span
      >
    {/each}
  </div>

  <div
    bind:this={timelineEl}
    class="group relative h-[52px] w-full cursor-pointer rounded-2xl"
    style="background: {stripeGradient} {stripeOffsetPx}px 0 / {stripeWidthPx}px 100%;"
    onpointermove={onPointerMove}
    onpointerleave={onPointerLeave}
    onclick={onClick}
  >
    <div class="absolute inset-0 overflow-hidden rounded-2xl">
      {#if seekableLeft !== null && seekableRight !== null}
        <div
          class="pointer-events-none absolute bottom-0 h-[26px] rounded-2xl bg-[var(--color-play-400)]/60"
          style="left: {seekableLeft}px; width: {seekableRight -
            seekableLeft}px;"
        ></div>
      {/if}

      <UnavailableMask
        leftWidth={unavailableLeftPx !== null
          ? `${unavailableLeftPx}px`
          : undefined}
        rightWidth={unavailableRightPx !== null
          ? `calc(100% - ${unavailableRightPx}px)`
          : undefined}
        title={notAvailableMessage}
      />
    </div>

    {#each ticks as tick}
      <div
        class="pointer-events-none absolute z-30 {isAvailable(tick.ts)
          ? 'bg-black/30'
          : 'bg-transparent'}"
        style="left: {tick.px}px; height: {tick.major ? 10 : 6}px; width: 1px;"
      ></div>
    {/each}

    {#if explorer.marks.A || explorer.marks.B}
      <div class="absolute h-[26px] w-full">
        <IntervalSlider />
      </div>
    {/if}

    <div class="pointer-events-none absolute inset-0 w-full rounded-full">
      {#if playheadPx !== null}
        <div
          class="pointer-events-none absolute bottom-0 z-50 size-5! h-full rounded-full"
          style="left: 0; background: var(--color-play-950); will-change: transform; transform: translateX(calc({playheadPx}px - 50%));"
        >
          <div
            class="absolute bottom-1/2 left-1/2 size-0.75 -translate-x-1/2 translate-y-1/2 rotate-30 rounded-full bg-black"
          />
          <div
            class="absolute top-1/2 h-[26px] -translate-y-1/2 whitespace-nowrap"
            class:left-full={!playheadLabelFlipped}
            class:ml-2={!playheadLabelFlipped}
            class:right-full={playheadLabelFlipped}
            class:mr-2={playheadLabelFlipped}
          >
            {formatTime(explorer.playheadTime, explorer.timezoneOffset)}
          </div>
        </div>
      {/if}
    </div>

    <PanGuideButton side="left" />
    <PanGuideButton side="right" />
  </div>

  <div class="relative h-[40px] w-full">
    {#if explorer.selectedTime !== null || hoverPx !== null}
      <RewindSlider {hoverPx} {isRewound} {onRewind} {onTimeChange} />
    {:else}
      <div
        class="flex h-full items-center justify-center gap-1 text-sm text-muted-foreground"
      >
        <span>Click above or slide</span>
        <span
          class="inline-flex size-5 items-center rounded-full bg-[var(--color-selected-light)] shadow-xs"
        ></span>
        <span>to rewind</span>
      </div>
    {/if}
  </div>
</div>
