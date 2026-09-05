<script lang="ts">
  import { getExplorerContext } from "$lib/explorer.svelte";
  import MainBar from "$lib/components/MainBar.svelte";
  import DaySlider from "$lib/components/sliders/DaySlider.svelte";
  import DaysSlider from "$lib/components/sliders/DaysSlider.svelte";
  import Timeline from "$lib/components/Timeline.svelte";
  import TimelineToolbar from "$lib/components/TimelineToolbar.svelte";

  interface Props {
    isMpdLoaded: boolean;
    isPlayingInterval: boolean;
    lastRewindTarget: number | null;
    mpdStartTime: number;
    playingTime: Date | null;
    seekableRange: { start: number; end: number } | null;
    videoEl: HTMLVideoElement | null;
    onClearRewindError: () => void;
    onPlayInterval: (a: number, b: number) => void;
    onReplay: () => void;
    onRewind: (isoTime: string, pause?: boolean) => Promise<boolean>;
    onRewindToLive: () => void;
    onSeekTo: (time: number, pause?: boolean) => void;
    onStep: (seconds: number) => void;
    onStopInterval: () => void;
    onTogglePlayPause: () => void;
  }

  const {
    isMpdLoaded,
    isPlayingInterval,
    lastRewindTarget,
    mpdStartTime,
    playingTime,
    seekableRange,
    videoEl,
    onClearRewindError,
    onPlayInterval,
    onReplay,
    onRewind,
    onRewindToLive,
    onSeekTo,
    onStep,
    onStopInterval,
    onTogglePlayPause,
  }: Props = $props();

  const explorer = getExplorerContext();

  // State
  let isPlaying = $state(false);

  // Derived
  const isRewound = $derived(
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
    <MainBar
      {isPlaying}
      {playingTime}
      {isRewound}
      {onClearRewindError}
      {onReplay}
      {onRewindToLive}
      {onRewind}
      {onStep}
      {onTogglePlayPause}
    />

    <Timeline
      {seekableRange}
      mpdStartTime={mpdStartTime.getTime()}
      {isRewound}
      {onRewind}
      {onSeekTo}
      onTimeChange={onClearRewindError}
    />

    <div class="mt-1 mb-2 flex gap-2">
      <div class="relative w-[60%] rounded-2xl bg-neutral-200 px-[1rem]">
        <DaysSlider onTimeChange={onClearRewindError} />
      </div>
      <div class="relative w-[40%] rounded-2xl bg-neutral-200 px-[1rem]">
        <DaySlider onTimeChange={onClearRewindError} />
      </div>
    </div>

    <div class="flex h-10 items-center justify-center">
      {#if explorer.selectedTime !== null}
        <TimelineToolbar
          {isPlayingInterval}
          {seekableRange}
          {onSeekTo}
          {onPlayInterval}
          {onStopInterval}
          {onRewind}
        />
      {/if}
    </div>
  {/if}
</div>
