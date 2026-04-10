<script lang="ts">
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import RewindIcon from "phosphor-svelte/lib/RewindIcon";
  import { getExplorerContext } from "../explorer.svelte";
  import SelectedPanel from "./SelectedPanel.svelte";
  import IntervalPanel from "./IntervalPanel.svelte";

  interface Props {
    isPlayingInterval: boolean;
    seekableRange: { start: number; end: number } | null;
    onSeekTo: (time: number, pause?: boolean) => void;
    onPlayInterval: (a: number, b: number) => void;
    onRewind: (isoTime: string, pause?: boolean) => void;
    onStopInterval: () => void;
  }

  const {
    isPlayingInterval,
    seekableRange,
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

<div class="mx-auto flex w-full max-w-3xl">
  <Tabs.Root
    bind:value={activeTab}
    class="relative flex w-full flex-row items-center"
  >
    <Tabs.List
      class="z-10 flex h-auto w-[80px] flex-row gap-1 bg-[var(--background)]"
    >
      <Tabs.Trigger value="selected" class="z-20">
        <RewindIcon weight="bold" class="h-auto! w-auto!" size={20} />
      </Tabs.Trigger>
      <Tabs.Trigger
        value="interval"
        disabled={markA === null && markB === null}
        class="relative left-[-15px] font-bold tracking-tight"
      >
        AB
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
      class="relative inset-0 mt-0 w-full justify-center"
    >
      <IntervalPanel
        {isPlayingInterval}
        {seekableRange}
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

  :global([data-tabs-trigger]) {
    @apply h-8 w-8 cursor-pointer rounded-full bg-neutral-400 text-sm text-xs text-neutral-100 shadow-none data-[state=active]:pointer-events-none data-[state=active]:bg-neutral-500;
  }
  :global([data-tabs-trigger]):hover {
    @apply h-8 bg-neutral-400/80;
  }
  :global([data-slot="tabs-content"]) {
    @apply ml-[-80px] inline-flex h-10 items-center py-1;
  }
</style>
