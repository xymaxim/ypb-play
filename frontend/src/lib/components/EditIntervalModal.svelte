<script lang="ts">
  import { untrack } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { getExplorerContext } from "../explorer.svelte";
  import { parseTimestamp } from "../utils/dateTimeUtils";

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  const explorer = getExplorerContext();

  let intervalA = $state<string>("");
  let intervalB = $state<string>("");
  let intervalAError = $state<string | null>(null);
  let intervalBError = $state<string | null>(null);

  const invalidInputError =
    "Enter a valid timestamp, e.g. 2026-01-02T10:20:30+00:00";
  const outOfRangeError = "Timestamp is outside the available range";

  function toIsoWithOffset(ms: number, offsetMinutes: number): string {
    const shifted = new Date(ms + offsetMinutes * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const abs = Math.abs(offsetMinutes);
    const offH = pad(Math.floor(abs / 60));
    const offM = pad(abs % 60);
    return (
      `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
      `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}` +
      `${sign}${offH}:${offM}`
    );
  }

  $effect(() => {
    if (!open) return;
    untrack(() => {
      const markA = explorer.marks.A;
      const markB = explorer.marks.B;
      const fallback = markA ?? markB ?? explorer.selectedTime ?? Date.now();
      intervalA =
        markA !== null
          ? toIsoWithOffset(markA, explorer.timezoneOffset)
          : toIsoWithOffset(fallback, explorer.timezoneOffset);
      intervalB =
        markB !== null
          ? toIsoWithOffset(markB, explorer.timezoneOffset)
          : toIsoWithOffset(fallback, explorer.timezoneOffset);
      intervalAError = null;
      intervalBError = null;
    });
  });

  function isOutOfRange(ts: number): boolean {
    const ar = explorer.availableRange;
    return ar !== null && (ts < ar.start || ts > ar.end);
  }

  function submit() {
    const aTs = parseTimestamp(intervalA);
    const bTs = parseTimestamp(intervalB);
    intervalAError = null;
    intervalBError = null;

    if (aTs === null) intervalAError = invalidInputError;
    if (bTs === null) intervalBError = invalidInputError;
    if (aTs !== null && isOutOfRange(aTs)) intervalAError = outOfRangeError;
    if (bTs !== null && isOutOfRange(bTs)) intervalBError = outOfRangeError;
    if (intervalAError || intervalBError) return;

    const lo = Math.min(aTs!, bTs!);
    const hi = Math.max(aTs!, bTs!);
    explorer.assignMark("A", lo);
    explorer.assignMark("B", hi);
    open = false;
  }

  function close() {
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-lg [&_button[data-dialog-close]]:hidden">
    <Dialog.Header>
      <Dialog.Title>Edit Interval</Dialog.Title>
    </Dialog.Header>

    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-interval-100)]/50 text-sm font-semibold"
          >A</span
        >
        <Input
          id="edit-interval-a"
          bind:value={intervalA}
          placeholder="2026-01-02T10:20:30+00:00"
          class="focus-visible:border-input {intervalAError
            ? 'border-destructive'
            : 'border-input'}"
          onkeydown={(e) => {
            if (e.key !== "Enter" || e.repeat) return;
            e.preventDefault();
            e.stopPropagation();
            submit();
          }}
        />
      </div>
      {#if intervalAError}
        <p class="mt-1 pl-9 text-sm text-destructive">{intervalAError}</p>
      {/if}
      <div class="flex items-center gap-2">
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-interval-100)]/50 text-sm font-semibold"
          >B</span
        >
        <Input
          id="edit-interval-b"
          bind:value={intervalB}
          placeholder="2026-01-02T10:20:30+00:00"
          class="focus-visible:border-input {intervalBError
            ? 'border-destructive'
            : 'border-input'}"
          onkeydown={(e) => {
            if (e.key !== "Enter" || e.repeat) return;
            e.preventDefault();
            e.stopPropagation();
            submit();
          }}
        />
      </div>
      {#if intervalBError}
        <p class="mt-1 pl-9 text-sm text-destructive">{intervalBError}</p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="ghost" onclick={close}>Cancel</Button>
      <Button variant="ghost" onclick={submit}>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
