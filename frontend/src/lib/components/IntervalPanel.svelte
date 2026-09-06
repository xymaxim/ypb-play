<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import {
    ArrowUpRight,
    EllipsisVertical,
    Pen,
    Redo,
    Repeat,
    Minimize2,
    Square,
    X,
  } from "lucide-svelte";
import EditIntervalModal from "./EditIntervalModal.svelte";
  import { getExplorerContext } from "../explorer.svelte";
  import { getToastContext } from "../toast.svelte";
  import { clampViewRange } from "../utils/timelineUtils";
  import { ZOOM_LEVELS } from "../types";
  import {
    formatTime,
    formatDateTime,
    formatISOString,
    formatIntervalDuration,
  } from "../utils/dateTimeUtils";

  interface Props {
    isPlayingInterval: boolean;
    seekableRange: { start: number; end: number } | null;
    videoId: string | null;
    onSeekTo: (time: number, pause?: boolean) => void;
    onRewind: (isoTime: string, pause?: boolean) => void;
    onPlayInterval: (a: number, b: number) => void;
    onStopInterval: () => void;
    onClear: () => void;
  }

  const {
    isPlayingInterval,
    seekableRange,
    videoId,
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

  let popoverAOpen = $state(false);
  let popoverBOpen = $state(false);
  let editIntervalOpen = $state(false);

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
    getToastContext().toast("Timestamp copied");
  }

  function copyDownloadCommand() {
    if (markA === null || markB === null || videoId === null) return;
    const a = formatISOString(markA, explorer.timezoneOffset);
    const b = formatISOString(markB, explorer.timezoneOffset);
    navigator.clipboard.writeText(`ypb download -i ${a}/${b} ${videoId}`);
    getToastContext().toast("Download command copied");
  }

  function fitIntervalToView() {
    if (markA === null || markB === null) return;
    const a = Math.min(markA, markB);
    const b = Math.max(markA, markB);
    const vr = explorer.viewRange;
    if (!vr) return;

    if (vr.start <= a && vr.end >= b) return;

    const currentSpan = vr.end - vr.start;
    let target = explorer.zoomLevel;
    if (b - a > currentSpan) {
      const levels = (Object.values(ZOOM_LEVELS) as number[]).sort(
        (x, y) => x - y,
      );
      target = levels.find((l) => l >= b - a) ?? levels[levels.length - 1];
    }

    explorer.setZoom(target, (a + b) / 2);

    const newVr = explorer.viewRange;
    const sel = explorer.selectedTime;
    if (newVr && sel !== null && (sel < newVr.start || sel > newVr.end)) {
      const ar = explorer.availableRange;
      explorer.setSelectedTime(
        ar ? Math.min(Math.max(newVr.start, ar.start), ar.end) : newVr.start,
      );
    }
  }

  function gotoTime(time: number) {
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
  }
</script>

