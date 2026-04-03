<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import ArrowArcLeftIcon from "phosphor-svelte/lib/ArrowArcLeftIcon";
  import ArrowArcRightIcon from "phosphor-svelte/lib/ArrowArcRightIcon";
  import DotsThreeVerticalIcon from "phosphor-svelte/lib/DotsThreeVerticalIcon";
  import { getExplorerContext } from "../explorer.svelte";
  import { clampViewRange } from "../utils/timelineUtils";
  import { formatDateTime, formatISOString } from "../utils/dateTimeUtils";

  interface Props {
    seekableRange: { start: number; end: number } | null;
    onSeekTo: (time: number, pause?: boolean) => void;
    onRewind: (isoTime: string, pause?: boolean) => void;
  }

  const { seekableRange, onSeekTo, onRewind }: Props = $props();

  const explorer = getExplorerContext();

  let stepSeconds = $state("3600");

  const stepOptions = [
    { value: "86400", label: "1 day" },
    { value: "3600", label: "1 hr" },
    { value: "1800", label: "30 min" },
    { value: "600", label: "10 min" },
    { value: "300", label: "5 min" },
    { value: "30", label: "30 sec" },
  ];

  function seekOrRewind(time: number) {
    explorer.setSelectedTime(time);
    explorer.setViewRange(
      clampViewRange(
        time,
        explorer.zoomLevel,
        explorer.days,
        explorer.centeredOnMidnight,
      ),
    );
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
    const newTime =
      explorer.selectedTime + direction * Number(stepSeconds) * 1000;
    explorer.setSelectedTime(newTime);
    const vr = explorer.viewRange;
    if (!vr) return;
    if (newTime <= vr.start || newTime >= vr.end) {
      explorer.setViewRange(
        clampViewRange(newTime, vr.end - vr.start, explorer.days),
      );
    }
  }

  function copySelectedTimestamp() {
    navigator.clipboard.writeText(
      formatISOString(explorer.selectedTime, explorer.timezoneOffset),
    );
  }
</script>

<div class="mr-5">
  <div
    title="Jump to selected"
    class="group flex flex-row cursor-pointer"
    onclick={() => seekOrRewind(explorer.selectedTime!)}
  >
    <span class="text-timestamp text-sm">
      {formatDateTime(explorer.selectedTime!, explorer.timezoneOffset, false)}
    </span>
  </div>
</div>

<div class="selection-toolbar__row">
  <div class="selection-toolbar__item bg-[var(--ypb-selected-light)]">
    <div class="flex flex-row items-center gap-1">
      <Button
        title="Jump back"
        variant="ghost"
        size="icon-sm"
        onclick={() => stepTime(-1)}
      >
        <ArrowArcLeftIcon />
      </Button>
      <Button
        title="Jump forward"
        variant="ghost"
        size="icon-sm"
        onclick={() => stepTime(1)}
      >
        <ArrowArcRightIcon />
      </Button>
      <Select.Root type="single" bind:value={stepSeconds}>
        <Select.Trigger class="h-8! text-xs">
          {stepOptions.find((o) => o.value === stepSeconds)?.label ?? "1 hr"}
        </Select.Trigger>
        <Select.Content class="z-100">
          {#each stepOptions as option}
            <Select.Item value={option.value} label={option.label}>
              {option.label}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <div class="selection-toolbar__item bg-[var(--ypb-selected-light)]">
    <Button
      title="Mark A"
      variant="ghost"
      size="icon-sm"
      onclick={() => explorer.assignMark("A", explorer.selectedTime!)}>A</Button
    >
    <Button
      title="Mark B"
      variant="ghost"
      size="icon-sm"
      onclick={() => explorer.assignMark("B", explorer.selectedTime!)}>B</Button
    >
  </div>

  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          title="More"
          variant="ghost"
          class="selection-toolbar__item--button-narrow"
          style="--item-bg: var(--ypb-selected-light)"
        >
          <DotsThreeVerticalIcon />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="z-100">
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
