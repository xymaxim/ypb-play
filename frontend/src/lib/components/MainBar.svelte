<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import ArrowCounterClockwiseIcon from "phosphor-svelte/lib/ArrowCounterClockwiseIcon";
  import ArrowUpRightIcon from "phosphor-svelte/lib/ArrowUpRightIcon";
  import DotsThreeOutlineIcon from "phosphor-svelte/lib/DotsThreeOutlineIcon";
  import DotsThreeVerticalIcon from "phosphor-svelte/lib/DotsThreeVerticalIcon";
  import GearIcon from "phosphor-svelte/lib/GearIcon";
  import PauseIcon from "phosphor-svelte/lib/PauseIcon";
  import PlayIcon from "phosphor-svelte/lib/PlayIcon";
  import BroadcastIcon from "phosphor-svelte/lib/BroadcastIcon";
  import { getExplorerContext } from "../explorer.svelte";
  import { clampViewRange } from "../utils/timelineUtils";
  import {
    UTC_OFFSETS,
    formatDateTime,
    formatOffset,
  } from "../utils/dateTimeUtils";

  interface Props {
    isPlaying: boolean;
    playingTime: Date | null;
    rewindDisabled: boolean;
    onTogglePlayPause: () => void;
    onStep: (seconds: number) => void;
    onRewind: (isoTime: string) => void;
    onRewindToLive: () => void;
    onReplay: () => void;
    onScreenshot: (ts: number) => void;
  }

  const {
    isPlaying,
    playingTime,
    rewindDisabled,
    onReplay,
    onRewind,
    onRewindToLive,
    onScreenshot,
    onStep,
    onTogglePlayPause,
  }: Props = $props();

  const explorer = getExplorerContext();

  // Derived: check if playhead is outside current view
  const isPlayheadOutOfView = $derived.by(() => {
    if (playingTime === null || explorer.viewRange === null) return false;
    const pt = explorer.playheadTime;
    if (pt === null) return false;
    return pt < explorer.viewRange.start || pt > explorer.viewRange.end;
  });

  // State
  let timezoneDialogOpen = $state(false);
  let playheadSnapshot = $state<number | null>(null);
  let pendingOffsetValue = $state<string>("UTC+00:00");

  // Playhead
  function jumpToPlayhead() {
    if (playingTime === null) return;
    explorer.setViewRange(
      clampViewRange(
        playingTime.getTime(),
        explorer.zoomLevel,
        explorer.days,
        explorer.centeredOnMidnight,
      ),
    );
  }

  // Timezone dialog
  function openTimezoneDialog() {
    playheadSnapshot = explorer.playheadTime;
    pendingOffsetValue =
      UTC_OFFSETS.find((o) => o.offsetMinutes === explorer.timezoneOffset)
        ?.value ?? "UTC+00:00";
    timezoneDialogOpen = true;
  }

  function confirmTimezone() {
    const offset = UTC_OFFSETS.find((o) => o.value === pendingOffsetValue);
    if (offset) explorer.setTimezoneOffset(offset.offsetMinutes);
    timezoneDialogOpen = false;
  }

  function cancelTimezone() {
    timezoneDialogOpen = false;
  }

  function formatSnapshotTime(offsetMinutes: number): string {
    if (playheadSnapshot === null) return "";
    const d = new Date(playheadSnapshot + offsetMinutes * 60 * 1000);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }
</script>

