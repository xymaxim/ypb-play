<script lang="ts">
  import { onMount, untrack } from "svelte";
  import {
    StartStream,
    CancelStreamStart,
  } from "../bindings/rewyt/services/streamservice";
  import { CheckAllDependencies } from "../bindings/rewyt/services/dependenciesservice";
  import { Events } from "@wailsio/runtime";
  import { Button } from "$lib/components/ui/button/index.js";
  import { createExplorer, setExplorerContext } from "./lib/explorer.svelte";
  import { createPlayer } from "./lib/player.svelte";
  import { formatOffset } from "./lib/utils/dateTimeUtils";
  import TopBar from "./lib/components/TopBar.svelte";
  import ExplorerPane from "./lib/components/ExplorerPane.svelte";
  import WelcomePane from "./lib/components/WelcomePane.svelte";
  import Toast from "./lib/components/Toast.svelte";
  import DependencyNotice from "./lib/components/DependencyNotice.svelte";
  import StartingPane from "./lib/components/StartingPane.svelte";
  import StartingProgress from "./lib/components/StartingProgress.svelte";
  import StartingError from "./lib/components/StartingError.svelte";
  import RewindError from "./lib/components/RewindError.svelte";
  import PlayerControls from "./lib/components/PlayerControls.svelte";

  export const StreamStatus = {
    IDLE: "idle",
    LOADING: "loading",
    READY: "ready",
    STARTING: "starting",
  } as const;
  type StreamStatus = (typeof StreamStatus)[keyof typeof StreamStatus];

  type KeyHandler = (e: KeyboardEvent) => void;

  let explorerCell = $state({ current: createExplorer() });
  setExplorerContext(explorerCell);

  let explorer = $derived(explorerCell.current);

  let videoEl: HTMLVideoElement | null = null;
  let stageEl: HTMLElement | null = null;

  // State
  let player = $state(createPlayer(() => videoEl));
  let streamStatus = $state<StreamStatus>(StreamStatus.IDLE);
  let hasLoadedStream = $state(false);
  let ytdlpStdout = $state<string>("");
  let unlistenStdout: (() => void) | null = null;
  let showStdoutLog = $state(false);
  let lastError = $state<unknown>(null);
  let missingDependencies = $state<string[]>([]);
  let hasMissingDependencies = $derived(missingDependencies.length > 0);

  // Effects: player-explorer wiring
  $effect(() => {
    explorer.setPlayheadTime(player.playheadTime?.getTime() ?? null);
  });

  $effect(() => {
    explorer.setMpdStartTime(player.mpdStartTime?.getTime() ?? null);
  });

  $effect(() => {
    explorer.setIsRewinding(player.isRewinding);
  });

  $effect(() => {
    const info = player.streamInfo;
    if (!info) return;
    explorer.setStreamStartTime(info.actualStartTime.getTime());
  });

  // Events
  async function onStreamStart(videoId: string) {
    streamStatus = StreamStatus.STARTING;
    lastError = null;
    ytdlpStdout = "";
    showStdoutLog = false;
    unlistenStdout = Events.On("stream-stdout", (event) => {
      ytdlpStdout += event.data;
    });

    explorerCell.current.destroy();
    explorerCell.current = createExplorer();
    await player.destroy();
    player = createPlayer(() => videoEl);
    try {
      await StartStream(videoId);
      cleanupStdout();
      streamStatus = StreamStatus.LOADING;
      await player.init();
      streamStatus = StreamStatus.READY;
      hasLoadedStream = true;
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("context canceled")) {
        lastError = err;
      }
      unlistenStdout?.();
      unlistenStdout = null;
      streamStatus = StreamStatus.IDLE;
      return;
    }
  }

  function cleanupStdout() {
    unlistenStdout?.();
    unlistenStdout = null;
    ytdlpStdout = "";
  }

  function onCancelStreamStart() {
    CancelStreamStart();
    cleanupStdout();
    player.destroy();
    player = createPlayer(() => videoEl);
    streamStatus = StreamStatus.IDLE;
    hasLoadedStream = false;
  }

  // Keyboard shortcuts
  const playKeyMap: Record<string, KeyHandler> = {
    " ": (e) => {
      e.preventDefault();
      player.togglePlayPause();
    },
    ArrowLeft: () => player.step(-2),
    ArrowRight: () => player.step(2),
    a: () => {
      if (explorer.playheadTime !== null)
        explorer.assignMark("A", explorer.playheadTime);
    },
    b: () => {
      if (explorer.playheadTime !== null)
        explorer.assignMark("B", explorer.playheadTime);
    },
    r: () => {
      if (explorer.playheadTime !== null)
        explorer.setSelectedTime(explorer.playheadTime);
    },
  };

  function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    )
      return;
    const keyMap = playKeyMap;
    keyMap[e.key]?.(e);
  }

  // Interval and screenshot
  function onIntervalEnd() {
    if (explorer.marks.A !== null) {
      player.seekTo(explorer.marks.A);
    } else {
      player.stopInterval();
    }
  }

  // Toast
  let toastMessage = $state<string | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function toast(msg: string, durationMs = 2000) {
    toastMessage = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = null;
      toastTimer = null;
    }, durationMs);
  }

  async function handleScreenshot(ts: number) {
    const dataUrl = player.captureScreenshot();
    if (!dataUrl || !player.streamInfo) {
      throw new Error("Unable to capture screenshot");
    }
    const shifted = new Date(ts + explorer.timezoneOffset * 60 * 1000);
    const iso = shifted.toISOString().slice(0, 19).replace(/[:-]/g, "");
    const offset = formatOffset(explorer.timezoneOffset);
    const filename = `Screenshot_${player.streamInfo.id}_${iso}${offset}.png`;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  // Lifecycle
  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    videoEl?.addEventListener("interval-end", onIntervalEnd);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      videoEl?.removeEventListener("interval-end", onIntervalEnd);
      explorerCell.current.destroy();
      player.destroy();
    };
  });

  onMount(async () => {
    const dependencies = await CheckAllDependencies();
    missingDependencies = dependencies
      .filter((d) => !d.available)
      .map((d) => d.name);
  });
