<script lang="ts">
  import { getContext } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { ZOOM_LEVELS, type ZoomLevelKey } from "$lib/types";
  import * as Expandable from "$lib/components/expandable";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import TimelineZoomControl from "./TimelineZoomControl.svelte";
  import InputRewindModal from "./InputRewindModal.svelte";
  import {
    ArrowUpRight,
    ArrowDown,
    Circle,
    FastForward,
    Pause,
    Pen,
    Play,
    Rewind,
    Radio,
    RotateCcw,
    Settings,
    ZoomIn,
  } from "lucide-svelte";
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
    isRewound: boolean;
    onClearRewindError: () => void;
    onTogglePlayPause: () => void;
    onStep: (seconds: number) => void;
    onRewind: (isoTime: string, pause?: boolean) => Promise<boolean>;
    onRewindToLive: () => void;
    onReplay: () => void;
  }

  const {
    isPlaying,
    playingTime,
    isRewound,
    onClearRewindError,
    onReplay,
    onRewind,
    onRewindToLive,
    onStep,
    onTogglePlayPause,
  }: Props = $props();

  const explorer = getExplorerContext();

  // Derived
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

  let inputRewindDialogOpen = $state(false);
  let zoomOpen = $state(false);

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
    if (
      explorer.selectedTime < explorer.viewRange.start ||
      explorer.selectedTime > explorer.viewRange.end
    ) {
      explorer.setSelectedTime(explorer.playheadTime);
    }
  }

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

  const zoomKey = $derived(
    (Object.entries(ZOOM_LEVELS).find(
      ([, v]) => v === explorer.zoomLevel,
    )?.[0] ?? "1d") as ZoomLevelKey,
  );
</script>