<div class="mt-1 grid w-full" style="grid-template-columns: 1fr auto 1fr;">
  <!-- Left -->
  <div class="flex flex-row justify-center">
    {#if explorer.isRewinding && explorer.selectedTime}
      <div
        class="mr-6 flex h-9 items-center justify-center rounded-full px-2.5 text-foreground"
        style="background: linear-gradient(to right, oklch(0.8194 0.1242 193.06) 0%, var(--ypb-selected-700) 100%)"
      >
        <DotsThreeOutlineIcon class="size-6" />
      </div>
    {/if}
  </div>

  <!-- Center -->
  <div class="play-toolbar">
    {#if playingTime !== null}
      <div
        class="flex cursor-pointer items-center gap-1.5"
        title="Jump to playhead"
        onclick={jumpToPlayhead}
      >
        <span class="relative inline-block text-timestamp text-lg font-bold! {isPlayheadOutOfView ? 'text-gray-300!' : 'text-foreground!'}">
          {formatDateTime(
            playingTime.getTime(),
            explorer.timezoneOffset,
            false,
          )}
          <span class="text-xs"
            >{formatOffset(explorer.timezoneOffset)}</span
                                                      >
          {#if isPlayheadOutOfView}
            <span class="absolute top-0 h-7 w-7 p-0.5 mx-auto left-0 right-0 items-center rounded-full bg-[var(--ypb-play-200)]">
              <ArrowUpRightIcon size={14} weight="bold" class="text-foreground h-full w-full" />
</span>
          {/if}
        </span>
      </div>
    {:else}
      <span class="text-sm text-gray-400">Not playing</span>
    {/if}

    <div class="play-toolbar__group">
      <Button
        title={isPlaying ? "Pause" : "Play"}
        variant="ghost"
        size="icon"
        onclick={onTogglePlayPause}
      >
        {#if isPlaying}<PauseIcon />{:else}<PlayIcon />{/if}
      </Button>
      <Button title="Repeat" variant="ghost" size="icon" onclick={onReplay}>
        <ArrowCounterClockwiseIcon />
      </Button>
      <Button
        title="Seek back"
        variant="ghost"
        size="icon"
        onclick={() => onStep(-2)}>&minus;2s</Button
      >
      <Button
        title="Seek forward"
        variant="ghost"
        size="icon"
        onclick={() => onStep(2)}>+2s</Button
      >
    </div>

    <div class="play-toolbar__group">
      <Button
        title="Mark A"
        variant="ghost"
        size="icon"
        onclick={() => {
          if (explorer.playheadTime !== null)
            explorer.assignMark("A", explorer.playheadTime);
        }}>A</Button
      >
      <Button
        title="Mark B"
        variant="ghost"
        size="icon"
        onclick={() => {
          if (explorer.playheadTime !== null)
            explorer.assignMark("B", explorer.playheadTime);
        }}>B</Button
      >
    </div>

    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} title="More" variant="ghost" size="icon">
            <DotsThreeVerticalIcon weight="bold"/>
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="top">
        <DropdownMenu.Item
          class="flex cursor-pointer items-center gap-2"
          onclick={() => onScreenshot(explorer.playheadTime)}
        >
          Take screenshot
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>

  <!-- Right -->
  <div class="flex flex-row items-center justify-end gap-1">
    <Button
      title="Go to live"
      variant="ghost"
      class="hover:bg-transparent hover:text-[var(--ypb-play)]"
      onclick={onRewindToLive}><BroadcastIcon /></Button
    >

    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} title="Settings" variant="ghost" size="lg">
            <GearIcon />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="w-64">
        <DropdownMenu.Item
          class="flex cursor-pointer items-center justify-between gap-2"
          onclick={openTimezoneDialog}
        >
          Change timezone...
          <span class="text-xs font-medium text-muted-foreground"
            >{formatOffset(explorer.timezoneOffset)}</span
          >
        </DropdownMenu.Item>

        <div class="flex items-center space-x-2">
          <DropdownMenu.Item
            class="flex w-full items-center justify-between"
            onSelect={(e) => e.preventDefault()}
          >
            <Label
              for="timelineviewrange-toggle"
              class="cursor-pointer font-normal">Show timeline scrub bar</Label
            >
            <Switch
              id="timelineviewrange-toggle"
              checked={explorer.showTimelineViewRange}
              onCheckedChange={(v) => explorer.setShowTimelineViewRange(v)}
            />
          </DropdownMenu.Item>
        </div>

        <DropdownMenu.Separator />

        <DropdownMenu.Group>
          <DropdownMenu.Label
            class="cursor-pointer text-xs font-medium text-muted-foreground"
            >Rewinding</DropdownMenu.Label
          >
          <DropdownMenu.Item
            class="flex w-full items-center justify-between"
            onSelect={(e) => e.preventDefault()}
          >
            <Label
              for="pauseafterrewind-toggle"
              class="cursor-pointer font-normal">Pause after rewind</Label
            >
            <Switch
              id="pauseafterrewind-toggle"
              checked={explorer.pauseAfterRewind}
              onCheckedChange={(v) => explorer.setPauseAfterRewind(v)}
            />
          </DropdownMenu.Item>
        </DropdownMenu.Group>

        <DropdownMenu.Separator />

        <DropdownMenu.Group>
          <DropdownMenu.Label
            class="cursor-pointer text-xs font-medium text-muted-foreground"
            >Timeline</DropdownMenu.Label
          >
          <DropdownMenu.CheckboxItem
            checked={!explorer.centeredOnMidnight}
            onCheckedChange={() => explorer.setCenteredOnMidnight(false)}
            class="cursor-pointer"
          >
            Center on noon
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            checked={explorer.centeredOnMidnight}
            onCheckedChange={() => explorer.setCenteredOnMidnight(true)}
            class="cursor-pointer"
          >
            Center on midnight
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>

    <Dialog.Root bind:open={timezoneDialogOpen}>
      <Dialog.Content class="max-w-sm [&_button[data-dialog-close]]:hidden">
        <Dialog.Header>
          <Dialog.Title>Timezone</Dialog.Title>
        </Dialog.Header>

        <Select.Root type="single" bind:value={pendingOffsetValue}>
          <Select.Trigger class="w-full">
            {pendingOffsetValue}
          </Select.Trigger>
          <Select.Content class="max-h-72">
            {#each UTC_OFFSETS as offset}
              <Select.Item value={offset.value} label={offset.label}>
                <span class="tabular-nums">{offset.label}</span>
                {#if playheadSnapshot !== null}
                  <span class="ml-auto text-gray-400 tabular-nums">
                    {formatSnapshotTime(offset.offsetMinutes)}
                  </span>
                {/if}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>

        <Dialog.Footer>
          <Button variant="ghost" onclick={cancelTimezone}>Cancel</Button>
          <Button variant="ghost" onclick={confirmTimezone}>OK</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </div>
</div>

<style>
  @reference "tailwindcss";

  .play-toolbar {
    @apply inline-flex h-10! min-w-120 flex-row items-center gap-4 rounded-xl px-3 py-1;
  }

  .play-toolbar :global(button[data-slot="button"]) {
    @apply h-8 w-[35px] rounded-full bg-[var(--ypb-play-light)] hover:bg-[var(--ypb-play-light)]/60;
  }

  .play-toolbar__group {
    @apply flex items-center gap-0;
  }
</style>
