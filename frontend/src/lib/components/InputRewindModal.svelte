<script lang="ts">
  import { untrack } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { getExplorerContext } from "../explorer.svelte";
  import { clampViewRange } from "../utils/timelineUtils";
  import { parseTimestamp } from "../utils/dateTimeUtils";

  interface Props {
    open?: boolean;
    isPlaying: boolean;
    onRewind: (isoTime: string, pause?: boolean) => Promise<boolean>;
    onClearRewindError: () => void;
    onTogglePlayPause: () => void;
  }

  let {
    open = $bindable(false),
    isPlaying,
    onRewind,
    onClearRewindError,
    onTogglePlayPause,
  }: Props = $props();

  const explorer = getExplorerContext();

  let inputValue = $state<string>("");
  let inputError = $state<string | null>(null);

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
      const defaultTime = explorer.selectedTime ?? Date.now();
      inputValue = toIsoWithOffset(defaultTime, explorer.timezoneOffset);
      inputError = null;
      onClearRewindError();
      if (isPlaying) onTogglePlayPause();
    });
  });

  function splitInterval(value: string): string[] {
    if (value.includes("/")) return value.split("/");
    if (value.includes("--")) return value.split("--");
    return [value];
  }

  async function submit() {
    const parts = splitInterval(inputValue.trim());
    if (parts.length === 1) {
      await submitMoment(parts[0]);
    } else if (parts.length === 2) {
      await submitInterval(parts[0], parts[1]);
    } else {
      inputError = invalidInputError;
    }
  }

  function isOutOfRange(ts: number): boolean {
    const ar = explorer.availableRange;
    return ar !== null && (ts < ar.start || ts > ar.end);
  }

  async function submitMoment(value: string) {
    const ts = parseTimestamp(value);
    if (ts === null) {
      inputError = invalidInputError;
      return;
    }
    if (isOutOfRange(ts)) {
      inputError = outOfRangeError;
      return;
    }
    explorer.setSelectedTime(ts);
    open = false;

    const success = await onRewind(value, true);
    if (!success) {
      const ar = explorer.availableRange;
      if (ar && (ts < ar.start || ts > ar.end)) {
        const clamped = Math.max(ar.start + 10 * 60_000, Math.min(ar.end, ts));
        explorer.setSelectedTime(clamped);
      }
    }
    explorer.setViewRange(
      clampViewRange(
        ts,
        explorer.zoomLevel,
        explorer.days,
        explorer.centeredOnMidnight,
      ),
    );
  }

  async function submitInterval(aValue: string, bValue: string) {
    const aTs = parseTimestamp(aValue);
    const bTs = parseTimestamp(bValue);

    const errors: string[] = [];
    if (aTs === null) errors.push(`A: ${invalidInputError}`);
    if (bTs === null) errors.push(`B: ${invalidInputError}`);
    if (aTs !== null && isOutOfRange(aTs)) errors.push(`A: ${outOfRangeError}`);
    if (bTs !== null && isOutOfRange(bTs)) errors.push(`B: ${outOfRangeError}`);
    if (errors.length > 0) {
      inputError = errors.join("\n");
      return;
    }

    const lo = Math.min(aTs!, bTs!);
    const hi = Math.max(aTs!, bTs!);
    explorer.assignMark("A", lo);
    explorer.assignMark("B", hi);
    explorer.setSelectedTime(lo);
    open = false;

    const success = await onRewind(new Date(lo).toISOString(), true);
    if (!success) {
      const ar = explorer.availableRange;
      if (ar && (lo < ar.start || lo > ar.end)) {
        const clamped = Math.max(ar.start + 10 * 60_000, Math.min(ar.end, lo));
        explorer.setSelectedTime(clamped);
      }
    }
    explorer.setViewRange(
      clampViewRange(
        lo,
        explorer.zoomLevel,
        explorer.days,
        explorer.centeredOnMidnight,
      ),
    );
  }

  function close() {
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="w-full sm:max-w-md [&_button[data-dialog-close]]:hidden">
    <Dialog.Header>
      <Dialog.Title>Input and Rewind</Dialog.Title>
    </Dialog.Header>

    <div class="flex flex-col gap-2">
      <Label for="input-rewind-input" class="text-sm font-normal">
        Moment or interval
      </Label>
      <Input
        id="input-rewind-input"
        bind:value={inputValue}
        placeholder="2026-01-02T10:20:30+00:00 or A/B"
        class="focus-visible:border-input {inputError
          ? 'border-destructive'
          : 'border-input'}"
        onkeydown={(e) => {
          if (e.key !== "Enter" || e.repeat) return;
          e.preventDefault();
          e.stopPropagation();
          submit();
        }}
      />
      {#if inputError}
        <p class="mt-2 text-sm whitespace-pre-line text-destructive">
          {inputError}
        </p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="ghost" onclick={close}>Cancel</Button>
      <Button variant="ghost" onclick={submit}>Rewind</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
