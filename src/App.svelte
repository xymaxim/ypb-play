<script lang="ts">
  import { onMount } from "svelte";
  import { createExplorer, setExplorerContext } from "./lib/explorer.svelte";
  import { createPlayer } from "./lib/player.svelte";
  import { formatOffset } from "./lib/utils/dateTimeUtils";
  import ExplorerPane from "./lib/components/ExplorerPane.svelte";

  type KeyHandler = (e: KeyboardEvent) => void;

  const explorer = createExplorer({ depthDays: 7 });
  setExplorerContext(explorer);

  const player = createPlayer(() => videoEl);

  // State
  let videoEl = $state<HTMLVideoElement | null>(null);
  let now = $state(Date.now());

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
    const depth = 7 * 24 * 60 * 60 * 1000;
    explorer.setAvailableRange({
      start: Math.max(info.actualStartTime.getTime(), now - depth),
      end: now,
    });
  });

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

  function handleScreenshot(ts: number) {
    const dataUrl = player.captureScreenshot();
    if (!dataUrl || !player.streamInfo) return;
    const shifted = new Date(ts + explorer.timezoneOffset * 60 * 1000);
    const iso = shifted.toISOString().slice(0, 19).replace(/[:-]/g, "");
    const offset = formatOffset(explorer.timezoneOffset);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `Screenshot_${player.streamInfo.id}_${iso}${offset}.png`;
    a.click();
  }

  // Lifecycle
  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    videoEl?.addEventListener("interval-end", onIntervalEnd);
    player.init().catch(console.error);

    const nowInterval = setInterval(() => {
      now = Date.now();
    }, 1000);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      videoEl?.removeEventListener("interval-end", onIntervalEnd);
      player.destroy();
      clearInterval(nowInterval);
    };
  });
</script>

<main class="mx-auto flex w-full max-w-4xl min-w-2xl flex-col gap-2 px-6 py-3">
  <div
    class="flex min-h-[362px] w-full justify-center overflow-hidden rounded-lg bg-black"
  >
    <div
      data-shaka-player-container
      class="group relative flex w-full items-center justify-center"
    >
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
        data-shaka-player
        muted
      ></video>
    </div>
  </div>

  {#if player.streamInfo}
    <div
      class:opacity-50={explorer.isRewinding}
      class:pointer-events-none={explorer.isRewinding}
    >
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
    </div>
  {/if}
</main>
