<script lang="ts">
  import { untrack } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { getExplorerContext } from "../explorer.svelte";
  import { clampViewRange } from "../utils/timelineUtils";

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
  let activeTab = $state<"moment" | "interval">("moment");
  let intervalA = $state<string>("");
  let intervalB = $state<string>("");
  let intervalAError = $state<boolean>(false);
  let intervalBError = $state<boolean>(false);

  const invalidInputError =
    "Enter a valid timestamp, e.g. 2026-01-02T10:20:30+00:00";

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
      intervalA =
        explorer.marks.A !== null
          ? toIsoWithOffset(explorer.marks.A, explorer.timezoneOffset)
          : inputValue;
      intervalB =
        explorer.marks.B !== null
          ? toIsoWithOffset(explorer.marks.B, explorer.timezoneOffset)
          : inputValue;
      inputError = null;
      intervalAError = false;
      intervalBError = false;
      onClearRewindError();
      if (isPlaying) onTogglePlayPause();
    });
  });

  async function submit() {
    if (activeTab === "interval") {
      await submitInterval();
    } else {
      await submitMoment();
    }
  }

  async function submitMoment() {
    const value = inputValue.trim();
    const parsed = new Date(value);
    if (value === "" || Number.isNaN(parsed.getTime())) {
      inputError = invalidInputError;
      return;
    }
    let ts = parsed.getTime();
    explorer.setSelectedTime(ts);
    open = false;

    const success = await onRewind(value, true);
    if (!success) {
      const ar = explorer.availableRange;
      if (ar && (ts < ar.start || ts > ar.end)) {
        ts = Math.max(ar.start + 10 * 60_000, Math.min(ar.end, ts));
        explorer.setSelectedTime(ts);
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

  async function submitInterval() {
    intervalAError = false;
    intervalBError = false;
    const av = intervalA.trim();
    const bv = intervalB.trim();
    const a = new Date(av);
    const b = new Date(bv);
    if (av === "" || Number.isNaN(a.getTime())) intervalAError = true;
    if (bv === "" || Number.isNaN(b.getTime())) intervalBError = true;
    if (intervalAError || intervalBError) return;
    const lo = Math.min(a.getTime(), b.getTime());
    const hi = Math.max(a.getTime(), b.getTime());
    explorer.assignMark("A", lo);
    explorer.assignMark("B", hi);
    explorer.setSelectedTime(lo);
    open = false;

    let ts = lo;
    const success = await onRewind(new Date(lo).toISOString(), true);
    if (!success) {
      const ar = explorer.availableRange;
      if (ar && (ts < ar.start || ts > ar.end)) {
        ts = Math.max(ar.start + 10 * 60_000, Math.min(ar.end, ts));
        explorer.setSelectedTime(ts);
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

  function close() {
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-lg [&_button[data-dialog-close]]:hidden">
    <Dialog.Header>
      <Dialog.Title>Input and Rewind</Dialog.Title>
    </Dialog.Header>

    <Tabs.Root
      bind:value={activeTab}
      onValueChange={() => {
        inputError = null;
        intervalAError = false;
        intervalBError = false;
      }}
    >
      <Tabs.List class="bg-transparent">
        <Tabs.Trigger value="moment">Moment</Tabs.Trigger>
        <Tabs.Trigger value="interval">Interval</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="moment">
        <Input
          id="jump-to-time-input"
          bind:value={inputValue}
          placeholder="2026-01-02T10:20:30+00:00"
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
          <p class="mt-2 text-sm text-destructive">{inputError}</p>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="interval">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span
              class="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-interval-100)]/50 text-sm font-semibold"
              >A</span
            >
            <Input
              id="jump-to-interval-a"
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
          <div class="flex items-center gap-2">
            <span
              class="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-interval-100)]/50 text-sm font-semibold"
              >B</span
            >
            <Input
              id="jump-to-interval-b"
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
        </div>
        {#if intervalAError || intervalBError}
          <p class="mt-2 text-sm text-destructive">{invalidInputError}</p>
        {/if}
      </Tabs.Content>
    </Tabs.Root>

    <Dialog.Footer>
      <Button variant="ghost" onclick={close}>Cancel</Button>
      <Button variant="ghost" onclick={submit}>Rewind</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
