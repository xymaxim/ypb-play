import {
  MediaPlayer,
  Debug,
  type DvrWindow,
  type MediaPlayerClass,
} from "dashjs";
import { GetPlaybackPort } from "../../bindings/rewyt/services/streamservice";

export interface StreamInfo {
  id: string;
  title: string;
  channelTitle: string;
  channelId: string;
  actualStartTime: Date;
}

const playbackPort = await GetPlaybackPort();

const dashSettings = {
  streaming: {
    delay: {
      // Use liveDelay setting instead
      useSuggestedPresentationDelay: false,
      // Stay behind live edge
      liveDelay: 10,
    },
    liveCatchup: {
      // Don't auto-speed-up to chase live edge
      enabled: false,
    },
    utcSynchronization: {
      // Our manifests have reliable timestamps already
      enabled: false,
    },
    timeShiftBuffer: {
      // Avoids DVR window drift between manifest refreshes
      calcFromSegmentTimeline: true,
    },
  },
};

// Our media segments are self-initializing, so skip separate init fetch.
function skipInitSegments(e: { data?: any }) {
  const manifest = e.data;
  if (!manifest) return;
  (manifest.Period ?? []).forEach((period: any) => {
    (period.AdaptationSet ?? []).forEach((as: any) => {
      (as.Representation ?? []).forEach((rep: any) => {
        if (rep.SegmentTemplate) {
          rep.SegmentTemplate.initialization =
            "data:application/octet-stream;base64,";
        }
      });
    });
  });
}

export function clampSeekTarget(
  target: number,
  dashPlayer: MediaPlayerClass | null,
  dvrWindow: DvrWindow | null,
): number {
  if (!dashPlayer || !dvrWindow) return Math.max(0, target);
  return Math.min(
    Math.max(dvrWindow.start, target),
    // No margin here: liveDelay already keeps seeks off the live edge.
    dvrWindow.end,
  );
}

