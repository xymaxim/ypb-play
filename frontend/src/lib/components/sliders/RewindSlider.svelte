<script lang="ts">
  import { onMount } from "svelte";
  import { Slider } from "bits-ui";
  import { Redo, Undo } from "lucide-svelte";
  import { getExplorerContext } from "$lib/explorer.svelte";
  import { snapTime, formatHoverTime } from "$lib/utils/timelineUtils";
  import { useTimeSlider } from "$lib/components/sliders/useTimeSlider.svelte";
  import { pixelToTime } from "$lib/utils/timePixelUtils";

  interface Props {
    hoverPx?: number | null;
    isRewound: boolean;
    onRewind: (isoTime: string, pauseAfterRewind?: boolean) => void;
    onTimeChange?: () => void;
  }

  const {
    hoverPx: timelineHoverPx = null,
    isRewound,
    onRewind,
    onTimeChange,
  }: Props = $props();

  const explorer = getExplorerContext();

  let isSliding = $state(false);
  let barEl = $state<HTMLDivElement | null>(null);

  const thumbSize = 40;
  const thumbActiveWidth = thumbSize - 8;
  const thumbSlidingWidth = thumbActiveWidth - 4;
  const labelOffset = 6;
  const thumbColorDefault = "var(--rewyt-selected)";
  const thumbColorActive = "var(--rewyt-selecting)";

  const rangeStart = $derived(explorer.viewRange?.start ?? 0);
  const rangeEnd = $derived(explorer.viewRange?.end ?? 0);
  const spanMs = $derived(rangeEnd - rangeStart);

  const allowedStart = $derived(
    Math.max(rangeStart, explorer.availableRange?.start ?? rangeStart),
  );
  const allowedEnd = $derived(
    Math.min(rangeEnd, explorer.availableRange?.end ?? rangeEnd),
  );

  const slider = useTimeSlider({
    getMin: () => allowedStart,
    getMax: () => allowedEnd,
    getFallback: () => explorer.selectedTime ?? allowedStart,
    updateViewRange: false,
    onTimeChange,
  });

  $effect(() => {
    slider.setBarEl(barEl);
  });

  const allowedStartPercent = $derived(
    spanMs > 0 ? ((allowedStart - rangeStart) / spanMs) * 100 : 0,
  );
  const allowedEndPercent = $derived(
    spanMs > 0 ? ((allowedEnd - rangeStart) / spanMs) * 100 : 100,
  );

  const thumbPercent = $derived(
    allowedEnd > allowedStart
      ? ((slider.sliderValue - allowedStart) / (allowedEnd - allowedStart)) *
          100
      : 0,
  );

  const thumbPx = $derived(
    slider.barWidth > 0
      ? (allowedStartPercent / 100 +
          ((thumbPercent / 100) * (allowedEndPercent - allowedStartPercent)) /
            100) *
          slider.barWidth
      : 0,
  );

  const snappedValue = $derived(snapTime(slider.sliderValue, spanMs));
  const label = $derived(
    formatHoverTime(snappedValue, spanMs, explorer.timezoneOffset),
  );
  const isLabelFlipped = $derived(thumbPercent > 85);

  const isBehindPlayhead = $derived(slider.sliderValue < explorer.playheadTime);

  const isActive = $derived(
    (explorer.isSliding && explorer.selectedTime !== null) ||
      timelineHoverPx !== null,
  );

  const activeTs = $derived.by<number | null>(() => {
    if (!isActive) return null;
    if (timelineHoverPx !== null && slider.barWidth > 0 && spanMs > 0) {
      const ts = pixelToTime(
        timelineHoverPx,
        { start: rangeStart, end: rangeEnd },
        slider.barWidth,
      );
      return ts !== null && ts >= allowedStart && ts <= allowedEnd ? ts : null;
    }
    if (explorer.isSliding && explorer.selectedTime !== null) {
      const ts = explorer.selectedTime;
      return ts >= allowedStart && ts <= allowedEnd ? ts : null;
    }
    return null;
  });

  const activeSnapped = $derived(
    activeTs !== null ? snapTime(activeTs, spanMs) : null,
  );
  const activeLabel = $derived(
    activeSnapped !== null
      ? formatHoverTime(activeSnapped, spanMs, explorer.timezoneOffset)
      : null,
  );
  const activeCirclePx = $derived.by<number | null>(() => {
    if (activeTs === null || spanMs === 0 || slider.barWidth === 0) return null;
    const activePercent =
      allowedEnd > allowedStart
        ? ((activeTs - allowedStart) / (allowedEnd - allowedStart)) * 100
        : 0;
    return (
      (allowedStartPercent / 100 +
        ((activePercent / 100) * (allowedEndPercent - allowedStartPercent)) /
          100) *
      slider.barWidth
    );
  });

  const isActiveLabelFlipped = $derived(
    activeCirclePx !== null &&
      slider.barWidth > 0 &&
      activeCirclePx / slider.barWidth > 0.85,
  );

  const getThumbWidth = () => {
    return thumbSize;
    if (explorer.isSliding) return thumbActiveWidth;
    if (isRewound || timelineHoverPx) return thumbSize;
    return thumbActiveWidth;
  };

  const getThumbColor = (isActiveState: boolean) => {
    if (isActiveState && timelineHoverPx) return thumbColorDefault;
    if (isActiveState && explorer.isSliding) return thumbColorActive;
    if (!isActiveState && isRewound) return thumbColorDefault;
    return thumbColorActive;
  };

  const getLabelMargin = (isFlipped: boolean, showRewindButton: boolean) => {
    const margin = thumbActiveWidth + labelOffset + 10;
    return isFlipped
      ? `margin-right: ${showRewindButton ? margin : labelOffset}px`
      : `margin-left: ${showRewindButton ? margin : labelOffset}px`;
  };

  function onPointerDown() {
    isSliding = true;
    slider.onPointerDown();
  }

  function onPointerUp() {
    isSliding = false;
    slider.onPointerUp();
    const snapped = snappedValue;
    explorer.setSelectedTime(snapped);
    onRewind(new Date(snapped).toISOString(), explorer.pauseAfterRewind);
  }

  onMount(() => {
    const handler = () => {
      isSliding = false;
    };
    window.addEventListener("pointerup", handler);
    return () => window.removeEventListener("pointerup", handler);
  });