</script>

<main
  class="relative mx-auto flex w-full max-w-4xl min-w-2xl flex-col gap-2 px-6 py-3"
>
  {#if toastMessage}
    <Toast message={toastMessage} />
  {/if}

  <TopBar
    {onStreamStart}
    streamTitle={player.streamInfo?.title ?? null}
    {streamStatus}
    videoId={player.streamInfo?.id ?? null}
    {hasMissingDependencies}
  />

  <div
    class="flex h-[362px] w-full min-w-[640px] cursor-default justify-center rounded-lg
               {streamStatus === StreamStatus.IDLE ||
    streamStatus === StreamStatus.STARTING
      ? 'bg-gradient-to-t from-neutral-200 to-transparent to-80%'
      : ''}"
    class:bg-black={(streamStatus === StreamStatus.LOADING ||
      streamStatus === StreamStatus.READY) &&
      !player.rewindError}
    class:overflow-hidden={streamStatus === StreamStatus.LOADING ||
      streamStatus === StreamStatus.READY}
  >
    <div
      class="group relative flex w-full cursor-default! justify-center"
      class:rewind-error={!!player.rewindError}
    >
      {#if player.streamInfo}
        <div
          class="absolute top-0 right-0 left-0 z-10 flex flex-col gap-0.5 px-4 py-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style="background: linear-gradient(to bottom, rgba(0,0,0,0.65), transparent);"
        >
          <a
            href="https://www.youtube.com/watch?v={player.streamInfo.id}"
            class="text-md leading-tight font-bold text-white hover:text-neutral-200"
            target="_blank"
            rel="noopener noreferrer">{player.streamInfo.title}</a
          >
          <a
            href="https://youtube.com/channel/{player.streamInfo.channelId}"
            class="text-sm font-medium text-neutral-100 hover:text-neutral-200"
            target="_blank"
            rel="noopener noreferrer">{player.streamInfo.channelTitle}</a
          >
        </div>
      {/if}

      <div class:hidden={!!player.streamInfo} class="relative mb-3 flex">
        <div class="absolute inset-0 flex items-center justify-center">
          {#if streamStatus === StreamStatus.STARTING}
            <div
              class="pointer-events-none absolute rounded-4xl bg-[var(--color-selected-light)]"
            >
              <StartingPane />
            </div>
          {/if}

          {#if streamStatus === StreamStatus.IDLE}
            <div class="absolute z-10 h-full w-[640px] transition duration-400">
              <WelcomePane />
            </div>
          {/if}
        </div>
      </div>

      {#if explorer.isRewinding}
        <div
          class="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-black/40"
        >
          <span class="text-base font-medium text-white">Rewinding...</span>
        </div>
      {/if}

      {#if player.rewindError}
        <RewindError error={player.rewindError} />
      {/if}
      <div
        class="video-stage group relative flex w-full justify-center"
        class:hidden={streamStatus !== StreamStatus.READY ||
          !!player.rewindError}
        bind:this={stageEl}
      >
        <video bind:this={videoEl} class="block h-full w-auto max-w-full" muted
        ></video>
        <PlayerControls
          {videoEl}
          {stageEl}
          dashPlayer={player.dashPlayer}
          onTogglePlayPause={() => player.togglePlayPause()}
          onScreenshot={() =>
            handleScreenshot(player.playheadTime?.getTime() ?? Date.now())}
          onRewindToLive={() => player.rewindToLive()}
          isAtLiveEdge={player.isAtLiveEdge}
        />
      </div>
    </div>
  </div>

  {#if streamStatus === StreamStatus.IDLE}
    {#if lastError}
      <StartingError error={lastError} stdout={ytdlpStdout} />
    {/if}
    <DependencyNotice {missingDependencies} />
  {:else if streamStatus === StreamStatus.STARTING}
    <StartingProgress
      onCancel={onCancelStreamStart}
      stdout={ytdlpStdout}
      showLog={showStdoutLog}
    />
  {:else if streamStatus === StreamStatus.LOADING}
    <p
      class="mt-8 w-full animate-pulse text-center text-base text-muted-foreground"
    >
      Loading stream...
    </p>
  {:else if streamStatus === StreamStatus.READY}
    <div
      class:opacity-50={explorer.isRewinding}
      class:pointer-events-none={explorer.isRewinding}
    >
      {#if explorer.isReady}
        <ExplorerPane
          isMpdLoaded={player.isMpdLoaded}
          isPlayingInterval={player.isPlayingInterval}
          lastRewindTarget={player.lastRewindTarget}
          mpdStartTime={player.mpdStartTime}
          playingTime={player.playheadTime}
          seekableRange={player.seekableRange}
          {videoEl}
          onClearRewindError={() => player.clearRewindError()}
          onPlayInterval={(a, b) => player.playInterval(a, b)}
          onReplay={() => player.replay()}
          onRewind={(isoTime, pause) => player.rewind(isoTime, pause)}
          onRewindToLive={() => player.rewindToLive()}
          onSeekTo={(time, pause) => player.seekTo(time, pause)}
          onStep={(s) => player.step(s)}
          onStopInterval={() => player.stopInterval(explorer.marks.A)}
          onTogglePlayPause={() => player.togglePlayPause()}
        />
      {/if}
    </div>
  {/if}
</main>

<style>
  :global(.shaka-content-title) {
    display: none !important;
  }
  :global(.rewind-error .shaka-controls-container) {
    display: none !important;
  }
  :global(.video-stage:fullscreen) {
    width: 100vw;
    height: 100vh;
  }
  :global(.video-stage:fullscreen video) {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>
