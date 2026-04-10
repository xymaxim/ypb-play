<script lang="ts">
  import ArrowArcLeftIcon from "phosphor-svelte/lib/ArrowArcLeftIcon";
  import { getExplorerContext } from "../explorer.svelte";
  import { MS_PER_HOUR } from "../utils/dateUtils";
  import { useElementSize } from "../utils/domUtils.svelte";
  import { pixelToTime, timeToPixel } from "../utils/timePixelUtils";
  import {
    buildTicks,
    findDay,
    formatHoverTime,
    getStripeBackground,
    snapTime,
  } from "../utils/timelineUtils";
  import TimelineViewRange from "./TimelineViewRange.svelte";
  import IntervalFrame from "./IntervalFrame.svelte";
  import TimelineNeedle from "./TimelineNeedle.svelte";
  import TimelineViewControl from "./TimelineViewControl.svelte";

  interface Props {
    seekableRange: { start: number; end: number } | null;
    onRewind: (interval: string) => void;
    rewindDisabled: boolean;
  }

  let { seekableRange, onRewind, rewindDisabled }: Props = $props();

  // Context
  const explorer = getExplorerContext();
  const bar = useElementSize();

  // State
  let timelineEl = $state<HTMLDivElement | null>(null);
  let playheadEl = $state<HTMLDivElement | null>(null);
  let hoverPx = $state<number | null>(null);
  let isHovering = $state(false);
  let shiftHeld = $state(false);
  let isHoveringButton = $state(false);

  // Constants
  const notAvailableMessage = "Not available for rewind";
  // Derived
  const showScrubBar = $derived(
    shiftHeld && isHovering && !explorer.showTimelineViewRange,
  );

  const range = $derived(
    explorer.viewRange && bar.width > 0 ? explorer.viewRange : null,
  );

  const ticks = $derived.by(() => {
    if (range === null) return [];
    const center = (range.start + range.end) / 2;
    const day = findDay(center, explorer.days);
    const dayStart =
      day?.dayStart ?? Math.floor(center / MS_PER_HOUR) * MS_PER_HOUR;
    return buildTicks(range, bar.width, dayStart, explorer.timezoneOffset);
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

  const selectedTimePx = $derived.by<number | null>(() => {
    const t = explorer.selectedTime;
    if (t === null || range === null) return null;
    return timeToPixel(t, range, bar.width);
  });

  const hoverTime = $derived.by<string | null>(() => {
    if (hoverPx === null || range === null) return null;
    const spanMs = range.end - range.start;
    const ts = snapTime(pixelToTime(hoverPx, range, bar.width), spanMs);
    return formatHoverTime(ts, spanMs, explorer.timezoneOffset);
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

  function isAvailable(ts: number): boolean {
    const ar = explorer.availableRange;
    if (!ar) return true;
    return ts >= ar.start && ts <= ar.end;
  }

  // Effects
  $effect(() => {
    if (!playheadEl || range === null) return;
    const t = explorer.playheadTime;
    if (t === null) {
      playheadEl.style.display = "none";
      return;
    }
    const px = timeToPixel(t, range, bar.width);
    if (px === null) {
      playheadEl.style.display = "none";
    } else {
      playheadEl.style.display = "block";
      playheadEl.style.transform = `translateX(${px}px)`;
    }
  });

  // Event handlers
  function onMouseMove(e: MouseEvent) {
    const px = e.clientX - timelineEl.getBoundingClientRect().left;
    const ts = range ? pixelToTime(px, range, bar.width) : null;
    const avail = ts && isAvailable(ts);
    hoverPx = avail ? px : null;
  }

  function onMouseEnter() {
    isHovering = true;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  }

  function onMouseLeave(e: MouseEvent) {
    hoverPx = null;
    isHovering = false;
    shiftHeld = false;
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Shift") shiftHeld = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    if (e.key === "Shift") shiftHeld = false;
  }

  function onClick(e: MouseEvent) {
    if (!timelineEl || range === null || showScrubBar) return;
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
</script>

<div
  bind:this={bar.el}
  class="relative w-full pb-[15px] outline-hidden select-none"
  onmouseenter={onMouseEnter}
  onmouseleave={onMouseLeave}
  role="region"
>
  <TimelineViewControl />

  <div class="relative h-6 w-full">
    {#each ticks.filter((t) => t.major) as tick}
      <span
        class="absolute text-sm whitespace-nowrap text-foreground"
        class:text-gray-300={!isAvailable(
          pixelToTime(tick.px, range!, bar.width),
        )}
        style="left: {tick.px}px; transform: translateX(-50%);"
        >{tick.label}</span
      >
    {/each}
  </div>

  <div
    bind:this={timelineEl}
    class="group cursor-rewind relative h-[60px] w-full rounded-md transition-[filter]"
    style="background: {stripeGradient} {stripeOffsetPx}px 0 / {stripeWidthPx}px 100%;"
    class:blur-sm={showScrubBar}
    class:pointer-events-none={showScrubBar}
    onmousemove={onMouseMove}
    onmouseleave={() => (hoverPx = null)}
    onclick={onClick}
  >
    {#if seekableLeft !== null && seekableRight !== null}
      <div
        class="pointer-events-none absolute top-0 bottom-0"
        style="left: {seekableLeft}px; width: {seekableRight -
          seekableLeft}px; background: rgba(0,0,0,0.08);"
      ></div>
    {/if}

    {#if unavailableLeftPx !== null}
      <div
        title={notAvailableMessage}
        class="unavailable-back absolute top-0 bottom-0 left-0"
        style="width: {unavailableLeftPx}px;"
      ></div>
    {/if}

    {#if unavailableRightPx !== null}
      <div
        title={notAvailableMessage}
        class="unavailable-back absolute top-0 right-0 bottom-0"
        style="left: {unavailableRightPx}px;"
      ></div>
    {/if}

    <IntervalFrame barWidth={bar.width} />

    {#each ticks as tick}
      <div
        class="absolute z-90 w-px bg-black/30"
        style="left: {tick.px}px; height: {tick.major
          ? 10
          : 6}px; width: {tick.major ? 1 : 1}px;"
      ></div>
    {/each}

    <div
      class="pointer-events-none absolute w-full overflow-visible rounded-full"
      style="inset: -15px 0"
    >
      {#if selectedTimePx !== null}
        {#if !rewindDisabled}
          <button
            type="button"
            class="pointer-events-auto absolute top-[50px]! z-110 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[var(--ypb-selected-light)] text-black shadow-md transition-opacity hover:opacity-90 focus-visible:outline-hidden"
            style="left: {selectedTimePx}px; inset-block: 0; margin-block: auto; transform: translateX(-50%);"
            onclick={(e) => {
              e.stopPropagation();
              isHoveringButton = false;
              if (explorer.selectedTime !== null) {
                onRewind(new Date(explorer.selectedTime).toISOString());
              }
            }}
            onmouseenter={() => (isHoveringButton = true)}
            onmouseleave={() => (isHoveringButton = false)}
            title="Rewind to selected time"
          >
            <ArrowArcLeftIcon size={18} weight="bold" />
          </button>
        {/if}

        <TimelineNeedle
          px={selectedTimePx}
          color="var(--ypb-selected)"
          style="z-index: 100;"
        />
      {/if}

      <div
        bind:this={playheadEl}
        class="needle-play pointer-events-none absolute top-0 bottom-0 z-100 w-[3px] rounded-full"
        style="left: 0; background: var(--ypb-play); will-change: transform;"
      ></div>
      {#if hoverPx !== null && !isHoveringButton}
        <div
          class="pointer-events-none absolute z-[100]"
          style="left: {hoverPx}px; bottom: 100%; transform: translateX(-50%); margin-bottom: -11px;"
        >
          <span
            class="rounded-md bg-[var(--ypb-selected-light)] px-1.5 py-0.5 text-sm font-medium tabular-nums"
          >
            {hoverTime}
          </span>
        </div>
      {/if}
    </div>

    {#if explorer.selectedTime === null}
      <div
        class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-100 transition-opacity group-hover:opacity-0"
      >
        <span
          class="z-30 z-200 rounded-md bg-neutral-50 px-4 py-0.5 text-sm text-gray-400"
        >
          Pick a time to rewind
        </span>
      </div>
    {/if}
  </div>
  {#if showScrubBar}
    <div
      class="pointer-events-auto absolute inset-x-4 top-1/2 z-30 mt-1 -translate-y-1/2"
    >
      <TimelineViewRange
        showControls={false}
        class="overflow-visible rounded-lg border-1 border-gray-300/60 bg-white/70"
      />
    </div>
  {/if}
</div>

<style>
  @reference "tailwindcss";
  .cursor-rewind {
    cursor:
      url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='8' fill='oklch(0.89 0.1 156)' stroke='%2306b6d4' stroke-width='4'/></svg>")
        12 12,
      auto;
  }
  .unavailable-back {
    @apply cursor-not-allowed rounded-md backdrop-blur-md backdrop-grayscale;
    background: --alpha(var(--background) / 70%);
  }
</style>