<div class="mr-5 flex items-center gap-2">
  {#if markA !== null}
    <Popover.Root bind:open={popoverAOpen}>
      <Popover.Trigger>
        {#snippet child({ props })}
          <button
            type="button"
            {...props}
            title="Actions for A"
            class="text-timestamp cursor-pointer whitespace-nowrap tabular-nums"
          >
            {formatDateTime(markA, explorer.timezoneOffset, false)}
          </button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content
        side="top"
        align="center"
        class="w-auto! flex-row! items-center! gap-2! rounded-full! px-3! py-1!"
      >
        <span class="px-1 font-bold text-black">A</span>
        <Button
          title="Rewind to A"
          variant="ghost"
          class="group gap-2 rounded-full p-1 hover:bg-transparent!"
          onclick={() => {
            explorer.seekOrRewind(markA!, seekableRange, onSeekTo, onRewind);
            popoverAOpen = false;
          }}
        >
          <span
            class="flex size-7 items-center justify-center rounded-full bg-[var(--color-interval-100)] transition-colors group-hover:bg-[var(--color-interval-50)]"
          >
            <Redo class="size-4 text-black" strokeWidth={2} />
          </span>
          <span class="text-sm font-medium">Rewind</span>
        </Button>
        <Button
          title="Jump to A"
          variant="ghost"
          class="group gap-2 rounded-full p-1 hover:bg-transparent!"
          onclick={() => {
            gotoTime(markA!);
            popoverAOpen = false;
          }}
        >
          <span
            class="flex size-7 items-center justify-center rounded-full bg-[var(--color-interval-100)] transition-colors group-hover:bg-[var(--color-interval-50)]"
          >
            <ArrowUpRight class="size-4 text-black" strokeWidth={2} />
          </span>
          <span class="text-sm font-medium">Jump</span>
        </Button>
      </Popover.Content>
    </Popover.Root>
  {:else}
    <span class="text-sm text-gray-600">Not picked</span>
  {/if}

  <span class="text-gray-600">—</span>

  {#if markB !== null}
    <Popover.Root bind:open={popoverBOpen}>
      <Popover.Trigger>
        {#snippet child({ props })}
          <button
            type="button"
            {...props}
            title="Actions for B"
            class="text-timestamp cursor-pointer whitespace-nowrap tabular-nums"
          >
            {sameDay
              ? formatTime(markB, explorer.timezoneOffset)
              : `${formatDateTime(markB, explorer.timezoneOffset, false)}`}
          </button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content
        side="top"
        align="center"
        class="w-auto! flex-row! items-center! gap-2! rounded-full! px-3! py-1!"
      >
        <span class="px-1 font-bold text-black">B</span>
        <Button
          title="Rewind to B"
          variant="ghost"
          class="group gap-2 rounded-full p-1 hover:bg-transparent!"
          onclick={() => {
            explorer.seekOrRewind(markB!, seekableRange, onSeekTo, onRewind);
            popoverBOpen = false;
          }}
        >
          <span
            class="flex size-7 items-center justify-center rounded-full bg-[var(--color-interval-100)] transition-colors group-hover:bg-[var(--color-interval-50)]"
          >
            <Redo class="size-4 text-black" strokeWidth={2} />
          </span>
          <span class="text-sm font-medium">Rewind</span>
        </Button>
        <Button
          title="Jump to B"
          variant="ghost"
          class="group gap-2 rounded-full p-1 hover:bg-transparent!"
          onclick={() => {
            gotoTime(markB!);
            popoverBOpen = false;
          }}
        >
          <span
            class="flex size-7 items-center justify-center rounded-full bg-[var(--color-interval-100)] transition-colors group-hover:bg-[var(--color-interval-50)]"
          >
            <ArrowUpRight class="size-4 text-black" strokeWidth={2} />
          </span>
          <span class="text-sm font-medium">Jump</span>
        </Button>
      </Popover.Content>
    </Popover.Root>
  {:else}
    <span class="text-sm text-gray-400">Not picked</span>
  {/if}

  <Button
    class="rounded-full bg-neutral-300 hover:bg-neutral-200"
    title="Clear interval"
    variant="ghost"
    size="icon-sm"
    onclick={onClear}
  >
    <X />
  </Button>

  {#if markA !== null || markB !== null}
    <Button
      class="rounded-full bg-neutral-300 hover:bg-neutral-200"
      title="Edit interval"
      variant="ghost"
      size="icon-sm"
      onclick={() => (editIntervalOpen = true)}
    >
      <Pen />
    </Button>
  {/if}

  {#if markA !== null && markB !== null}
    <Button
      class="rounded-full bg-neutral-300 hover:bg-neutral-200"
      title="Fit interval to view"
      variant="ghost"
      size="icon-sm"
      onclick={fitIntervalToView}
    >
      <Minimize2 />
    </Button>
  {/if}
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
      <DropdownMenu.Item
        class="cursor-pointer"
        disabled={markA === null || markB === null || videoId === null}
        onclick={copyDownloadCommand}
      >
        Copy download
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

<EditIntervalModal bind:open={editIntervalOpen} />

<style>
  :global([data-tabs-content]) {
    outline-style: none;
  }
</style>
