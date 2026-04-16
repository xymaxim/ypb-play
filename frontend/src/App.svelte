<script lang="ts">
  import { onMount } from "svelte";
  import { CancelStreamStart, StartStream } from "../wailsjs/go/main/App";
  import { EventsOn } from "../wailsjs/runtime/runtime";
  import { createExplorer, setExplorerContext } from "./lib/explorer.svelte";
  import { createPlayer } from "./lib/player.svelte";
  import { formatOffset } from "./lib/utils/dateTimeUtils";
  import TopBar from "./lib/components/TopBar.svelte";
  import ExplorerPane from "./lib/components/ExplorerPane.svelte";
  import Toast from "./lib/components/Toast.svelte";
  import WelcomePane from "./lib/components/WelcomePane.svelte";
  import StartingProgress from "./lib/components/StartingProgress.svelte";
  import StartingDoodle from "./lib/components/StartingDoodle.svelte";

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

  let player = $state(createPlayer(() => videoEl));

  // State
  let videoEl = $state<HTMLVideoElement | null>(null);
  let streamStatus = $state<StreamStatus>(StreamStatus.IDLE);
  let hasLoadedStream = $state(false);
  let ytdlpStdout = $state<string>("");
  let unlistenStdout: (() => void) | null = null;
  let showStdoutLog = $state(false);

  // Effects: player-explorer wiring
  $effect(() => {
    explorer.setPlayheadTime(player.playheadTime?.getTime() ?? null);
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
    ytdlpStdout = "";
    showStdoutLog = false;
    unlistenStdout = EventsOn("stream-stdout", (chunk: string) => {
      ytdlpStdout += chunk;
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
      if (streamStatus === StreamStatus.STARTING) {
        cleanupStdout();
        streamStatus = StreamStatus.IDLE;
        return;
      }
      cleanupStdout();
      streamStatus = StreamStatus.IDLE;
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
</script>

<main
  class="relative mx-auto flex w-full max-w-4xl min-w-2xl flex-col gap-2 px-6 py-3"
>
  {#if toastMessage}
    <Toast message={toastMessage} />
  {/if}

  <div>
    <TopBar
      {onStreamStart}
      streamTitle={player.streamInfo?.title ?? null}
      {streamStatus}
      videoId={player.streamInfo?.id ?? null}
    />
  </div>

  <div
    class="flex min-h-[362px] w-full min-w-[640px] cursor-default justify-center rounded-lg"
    class:bg-transparent={streamStatus === StreamStatus.IDLE ||
      streamStatus === StreamStatus.STARTING}
    class:bg-black={streamStatus === StreamStatus.LOADING ||
      streamStatus === StreamStatus.READY}
    class:overflow-hidden={streamStatus === StreamStatus.LOADING ||
      streamStatus === StreamStatus.READY}
  >
    <div class="group relative flex w-full justify-center">
      {#if player.streamInfo}
        <div
          class="absolute top-0 right-0 left-0 z-10 flex flex-col gap-0.5 px-4 py-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style="background: linear-gradient(to bottom, rgba(0,0,0,0.65), transparent);"
        >
          <h1 class="text-md leading-tight text-white">
            {player.streamInfo.title}
          </h1>
          <a
            href="https://youtube.com/channel/{player.streamInfo.channelId}"
            class="text-sm text-white/60 transition-colors hover:text-white/90"
            target="_blank"
            rel="noopener noreferrer">{player.streamInfo.channelTitle}</a
          >
        </div>
      {/if}

      {#if explorer.isRewinding}
        <div
          class="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-black/40"
        >
          <span class="text-base font-medium text-white">Rewinding...</span>
        </div>
      {/if}

      <video
        bind:this={videoEl}
        class="block h-auto max-h-full w-auto max-w-full"
        class:hidden={streamStatus !== StreamStatus.READY}
        muted
      ></video>
    </div>
  </div>

  {#if streamStatus === StreamStatus.STARTING}
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
          onPlayInterval={(a, b) => player.playInterval(a, b)}
          onReplay={() => player.replay()}
          onRewind={(isoTime, pause) => player.rewind(isoTime, pause)}
          onRewindToLive={() => player.rewindToLive()}
          onScreenshot={(ts) => handleScreenshot(ts)}
          onSeekTo={(time, pause) => player.seekTo(time, pause)}
          onStep={(s) => player.step(s)}
          onStopInterval={() => player.stopInterval(explorer.marks.A)}
          onTogglePlayPause={() => player.togglePlayPause()}
        />
      {/if}
    </div>
  {/if}
</main>