export function createPlayer(getVideoEl: () => HTMLVideoElement | null) {
  let dashPlayer: MediaPlayerClass | null = null;
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
  let rewindError = $state<string | null>(null);

  // Playback
  function tick() {
    const videoEl = getVideoEl();
    if (dashPlayer && mpdStartTime && videoEl) {
      const currentMs = mpdStartTime.getTime() + videoEl.currentTime * 1000;
      playheadTime = new Date(currentMs);

      if (videoEl.seekable.length > 0) {
        const newStart =
          mpdStartTime.getTime() + videoEl.seekable.start(0) * 1000;
        const newEnd = mpdStartTime.getTime() + videoEl.seekable.end(0) * 1000;

        const hasStartShifted =
          !seekableRange || Math.abs(seekableRange.start - newStart) > 1000;
        const hasEndShifted =
          !seekableRange || Math.abs(seekableRange.end - newEnd) > 1000;

        if (hasStartShifted || hasEndShifted) {
          seekableRange = { start: newStart, end: newEnd };
        }
      }
    }
    animFrameId = requestAnimationFrame(tick);
  }

  // Manifest helpers
  function buildMpdUrl(interval: string): string {
    return `http://localhost:${playbackPort}/mpd/${encodeURIComponent(interval)}`;
  }

  async function fetchManifestMetadata(url: string): Promise<void> {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `Server responded with ${response.status}`);
    }
    const json = await response.json();
    if (!json?.metadata) throw new Error("Invalid MPD response");

    mpdStartTime = new Date(json.metadata.startActualTime);
    isMpdLoaded = true;
  }

  // Lifecycle
  async function init() {
    const response = await fetch(`http://localhost:${playbackPort}/info`);
    const json = await response.json();
    streamInfo = {
      id: json.id,
      title: json.title,
      channelTitle: json.channelTitle,
      channelId: json.channelId,
      actualStartTime: new Date(json.actualStartTime),
    };

    const videoEl = getVideoEl();
    if (!videoEl) return;

    dashPlayer = MediaPlayer().create();
    dashPlayer.updateSettings(dashSettings);
    dashPlayer.on(MediaPlayer.events.ERROR, (e) =>
      console.error("dash.js error:", e.error),
    );
    dashPlayer.on(MediaPlayer.events.MANIFEST_LOADED, skipInitSegments);

    const url = buildMpdUrl("now");
    await fetchManifestMetadata(url);
    dashPlayer.initialize(videoEl, url, true, 0);

    animFrameId = requestAnimationFrame(tick);
    videoEl.addEventListener("timeupdate", onTimeUpdate);
  }

  async function destroy() {
    cancelAnimationFrame(animFrameId);
    getVideoEl()?.removeEventListener("timeupdate", onTimeUpdate);
    dashPlayer?.destroy();
    dashPlayer = null;
  }

  function loadManifest(uri: string): Promise<boolean> {
    const videoEl = getVideoEl();
    if (!dashPlayer || !videoEl) return;
    dashPlayer.reset();
    dashPlayer.updateSettings(dashSettings);
    dashPlayer.attachView(videoEl);
    dashPlayer.attachSource(uri, 0);
  }

  // Playback controls
  async function rewind(isoTime: string, pause = false): Promise<boolean> {
    const videoEl = getVideoEl();

    isRewinding = true;
    lastRewindTarget = new Date(isoTime).getTime();
    rewindError = null;
    videoEl?.pause();

    try {
      const url = buildMpdUrl(isoTime);
      await fetchManifestMetadata(url);
      loadManifest(url);
      if (videoEl) pause ? videoEl.pause() : videoEl.play();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Rewind failed:", message);
      videoEl?.pause();
      mpdStartTime = null;
      playheadTime = null;
      seekableRange = null;
      rewindError = message;
      lastRewindTarget = null; // allow retry
      return false;
    } finally {
      isRewinding = false;
    }
  }

  async function rewindToLive(pause = false): Promise<boolean> {
    isRewinding = true;
    rewindError = null;
    getVideoEl()?.pause();
    try {
      const url = buildMpdUrl("now");
      await fetchManifestMetadata(url);
      loadManifest(url);
      lastRewindTarget = mpdStartTime?.getTime() ?? null;
      const videoEl = getVideoEl();
      if (videoEl) pause ? videoEl.pause() : videoEl.play();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Rewind to live failed:", message);
      getVideoEl()?.pause();
      mpdStartTime = null;
      playheadTime = null;
      seekableRange = null;
      rewindError = message;
      lastRewindTarget = null;
      return false;
    } finally {
      isRewinding = false;
    }
  }

  function seekTo(time: number, pause = false) {
    const videoEl = getVideoEl();
    if (!videoEl || !mpdStartTime || !dashPlayer) return;
    dashPlayer.seekToPresentationTime((time - mpdStartTime.getTime()) / 1000);
    if (pause) videoEl.pause();
  }

  async function replay() {
    const videoEl = getVideoEl();
    if (!videoEl || !dashPlayer) return;
    dashPlayer.seekToPresentationTime(0);
    videoEl.play();
  }

  function step(seconds: number) {
    const videoEl = getVideoEl();
    if (!videoEl || !dashPlayer) return;
    dashPlayer.seekToPresentationTime(
      clampSeekTarget(
        videoEl.currentTime + seconds,
        dashPlayer,
        dashPlayer.getDvrWindow() ?? null,
      ),
    );
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

  function clearRewindError() {
    rewindError = null;
  }

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
    get rewindError() {
      return rewindError;
    },
    get dashPlayer() {
      return dashPlayer;
    },

    init,
    destroy,

    loadManifest,

    rewind,
    rewindToLive,
    seekTo,
    replay,
    step,
    togglePlayPause,
    captureScreenshot,
    clearRewindError,

    playInterval,
    stopInterval,
  };
}

export type Player = ReturnType<typeof createPlayer>;