</script>

{#if explorer.viewRange !== null}
  <div bind:this={barEl} class="relative flex h-full w-full items-center">
    {#if isActive && activeCirclePx !== null && activeLabel !== null}
      <div
        class="pointer-events-none absolute top-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style="
                       width: {getThumbWidth()}px;
                       height: {thumbSize}px;
                       left: {activeCirclePx}px;
                       background: {getThumbColor(true)};
                       "
      >
        <div
          class="absolute bottom-1/2 left-1/2 z-10 size-0.75 -translate-x-1/2 translate-y-1/2 rounded-full bg-black"
        />
        <span
          class="pointer-events-none absolute top-1/2 flex h-full -translate-y-1/2 items-center px-1 text-base whitespace-nowrap select-none"
          class:left-full={!isActiveLabelFlipped}
          class:right-full={isActiveLabelFlipped}
          style={getLabelMargin(isActiveLabelFlipped, false)}
        >
          {activeLabel}
        </span>
      </div>
    {/if}

    {#if !isActive}
      <div
        class="pointer-events-none absolute top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style="left: {thumbPx}px; width: {thumbSize}px; height: {thumbSize}px;"
      >
        {#if !isRewound}
          <div
            class="pointer-events-auto absolute top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110"
            style="
                               {isLabelFlipped
              ? `right: 100%; margin-right: 1px;`
              : `left: 100%; margin-left: 1px;`}
                               background: linear-gradient(to right, var(--rewyt-selecting) 0%, var(--rewyt-selected) 50%);
                               "
            onclick={() =>
              onRewind(
                new Date(slider.sliderValue).toISOString(),
                explorer.pauseAfterRewind,
              )}
          >
            {#if isBehindPlayhead}
              <Undo class="text-black" size={18} />
            {:else}
              <Redo class="text-black" size={18} />
            {/if}
          </div>
        {/if}

        <span
          class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-base whitespace-nowrap select-none"
          class:left-full={!isLabelFlipped}
          class:right-full={isLabelFlipped}
          style={getLabelMargin(isLabelFlipped, !isRewound)}
        >
          {label}
        </span>
      </div>
    {/if}

    <div
      class="pointer-events-none absolute inset-y-0"
      style="
                   left: calc({allowedStartPercent}% - {thumbSize / 2}px);
                   width: calc({allowedEndPercent -
        allowedStartPercent}% + {thumbSize}px);
                   "
    >
      <Slider.Root
        type="single"
        bind:value={slider.sliderValue}
        onValueChange={slider.onValueChange}
        onpointerdown={onPointerDown}
        onpointerup={onPointerUp}
        min={allowedStart}
        max={allowedEnd}
        step={1000}
        class="pointer-events-none! relative flex h-full w-full touch-none items-center"
      >
        <Slider.Track
          class="relative h-full w-full overflow-hidden rounded-full bg-transparent"
        >
          <Slider.Range class="absolute h-full bg-transparent" />
        </Slider.Track>

        <Slider.Thumb
          index={0}
          class="pointer-events-auto relative flex cursor-ew-resize items-center justify-center outline-none {timelineHoverPx
            ? 'opacity-40 grayscale-100'
            : ''}"
          style="width: {getThumbWidth()}px; height: {thumbSize}px;"
        >
          <div
            class="absolute inset-0 z-10 rounded-full"
            style="
                               width: {getThumbWidth()}px;
                               height: {thumbSize}px;
                               background: {getThumbColor(false)};
                               "
          />
          <div
            class="absolute bottom-1/2 left-1/2 z-10 size-0.75 -translate-x-1/2 translate-y-1/2 rounded-full bg-black"
          />
        </Slider.Thumb>
      </Slider.Root>
    </div>
  </div>
{/if}
