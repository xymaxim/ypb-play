<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { EllipsisVertical, Repeat, Square, X } from "lucide-svelte";
  import { getExplorerContext } from "../explorer.svelte";
  import {
    formatTime,
    formatDateTime,
    formatISOString,
    formatIntervalDuration,
  } from "../utils/dateTimeUtils";

  interface Props {
    isPlayingInterval: boolean;
    seekableRange: { start: number; end: number } | null;
    onSeekTo: (time: number, pause?: boolean) => void;
    onRewind: (isoTime: string, pause?: boolean) => void;
    onPlayInterval: (a: number, b: number) => void;
    onStopInterval: () => void;
    onClear: () => void;
  }

  const {
    isPlayingInterval,
    seekableRange,
    onSeekTo,
    onRewind,
    onPlayInterval,
    onStopInterval,
    onClear,
  }: Props = $props();

  const explorer = getExplorerContext();

  const markA = $derived(explorer.marks.A);
  const markB = $derived(explorer.marks.B);
  const sameDay = $derived(
    markA !== null && markB !== null && sameOffsetDay(markA, markB),
  );

  function sameOffsetDay(a: number, b: number): boolean {
    const off = explorer.timezoneOffset;
    const da = new Date(a + off * 60 * 1000);
    const db = new Date(b + off * 60 * 1000);
    return (
      da.getUTCFullYear() === db.getUTCFullYear() &&
      da.getUTCMonth() === db.getUTCMonth() &&
      da.getUTCDate() === db.getUTCDate()
    );
  }

  function toggleInterval() {
    if (markA === null || markB === null) return;
    isPlayingInterval ? onStopInterval() : onPlayInterval(markA, markB);
  }

  function copyIntervalTimestamp() {
    const a = formatISOString(markA, explorer.timezoneOffset);
    const b = formatISOString(markB, explorer.timezoneOffset);
    navigator.clipboard.writeText(`${a}/${b}`);
  }
</script>

<div class="mr-5 flex items-center gap-2">
  {#if markA !== null}
    <span
      title="Rewind to A"
      class="text-timestamp cursor-pointer whitespace-nowrap tabular-nums"
      onclick={() =>
        explorer.seekOrRewind(markA!, seekableRange, onSeekTo, onRewind)}
    >
      {formatDateTime(markA, explorer.timezoneOffset, false)}
    </span>
  {:else}
    <span class="text-sm text-gray-600">Not picked</span>
  {/if}

  <span class="text-gray-600">—</span>

  {#if markB !== null}
    <span
      title="Rewind to B"
      class="text-timestamp cursor-pointer whitespace-nowrap tabular-nums"
      onclick={() =>
        explorer.seekOrRewind(markB!, seekableRange, onSeekTo, onRewind)}
    >
      {sameDay
        ? formatTime(markB, explorer.timezoneOffset)
        : `${formatDateTime(markB, explorer.timezoneOffset, false)}`}
    </span>
  {:else}
    <span class="text-sm text-gray-400">Not picked</span>
  {/if}

  {#if markA !== null && markB !== null}
    <span class="text-timestamp text-muted-foreground! tabular-nums">
      ({formatIntervalDuration(Math.abs(markB - markA))})</span
    >
  {/if}

  <Button
    class="rounded-full hover:bg-neutral-300"
    title="Clear interval"
    variant="ghost"
    size="icon-sm"
    onclick={onClear}
  >
    <X />
  </Button>
</div>

<div class="selection-toolbar__row">
  <Button
    title={isPlayingInterval ? "Stop" : "Loop interval"}
    class="selection-toolbar__item--button"
    style="--item-bg: var(--color-interval-light)"
    variant="ghost"
    disabled={markA === null || markB === null}
    onclick={toggleInterval}
  >
    {#if isPlayingInterval}<Square />{:else}<Repeat />{/if}
  </Button>

  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          title="More"
          variant="ghost"
          size="sm"
          disabled={markA === null || markB === null}
          class="selection-toolbar__item--button-narrow"
          style="--item-bg: var(--color-interval-light)"
        >
          <EllipsisVertical />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="z-1000">
      <DropdownMenu.Item
        class="cursor-pointer"
        disabled={markA === null || markB === null}
        onclick={copyIntervalTimestamp}
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
