<script lang="ts">
  import { Tabs } from "bits-ui";
  import { Play, Rewind } from "lucide-svelte";
  import { getExplorerContext } from "../explorer.svelte";
  import SelectedPanel from "./SelectedPanel.svelte";
  import IntervalPanel from "./IntervalPanel.svelte";

  interface Props {
    isPlayingInterval: boolean;
    seekableRange: { start: number; end: number } | null;
    videoId: string | null;
    onSeekTo: (time: number, pause?: boolean) => void;
    onPlayInterval: (a: number, b: number) => void;
    onRewind: (isoTime: string, pause?: boolean) => Promise<boolean>;
    onStopInterval: () => void;
  }

  const {
    isPlayingInterval,
    seekableRange,
    videoId,
    onPlayInterval,
    onRewind,
    onSeekTo,
    onStopInterval,
  }: Props = $props();

  const explorer = getExplorerContext();

  let activeTab = $state("selected");

  const markA = $derived(explorer.marks.A);
  const markB = $derived(explorer.marks.B);

  function clearInterval() {
    if (isPlayingInterval) onStopInterval();
    explorer.clearAllMarks();
    activeTab = "selected";
  }
</script>

<div class="mx-auto mt-2 flex w-full max-w-3xl">
  <Tabs.Root
    bind:value={activeTab}
    orientation="horizontal"
    class="timeline-toolbar-tabs relative flex w-full flex-row items-center"
  >
    <Tabs.List
      class="z-10 flex h-auto w-30 flex-row gap-1 bg-[var(--background)]"
    >
      <Tabs.Trigger
        value="selected"
        class="relative left-[-15px] z-11 flex items-center justify-center font-bold tracking-tight"
      >
        <div class="size-8! rounded-full bg-[var(--color-selected)]">
          <div
            class="absolute bottom-1/2 left-1/2 z-10 size-0.75 -translate-x-1/2 translate-y-1/2 rounded-full bg-black"
          />
        </div>
      </Tabs.Trigger>
      <Tabs.Trigger
        value="interval"
        disabled={markA === null && markB === null}
        class="relative left-[-15px] z-12 items-center justify-center font-bold tracking-tight {explorer
          .marks.A !== null || explorer.marks.B !== null
          ? ''
          : 'opacity-0!'}"
      >
        <div class="flex -rotate-30">
          <div
            class="size-5! rounded-full bg-[var(--color-interval-100)]"
          ></div>
          <div
            class="size-5! rounded-l-full bg-gradient-to-r from-[var(--color-interval-100)]"
          ></div>
        </div>
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content
      disabled
      value="selected"
      class="relative inset-0 flex w-full items-center justify-center gap-2"
    >
      <SelectedPanel {seekableRange} {onSeekTo} {onRewind} />
    </Tabs.Content>

    <Tabs.Content
      value="interval"
      class="relative inset-0 flex w-full items-center justify-center"
    >
      <IntervalPanel
        {isPlayingInterval}
        {seekableRange}
        {videoId}
        {onSeekTo}
        {onRewind}
        {onPlayInterval}
        {onStopInterval}
        onClear={clearInterval}
      />
    </Tabs.Content>
  </Tabs.Root>
</div>

<style>
  @reference "tailwindcss";
  @reference "../../app.css";

  :global(.timeline-toolbar-tabs [data-tabs-trigger]) {
    @apply flex h-10 w-12! cursor-pointer justify-center rounded-full shadow-none grayscale-100 outline-none! hover:grayscale-0 data-[state=active]:pointer-events-none data-[state=active]:z-20 data-[state=active]:-rotate-0 data-[state=active]:bg-neutral-700! data-[state=active]:opacity-100 data-[state=active]:grayscale-0;
  }
  :global(.timeline-toolbar-tabs [data-slot="tabs-content"]) {
    @apply ml-[-80px] inline-flex h-10 items-center py-1;
  }
</style>
