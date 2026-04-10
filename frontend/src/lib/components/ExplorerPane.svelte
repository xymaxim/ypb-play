<script lang="ts">
  import { getExplorerContext } from "../explorer.svelte";
  import TimelineViewRange from "./TimelineViewRange.svelte";
  import DaySelector from "./DaySelector.svelte";
  import MainBar from "./MainBar.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import SelectionToolbar from "./SelectionToolbar.svelte";
  import Timeline from "./Timeline.svelte";

  interface Props {
    isMpdLoaded: boolean;
    isPlayingInterval: boolean;
    lastRewindTarget: number | null;
    playingTime: Date | null;
    seekableRange: { start: number; end: number } | null;
    videoEl: HTMLVideoElement | null;
    onPlayInterval: (a: number, b: number) => void;
    onReplay: () => void;
    onRewind: (isoTime: string) => void;
    onRewindToLive: () => void;
    onScreenshot: (ts: number) => void;
    onSeekTo: (time: number, pause?: boolean) => void;
    onStep: (seconds: number) => void;
    onStopInterval: () => void;
    onTogglePlayPause: () => void;
  }

  const {
    isMpdLoaded,
    isPlayingInterval,
    lastRewindTarget,
    playingTime,
    seekableRange,
    videoEl,
    onPlayInterval,
    onReplay,
    onRewind,
    onRewindToLive,
    onScreenshot,
    onSeekTo,
    onStep,
    onStopInterval,
    onTogglePlayPause,
  }: Props = $props();

  const explorer = getExplorerContext();

  // State
  let isPlaying = $state(false);

  // Derived
  const rewindDisabled = $derived(
    lastRewindTarget !== null &&
      explorer.selectedTime !== null &&
      lastRewindTarget === explorer.selectedTime,
  );

  // Effects
  $effect(() => {
    if (!videoEl) return;
    const onPlay = () => (isPlaying = true);
    const onPause = () => (isPlaying = false);
    videoEl.addEventListener("play", onPlay);
    videoEl.addEventListener("pause", onPause);
    return () => {
      videoEl.removeEventListener("play", onPlay);
      videoEl.removeEventListener("pause", onPause);
    };
  });
</script>

<div class="flex w-full flex-col gap-1">
  {#if !isMpdLoaded}
    <p class="mt-8 w-full text-center text-base text-gray-400">
      Loading stream...
    </p>
  {:else}
    <ProgressBar />

    <DaySelector />

    <MainBar
      {isPlaying}
      {playingTime}
      {rewindDisabled}
      {onReplay}
      {onRewindToLive}
      {onRewind}
      {onScreenshot}
      {onStep}
      {onTogglePlayPause}
    />

    <Timeline {seekableRange} {onRewind} {rewindDisabled} />

    {#if explorer.showTimelineViewRange}
      <TimelineViewRange />
    {/if}

    {#if explorer.selectedTime !== null}
      <SelectionToolbar
        {isPlayingInterval}
        {seekableRange}
        {onSeekTo}
        {onPlayInterval}
        {onStopInterval}
        {onRewind}
      />
    {/if}
  {/if}
</div>
