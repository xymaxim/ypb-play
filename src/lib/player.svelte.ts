import shaka from "shaka-player/dist/shaka-player.ui";
import "shaka-player/dist/controls.css";

export interface StreamInfo {
  id: string;
  title: string;
  channelTitle: string;
  channelId: string;
  actualStartTime: Date;
}

const PLAYER_CONFIG = {
  streaming: {
    bufferingGoal: 30,
    rebufferingGoal: 10,
    bufferBehind: 30,
  },
  manifest: {
    disableAudio: true,
  },
};

export function createPlayer(getVideoEl: () => HTMLVideoElement | null) {
  let shakaPlayer: shaka.Player | null = null;
  let cachedManifest: { uri: string; data: Uint8Array } | null = null;
  let animFrameId: number;

  // State
  let isRewinding = $state(false);
  let mpdStartTime = $state<Date | null>(null);
  let isMpdLoaded = $state(false);
  let seekableRange = $state<{ start: number; end: number } | null>(null);
  let playheadTime = $state<Date | null>(null);
  let streamInfo = $state<StreamInfo | null>(null);
  let isPlayingInterval = $state(false);
  let intervalStopTime = $state<number | null>(null);
  let lastRewindTarget = $state<number | null>(null);

  // Playback
  function tick() {
    const videoEl = getVideoEl();
    if (shakaPlayer && mpdStartTime && videoEl) {
      const currentMs = mpdStartTime.getTime() + videoEl.currentTime * 1000;
      playheadTime = new Date(currentMs);
      if (shakaPlayer.seekRange) {
        const sr = shakaPlayer.seekRange();
        const newStart = mpdStartTime.getTime() + sr.start * 1000;
        const newEnd = mpdStartTime.getTime() + sr.end * 1000;
        if (
          seekableRange?.start !== newStart ||
          seekableRange?.end !== newEnd
        ) {
          seekableRange = { start: newStart, end: newEnd };
        }
      }
    }
    animFrameId = requestAnimationFrame(tick);
  }

  // Manifest helpers
  function rewriteManifestBaseUrl(mpd: string): string {
    const match = mpd.match(/<BaseURL>(.*?)<\/BaseURL>/);
    if (!match) return mpd;
    return mpd.replaceAll(match[1], `${window.location.origin}/`);
  }

  function registerSchemes() {
    shaka.net.NetworkingEngine.registerScheme(
      "live",
      (uri: string, request: shaka.extern.Request) => {
        if (cachedManifest?.uri === uri) {
          return shaka.util.AbortableOperation.notAbortable(
            Promise.resolve({
              uri,
              originalUri: uri,
              originalRequest: request,
              data: cachedManifest.data,
              headers: { "content-type": "application/dash+xml" },
            }),
          );
        }

        const promise = fetch(uri.replace("live://", ""), {
          headers: { Accept: "application/json" },
        })
          .then((r) => r.json())
          .then((json) => {
            if (!json.metadata) throw new Error("Invalid MPD response");
            mpdStartTime = new Date(json.metadata.startActualTime);
            isMpdLoaded = true;
            if (streamInfo && json.metadata.videoTitle) {
              streamInfo = { ...streamInfo, title: json.metadata.videoTitle };
            }
            const data = new TextEncoder().encode(
              rewriteManifestBaseUrl(json.mpd),
            );
            cachedManifest = { uri, data };
            return {
              uri,
              originalUri: uri,
              originalRequest: request,
              data,
              headers: { "content-type": "application/dash+xml" },
            };
          });

        return shaka.util.AbortableOperation.notAbortable(promise);
      },
    );
  }

  // Lifecycle
  async function init() {
    const response = await fetch("/info");
    const json = await response.json();
    streamInfo = {
      id: json.id,
      title: json.title,
      channelTitle: json.channelTitle,
      channelId: json.channelId,
      actualStartTime: new Date(json.actualStartTime),
    };

    shaka.polyfill.installAll();
    if (!shaka.Player.isBrowserSupported()) {
      console.error("Browser not supported");
      return;
    }

    registerSchemes();

    shakaPlayer = new shaka.Player();
    shakaPlayer.addEventListener("error", ({ detail }: any) =>
      console.error("Shaka error:", detail),
    );

    const videoEl = getVideoEl();
    if (!videoEl) return;

    await shakaPlayer.attach(videoEl);

    const ui = new shaka.ui.Overlay(
      shakaPlayer,
      videoEl.parentElement!,
      videoEl,
    );
    ui.configure({
      controlPanelElements: [
        "play_pause",
        "spacer",
        "mute",
        "fullscreen",
        "quality",
      ],
    });

    shakaPlayer.configure(PLAYER_CONFIG);
    await shakaPlayer.load("live:///mpd/now");

    animFrameId = requestAnimationFrame(tick);
    videoEl.addEventListener("timeupdate", onTimeUpdate);
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    getVideoEl()?.removeEventListener("timeupdate", onTimeUpdate);
    shakaPlayer?.destroy();
  }

  // Playback controls
  async function rewind(isoTime: string, pause = false) {
    isRewinding = true;
    lastRewindTarget = new Date(isoTime).getTime();

    try {
      const uri = `live:///mpd/${encodeURIComponent(isoTime)}`;
      await shakaPlayer?.load(uri);
      const videoEl = getVideoEl();
      if (!videoEl) return;
      pause ? videoEl.pause() : videoEl.play();
    } catch (err) {
      console.error("Rewind failed:", err);
      lastRewindTarget = null; // allow retry
    } finally {
      isRewinding = false;
    }
  }

  async function rewindToLive(pause = false) {
    isRewinding = true;
    cachedManifest = null;
    try {
      await shakaPlayer?.load("live:///mpd/now", 0).catch(console.error);
      lastRewindTarget = mpdStartTime?.getTime() ?? null;
      console.log("lastRewindtarget", lastRewindTarget);
      const videoEl = getVideoEl();
      if (!videoEl) return;
      pause ? videoEl.pause() : videoEl.play();
    } catch (err) {
      console.error("Rewind to live failed:", err);
      lastRewindTarget = null;
    } finally {
      isRewinding = false;
    }
  }

  function seekTo(time: number, pause = false) {
    const videoEl = getVideoEl();
    if (!videoEl || !mpdStartTime) return;
    videoEl.currentTime = (time - mpdStartTime.getTime()) / 1000;
    if (pause) videoEl.pause();
  }

  async function replay() {
    if (!shakaPlayer || !cachedManifest) return;
    await shakaPlayer.load(cachedManifest.uri, 0).catch(console.error);
    getVideoEl()?.play();
  }

  function step(seconds: number) {
    const videoEl = getVideoEl();
    if (!videoEl) return;
    videoEl.currentTime = Math.max(0, videoEl.currentTime + seconds);
  }

  function togglePlayPause() {
    const videoEl = getVideoEl();
    if (!videoEl) return;
    videoEl.paused ? videoEl.play() : videoEl.pause();
  }

  function captureScreenshot(): string | null {
    const videoEl = getVideoEl();
    if (!videoEl || !playheadTime || !streamInfo) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    canvas.getContext("2d")!.drawImage(videoEl, 0, 0);
    return canvas.toDataURL("image/png");
  }

  // Interval playback
  async function playInterval(a: number, b: number) {
    isPlayingInterval = true;
    intervalStopTime = b;
    await rewind(new Date(a).toISOString());
  }

  function stopInterval(markATime: number | null = null) {
    isPlayingInterval = false;
    intervalStopTime = null;
    getVideoEl()?.pause();
    if (markATime !== null) seekTo(markATime, true);
  }

  const onTimeUpdate = () => {
    if (!isPlayingInterval || !intervalStopTime || !mpdStartTime) return;
    const videoEl = getVideoEl();
    if (!videoEl) return;
    const currentMs = mpdStartTime.getTime() + videoEl.currentTime * 1000;
    if (currentMs >= intervalStopTime) {
      videoEl.dispatchEvent(new CustomEvent("interval-end"));
    }
  };

  return {
    get isRewinding() {
      return isRewinding;
    },
    get mpdStartTime() {
      return mpdStartTime;
    },
    get isMpdLoaded() {
      return isMpdLoaded;
    },
    get seekableRange() {
      return seekableRange;
    },
    get playheadTime() {
      return playheadTime;
    },
    get streamInfo() {
      return streamInfo;
    },
    get isPlayingInterval() {
      return isPlayingInterval;
    },
    get lastRewindTarget() {
      return lastRewindTarget;
    },

    init,
    destroy,

    rewind,
    rewindToLive,
    seekTo,
    replay,
    step,
    togglePlayPause,
    captureScreenshot,

    playInterval,
    stopInterval,
  };
}

export type Player = ReturnType<typeof createPlayer>;
