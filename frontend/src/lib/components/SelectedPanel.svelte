<script lang="ts">
  import { getContext } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { ChevronDown, Undo, Redo, EllipsisVertical } from "lucide-svelte";
  import { getExplorerContext } from "../explorer.svelte";
  import { MS_PER_HOUR } from "$lib/utils/dateUtils";
  import { clampViewRange } from "../utils/timelineUtils";
  import { formatDateTime, formatISOString } from "../utils/dateTimeUtils";
  import * as Expandable from "$lib/components/expandable";

  interface Props {
    seekableRange: { start: number; end: number } | null;
    onSeekTo: (time: number, pause?: boolean) => void;
    onRewind: (isoTime: string, pause?: boolean) => void;
  }

  const { seekableRange, onSeekTo, onRewind }: Props = $props();

  const explorer = getExplorerContext();

  let stepMs = $state(MS_PER_HOUR);
  let stepInputValue = $state("1");
  let stepUnit = $state("h");

  const unitLabels: Record<string, string> = {
    s: "sec",
    m: "min",
    h: "h",
  };

  const unitMultipliers: Record<string, number> = {
    s: 1000,
    m: 60000,
    h: 3600000,
  };

  function getStepLabel(): string {
    if (stepMs >= 3600000)
      return `${parseFloat((stepMs / 3600000).toFixed(1))} h`;
    if (stepMs >= 60000) return `${parseFloat((stepMs / 60000).toFixed(1))} m`;
    return `${parseFloat((stepMs / 1000).toFixed(1))} s`;
  }

  function applyStep() {
    const value = Number(stepInputValue);
    if (isNaN(value) || value < 0) return;
    stepMs = value * unitMultipliers[stepUnit];
  }

  function seekOrRewind(time: number) {
    explorer.setSelectedTime(time);

    const vr = explorer.viewRange;
    if (!vr || time <= vr.start || time >= vr.end) {
      explorer.setViewRange(
        clampViewRange(
          time,
          explorer.zoomLevel,
          explorer.days,
          explorer.centeredOnMidnight,
        ),
      );
    }

    if (
      seekableRange &&
      time >= seekableRange.start &&
      time <= seekableRange.end
    ) {
      onSeekTo(time, true);
    } else {
      onRewind(new Date(time).toISOString(), true);
    }
  }

  function stepTime(direction: 1 | -1) {
    if (explorer.selectedTime === null) return;
    const newTime = explorer.selectedTime + direction * stepMs;
    seekOrRewind(newTime);
  }

  function copySelectedTimestamp() {
    navigator.clipboard.writeText(
      formatISOString(explorer.selectedTime, explorer.timezoneOffset),
    );
  }
</script>

<div class="mr-5 flex items-baseline">
  <div
    title="Jump to selected"
    class="group flex cursor-pointer flex-row"
    onclick={() => seekOrRewind(explorer.selectedTime!)}
  >
    <span class="text-timestamp text-muted-foreground! tabular-nums">
      {formatDateTime(explorer.selectedTime!, explorer.timezoneOffset, false)}
    </span>
  </div>
</div>

<div class="selection-toolbar__row overflow-hidden">
  <div
    class="selection-toolbar__item flex grid overflow-hidden bg-[var(--rewyt-selected-light)] transition-all! duration-600 ease-in-out"
  >
    <div
      class="flex flex-row items-center gap-1 overflow-hidden transition-all"
    >
      <Button
        title="Jump back"
        variant="ghost"
        size="icon"
        class="rounded-full"
        onclick={() => stepTime(-1)}
      >
        <Undo />
      </Button>
      <Button
        title="Jump forward"
        variant="ghost"
        size="icon"
        class="rounded-full"
        onclick={() => stepTime(1)}
      >
        <Redo />
      </Button>

      <Expandable.Root
        trigger="click"
        class="flex h-full items-center overflow-hidden transition-all"
      >
        {@const context = getContext("expandable")}
        <Expandable.Trigger
          class="flex h-8 {context.open
            ? 'w-9 -rotate-30'
            : 'min-w-9'} items-center justify-center rounded-full border-none bg-[var(--rewyt-selected-dark)]! px-2 text-xs font-medium hover:bg-accent"
        >
          {#if !context.open}
            {getStepLabel()}
          {/if}
        </Expandable.Trigger>

        <Expandable.Content
          class="flex h-8 items-center overflow-hidden rounded-xl px-2 transition-all"
        >
          <div class="flex items-center gap-1">
            <div class="flex-1">
              <input
                bind:value={stepInputValue}
                class="h-8 w-16 rounded-xl bg-white/50 px-2 text-sm outline-none"
                onchange={applyStep}
              />
            </div>

            <Select.Root
              type="single"
              bind:value={stepUnit}
              class="border-none outline-none"
              onValueChange={applyStep}
            >
              <Select.Trigger
                class="h-8! w-16 rounded-xl border-none bg-white/50 text-sm outline-none"
              >
                {unitLabels[stepUnit]}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="s" label="sec">sec</Select.Item>
                <Select.Item value="m" label="min">min</Select.Item>
                <Select.Item value="h" label="h">h</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        </Expandable.Content>
      </Expandable.Root>
    </div>
  </div>

  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          title="More"
          variant="ghost"
          class="selection-toolbar__item--button-narrow"
          style="--item-bg: var(--rewyt-selected-light)"
        >
          <EllipsisVertical />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="z-1000">
      <DropdownMenu.Item
        class="cursor-pointer"
        disabled={explorer.selectedTime === null}
        onclick={copySelectedTimestamp}
      >
        Copy timestamp
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

<style>
  :global([data-tabs-content]) {
    outline-style: none;
  }
</style>