<div class="grid w-full gap-1" style="grid-template-columns: auto 1fr;">
  <div class="flex items-center gap-2">
    {#if explorer.isRewinding}
      <div
        class="flex w-50 w-70 items-center justify-center gap-0.5 text-muted-foreground"
      >
        <Circle size={6} strokeWidth={5} fill="none" />
        <Circle size={6} strokeWidth={5} fill="none" />
        <Circle size={6} strokeWidth={5} fill="none" />
      </div>
    {:else if playingTime !== null}
      <div class="flex w-70 items-center gap-4">
        {#if isPlaying}
          <div
            class="flex size-10 cursor-pointer items-center justify-center rounded-full bg-rose-200"
            onclick={onTogglePlayPause}
          >
            <Pause strokeWidth={2} />
          </div>
        {:else if explorer.isSliding}
          <div
            class="flex size-10 items-center justify-center rounded-full bg-[var(--color-selected-light)]"
          >
            {#if explorer.selectedTime <= explorer.playheadTime}
              <Rewind strokeWidth={2} />
            {:else}
              <FastForward strokeWidth={2} />
            {/if}
          </div>
        {:else}
          <div
            class="flex size-10! h-[42px] w-11 cursor-pointer items-center justify-center rounded-full bg-rose-200"
            onclick={onTogglePlayPause}
          >
            <Play strokeWidth={2} size={20} />
          </div>
        {/if}
        <div
          class="inline-flex items-center gap-2 text-xl
                     {isPlayheadOutOfView
            ? 'text-gray-300!'
            : 'text-foreground!'}"
        >
          <span
            class="relative flex items-center font-normal tabular-nums {isPlayheadOutOfView
              ? 'cursor-pointer'
              : 'pointer-events-none'}"
            title={isPlayheadOutOfView ? "Jump to playhead" : undefined}
            onclick={jumpToPlayhead}
          >
            {formatDateTime(
              playingTime.getTime(),
              explorer.timezoneOffset,
              false,
            )}
            {#if isPlayheadOutOfView}
              <span
                class="absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-play-200)] p-0.5 ring-2 ring-[var(--background)]"
              >
                <ArrowUpRight strokeWidth={2} class="text-foreground" />
              </span>
            {/if}
          </span>
          <span
            class="flex h-9 w-10 cursor-pointer items-center justify-center rounded-full bg-neutral-200 text-sm transition-colors hover:bg-neutral-100"
            onclick={openTimezoneDialog}
          >
            {formatOffset(explorer.timezoneOffset)}
          </span>
        </div>
      </div>
    {:else}
      <div class="flex w-70 items-center justify-center">
        <span class="text-3xl text-muted-foreground">&mdash;</span>
      </div>
    {/if}

    <div class="flex h-10 items-center gap-0 gap-1!">
      <Button
        title="Input and rewind"
        class="text-normal main-bar__button bg-gradient-to-r from-[var(--color-selected-light)] to-[var(--color-interval-light)]"
        onclick={() => (inputRewindDialogOpen = true)}
      >
        <Pen size={20} />
      </Button>
      <Expandable.Root
        trigger="click"
        closeOnClickOutside={true}
        class="flex items-center gap-2"
      >
        {@const context = getContext("expandable")}
        <Expandable.Trigger class="gap-0! transition-none">
          <div
            title="Mark interval"
            class="main-bar__trigger-button bg-[var(--color-interval-200)]/50! text-sm font-bold tracking-tighter transition-all {context.open
              ? ' -rotate-30 opacity-50'
              : ''}"
          >
            <span class="{context.open ? 'opacity-0' : ''} transition-opacity"
              >AB</span
            >
          </div>
        </Expandable.Trigger>
        <Expandable.Content class="px-1 transition-all ease-in-out">
          <div
            class="flex items-center px-0 transition-opacity {!context.open
              ? 'opacity-0'
              : ''}"
          >
            <Button
              title="Mark A"
              variant="ghost"
              size="icon"
              class="flex size-9 rounded-full bg-[var(--color-interval-200)]/50! text-sm font-semibold"
              onclick={() => {
                if (explorer.playheadTime !== null)
                  explorer.assignMark("A", explorer.playheadTime);
              }}
            >
              A
            </Button>
            <Button
              title="Mark B"
              variant="ghost"
              size="icon"
              class="flex size-9 rounded-full bg-[var(--color-interval-200)]/50! text-sm font-semibold"
              onclick={() => {
                if (explorer.playheadTime !== null)
                  explorer.assignMark("B", explorer.playheadTime);
              }}
            >
              B
            </Button>
          </div>
        </Expandable.Content>
      </Expandable.Root>

      <div class="flex items-center">
        <div class="md:hidden">
          <Popover.Root bind:open={zoomOpen}>
            <Popover.Trigger>
              {#snippet child({ props })}
                <Button
                  {...props}
                  title="Change zoom"
                  variant="ghost"
                  class="main-bar__button relative bg-neutral-200! text-xs font-black"
                >
                  <span
                    class="z-20 flex tracking-wider {zoomOpen
                      ? 'opacity-0'
                      : ''}"
                  >
                    {zoomKey}
                  </span>
                </Button>
              {/snippet}
            </Popover.Trigger>
            <Popover.Content
              side="bottom"
              align="center"
              class="w-auto! rounded-2xl! p-1.5"
            >
              <div class="flex h-9 items-center px-2">
                <TimelineZoomControl onChange={() => (zoomOpen = false)} />
              </div>
            </Popover.Content>
          </Popover.Root>
        </div>
        <div class="hidden items-center transition-all ease-in-out md:flex">
          <Expandable.Root
            open={true}
            trigger="click"
            closeOnClickOutside={true}
            class="items-center"
          >
            {@const isOpen = getContext("expandable").open}
            <Expandable.Trigger
              class="justify-end! transition-transform ease-in-out {isOpen
                ? '-rotate-30'
                : ''}"
            >
              <Button
                title="Change zoom"
                variant="ghost"
                class="main-bar__trigger-button relative bg-neutral-200! text-xs font-black"
              >
                <span
                  class="z-20 flex tracking-wider {isOpen
                    ? 'opacity-0'
                    : ''} transition-opacity"
                >
                  {zoomKey}
                </span>
              </Button>
            </Expandable.Trigger>
            <Expandable.Content>
              <div class="flex h-9 items-center bg-neutral-200/0">
                <TimelineZoomControl />
              </div>
            </Expandable.Content>
          </Expandable.Root>
        </div>
      </div>
    </div>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            title="Settings"
            variant="ghost"
            class="main-bar__button bg-neutral-200"
          >
            <Settings />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="w-64 rounded-2xl!">
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
          <Select.Content class="z-1000 max-h-72">
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

    <InputRewindModal
      bind:open={inputRewindDialogOpen}
      {isPlaying}
      {onClearRewindError}
      {onTogglePlayPause}
      {onRewind}
    />
  </div>

  <div
    class="relative flex h-9 w-full flex-row justify-end gap-1 rounded-2xl bg-neutral-200/0 px-2"
  ></div>
</div>

<style>
  @reference "tailwindcss";
  @reference "../../app.css";

  :global(.main-bar__button) {
    @apply inline-flex h-10 w-10 items-center justify-center rounded-full;
  }
  :global(.main-bar__trigger-button) {
    @apply inline-flex h-9 w-10 items-center justify-center rounded-full;
  }
</style>
