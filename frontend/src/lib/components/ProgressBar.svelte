<script lang="ts">
  import { Slider } from "$lib/components/ui/slider/index.js";
  import { onMount } from "svelte";
  import { getExplorerContext } from "../explorer.svelte.js";
  import { MS_PER_MINUTE } from "../utils/dateUtils";
  import { clampViewRange } from "../utils/timelineUtils";

  const explorer = getExplorerContext();

  const sliderStep = 10 * MS_PER_MINUTE;

  // State
  let isSliding = $state(false);

  // Derived
  const allowedStart = $derived(explorer.availableRange.start);
  const allowedEnd = $derived(explorer.availableRange.end);

  const fullRangeStart = $derived(
    Math.min(
      allowedStart,
      explorer.days[explorer.days.length - 1]?.dayStart ?? allowedStart,
    ),
  );
  const fullRangeEnd = $derived(
    Math.max(allowedEnd, explorer.days[0]?.dayEnd ?? allowedEnd),
  );

  const allowedStartPercent = $derived(
    ((allowedStart - fullRangeStart) / (fullRangeEnd - fullRangeStart)) * 100,
  );
  const allowedEndPercent = $derived(
    ((allowedEnd - fullRangeStart) / (fullRangeEnd - fullRangeStart)) * 100,
  );

  const sliderValue = $derived.by<number[]>(() => {
    if (explorer.selectedTime === null) return [allowedStart];
    return [
      Math.min(Math.max(explorer.selectedTime, allowedStart), allowedEnd),
    ];
  });

  const thumbClass = $derived(
    explorer.selectedTime === null
      ? "[&_[role=slider]]:opacity-0 [&_[role=slider]]:pointer-events-none"
      : "",
  );

  // Event handlers
  function onValueChange(value: number) {
    if (!isSliding) return;
    const t = Math.min(Math.max(value, allowedStart), allowedEnd);
    const vr = explorer.viewRange;
    explorer.setSelectedTime(t);
    if (!vr) return;
    explorer.setViewRange(
      clampViewRange(
        t,
        vr.end - vr.start,
        explorer.days,
        explorer.centeredOnMidnight,
      ),
    );
  }

  // Lifecycle
  onMount(() => {
    const onPointerUp = () => (isSliding = false);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
    };
  });
</script>

<div class="relative w-full py-2">
  <div
    style="position: absolute; left: calc({allowedStartPercent}% - 8px); width: calc({allowedEndPercent -
      allowedStartPercent}% + 10px);"
  >
    <Slider
      type="single"
      min={allowedStart}
      max={allowedEnd}
      step={sliderStep}
      value={sliderValue}
      {onValueChange}
      onpointerdown={() => (isSliding = true)}
      onpointerup={() => (isSliding = false)}
      class="w-full cursor-pointer {thumbClass}
            [&_[data-slot=slider-range]]:bg-transparent
            [&_[data-slot=slider-track]]:bg-black/15
            [&_[role=slider]]:z-10
            [&_[role=slider]]:h-4
            [&_[role=slider]]:w-4
            [&_[role=slider]]:cursor-ew-resize
            [&_[role=slider]]:border-[var(--ypb-selected)]
            [&_[role=slider]]:bg-[var(--ypb-selected)]"
    />
  </div>
</div>
