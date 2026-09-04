<script lang="ts">
  import {
    Pause,
    Play,
    Maximize,
    Minimize,
    Volume2,
    VolumeOff,
    Proportions,
    ListVideo,
    Camera,
  } from "lucide-svelte";
  import { Slider } from "bits-ui";
  import {
    MediaPlayer,
    type MediaInfo,
    type MediaPlayerClass,
    type Representation,
  } from "dashjs";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { clampSeekTarget } from "$lib/player.svelte";
  import ActionButton from "./ActionButton.svelte";

  interface Props {
    videoEl: HTMLVideoElement | null;
    stageEl: HTMLElement | null;
    dashPlayer: MediaPlayerClass | null;
    isAtLiveEdge: boolean;
    onTogglePlayPause: () => void;
    onScreenshot: () => void | Promise<void>;
    onRewindToLive: () => void;
  }

  let {
    videoEl,
    stageEl,
    dashPlayer,
    onTogglePlayPause,
    onScreenshot,
    onRewindToLive,
    isAtLiveEdge,
  }: Props = $props();

  // Playback state
  let isPlaying = $state(false);
  let currentTime = $state(0);
  let duration = $state(1);

  // Seek/buffering state
  let bufferedPercent = $state(0);
  let seekValue = $state(0);
  let dragging = $state(false);

  // Volume state
  let isMuted = $state(true);

  // Fullscreen state
  let isFullscreen = $state(false);

  // Track/quality menu state
  type TrackType = "audio" | "video";

  interface MenuOption {
    id: string;
    label: string;
  }

  interface MenuSection {
    type: TrackType;
    selected: string;
    options: MenuOption[];
  }

  let qualitySections = $state<MenuSection[]>([]);
  let trackSections = $state<MenuSection[]>([]);
  let qualityOpen = $state(false);
  let trackOpen = $state(false);

  // Derived values
  const elapsed = $derived(formatElapsed(currentTime));

  // Formatting helpers
  function formatElapsed(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  }

  // Playback event handlers
  function onPlay() {
    isPlaying = true;
  }

  function onPause() {
    isPlaying = false;
  }

  function onTimeUpdate() {
    updateSeekbar();
  }

  function updateSeekbar() {
    if (!videoEl) return;
    currentTime = videoEl.currentTime;
    if (!dashPlayer) return;

    const position = dashPlayer.timeInDvrWindow() ?? videoEl.currentTime;
    if (!dragging) seekValue = position;

    const d = dashPlayer.duration();
    if (Number.isFinite(d) && d > 0) duration = d;
    else if (videoEl.seekable.length > 0) duration = videoEl.seekable.end(0);

    const buffer =
      dashPlayer.getDashMetrics()?.getCurrentBufferLevel("video") ?? 0;
    bufferedPercent =
      duration > 0 ? Math.min(((position + buffer) / duration) * 100, 100) : 0;
  }

  function onSeekCommit(value: number) {
    dragging = false;
    if (!dashPlayer || !videoEl) return;
    const dvr = dashPlayer.getDvrWindow();
    if (!dvr) {
      dashPlayer.seek(value);
      return;
    }
    videoEl.currentTime = clampSeekTarget(dvr.start + value, dashPlayer, dvr);
  }

  // Volume handlers
  function onVolumeChange() {
    if (videoEl) isMuted = videoEl.muted;
  }

  function toggleMute() {
    if (!videoEl) return;
    videoEl.muted = !videoEl.muted;
    isMuted = videoEl.muted;
  }

  // Fullscreen handlers
  function onFullscreenChange() {
    isFullscreen = !!stageEl && document.fullscreenElement === stageEl;
  }

  function toggleFullscreen() {
    if (!stageEl) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      stageEl.requestFullscreen().catch(() => {});
    }
  }

  // Track/quality menu helpers
  function formatQualityLabel(rep: Representation, type: TrackType): string {
    if (type === "video") {
      const height = rep.height;
      if (!Number.isFinite(height) || height <= 0) return "";
      const frameRate = rep.frameRate;
      const fpsSuffix =
        Number.isFinite(frameRate) && Math.round(frameRate) !== 30
          ? String(Math.round(frameRate))
          : "";
      return `${Math.round(height)}p${fpsSuffix}`;
    }
    const bandwidth = rep.bandwidth;
    if (!Number.isFinite(bandwidth) || bandwidth <= 0) return "";
    return `${Math.round(bandwidth / 1000)} kbps`;
  }

  function trackKey(track: MediaInfo): string {
    return [
      track.id,
      track.lang,
      (track.viewpoint ?? []).map((d) => d.value).join(","),
      (track.roles ?? []).map((d) => d.value).join(","),
      (track.accessibility ?? []).map((d) => d.value).join(","),
      (track.audioChannelConfiguration ?? []).map((d) => d.value).join(","),
    ].join("|");
  }

  function formatTrackLabel(track: MediaInfo, type: TrackType): string {
    const codec = track.codec?.match(/;codecs="([^"]+)"/)?.[1];
    return codec
      ? `${track.mimeType ?? ""} (${codec})`
      : (track.codec ?? "unknown");
  }

  function refreshMenus(player: MediaPlayerClass) {
    try {
      const settings = player.getSettings();

      qualitySections = (["video", "audio"] as TrackType[]).map((type) => {
        const reps = player.getRepresentationsByType(type);
        const auto =
          settings?.streaming?.abr?.autoSwitchBitrate?.[type] !== false;
        const currentRep = player.getCurrentRepresentationForType(type);
        return {
          type,
          selected: auto ? "auto" : (currentRep?.id ?? "auto"),
          options: reps.map((rep) => ({
            id: rep.id,
            label: formatQualityLabel(rep, type),
          })),
        };
      });

      trackSections = (["audio", "video"] as TrackType[]).map((type) => {
        const tracks = player.getTracksFor(type);
        const current = player.getCurrentTrackFor(type);
        return {
          type,
          selected: current ? trackKey(current) : "",
          options: tracks.map((track) => ({
            id: trackKey(track),
            label: formatTrackLabel(track, type),
          })),
        };
      });
    } catch (err) {
      console.debug("[PlayerControls] refreshMenus skipped:", err);
    }
  }

  function onQualityChange(type: TrackType, value: string) {
    const player = dashPlayer;
    if (!player) return;

    if (value === "auto") {
      player.updateSettings({
        streaming: { abr: { autoSwitchBitrate: { [type]: true } } },
      });
    } else {
      player.updateSettings({
        streaming: { abr: { autoSwitchBitrate: { [type]: false } } },
      });
      const reps = player.getRepresentationsByType(type);
      const idx = reps.findIndex((rep) => rep.id === value);
      if (idx >= 0) player.setRepresentationForTypeByIndex(type, idx, false);
    }
    refreshMenus(player);
  }

  function onTrackChange(type: TrackType, value: string) {
    const player = dashPlayer;
    if (!player) return;

    const track = player.getTracksFor(type).find((t) => trackKey(t) === value);
    if (track) player.setCurrentTrack(track);
    refreshMenus(player);
  }

  // Effects
  $effect(() => {
    const el = videoEl;
    if (!el) return;
    isPlaying = !el.paused;
    currentTime = el.currentTime;
    isMuted = el.muted;
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("volumechange", onVolumeChange);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("volumechange", onVolumeChange);
    };
  });

  $effect(() => {
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  });

  $effect(() => {
    const player = dashPlayer;
    if (!player) return;

    const refresh = () => refreshMenus(player);
    refresh();
    const events = [
      MediaPlayer.events.STREAM_ACTIVATED,
      MediaPlayer.events.STREAM_INITIALIZED,
      MediaPlayer.events.MANIFEST_LOADED,
      MediaPlayer.events.TRACK_CHANGE_RENDERED,
    ];
    events.forEach((evt) => player.on(evt, refresh));
    return () => events.forEach((evt) => player.off(evt, refresh));
  });
</script>

<div
  class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
  class:opacity-100={qualityOpen || trackOpen}
>
  <button
    type="button"
    title={isPlaying ? "Pause" : "Play"}
    class="pointer-events-auto flex size-20 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/50 active:bg-black/40"
    onclick={onTogglePlayPause}
  >
    {#if isPlaying}
      <Pause size={38} class="fill-current" />
    {:else}
      <Play size={38} class="fill-current" />
    {/if}
  </button>

  <div
    class="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-6 pt-8"
  >
    <Slider.Root
      type="single"
      bind:value={seekValue}
      min={0}
      max={duration}
      step={0.1}
      onpointerdown={() => (dragging = true)}
      onValueCommit={(v) => onSeekCommit(v)}
      class="relative flex w-full touch-none items-center select-none"
    >
      <span
        class="relative h-1.5 w-full grow cursor-pointer overflow-hidden rounded-full bg-white/25"
      >
        <span
          class="absolute inset-y-0 left-0 bg-white/40"
          style="width: {bufferedPercent}%"
        ></span>
        <Slider.Range class="absolute inset-y-0 bg-white" />
      </span>
      <Slider.Thumb
        index={0}
        class="size-3 cursor-grab rounded-full bg-white shadow outline-none active:cursor-grabbing"
      ></Slider.Thumb>
    </Slider.Root>

    <div class="flex items-center justify-between gap-2 pt-2 pb-2">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-white tabular-nums"
          >{elapsed}</span
        >
        <button
          type="button"
          class="pointer-events-auto px-2 py-0.5 text-sm font-semibold transition-colors {isAtLiveEdge
            ? 'pointer-events-none text-[var(--color-play-950)]'
            : 'text-neutral-400 hover:text-white'}"
          onclick={() => {
            if (!isAtLiveEdge) onRewindToLive();
          }}
        >
          Live
        </button>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          title={isMuted ? "Unmute" : "Mute"}
          class="pointer-events-auto flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/25"
          onclick={toggleMute}
        >
          {#if isMuted}
            <VolumeOff size={22} strokeWidth={2} />
          {:else}
            <Volume2 size={22} strokeWidth={2} />
          {/if}
        </button>
        <ActionButton
          variant="ghost"
          size="icon-lg"
          title="Take screenshot"
          notification={{ message: "Screenshot saved" }}
          action={onScreenshot}
          class="pointer-events-auto size-10 text-white hover:bg-white/25 hover:text-white"
        >
          <Camera class="size-[22px]" />
        </ActionButton>
        <DropdownMenu.Root
          open={qualityOpen}
          onOpenChange={(open) => {
            qualityOpen = open;
            if (open && dashPlayer) refreshMenus(dashPlayer);
          }}
        >
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <button
                type="button"
                title="Quality"
                {...props}
                class="pointer-events-auto flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/25"
              >
                <Proportions size={22} strokeWidth={2} />
              </button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            align="end"
            side="top"
            class="z-[1000] max-h-[400px]"
            portalProps={{ disabled: isFullscreen }}
          >
            {#each qualitySections as section, i (i)}
              {#if section.options.length > 0}
                {#if i > 0}<DropdownMenu.Separator />{/if}
                <DropdownMenu.Group>
                  <DropdownMenu.Label
                    class="text-xs font-medium text-muted-foreground"
                    >{section.type.charAt(0).toUpperCase() +
                      section.type.slice(1)}</DropdownMenu.Label
                  >
                  <DropdownMenu.RadioGroup
                    value={section.selected}
                    onValueChange={(v) => onQualityChange(section.type, v)}
                  >
                    <DropdownMenu.RadioItem value="auto" class="cursor-pointer">
                      Auto
                    </DropdownMenu.RadioItem>
                    {#each section.options as opt (opt.id)}
                      <DropdownMenu.RadioItem
                        value={opt.id}
                        class="cursor-pointer"
                      >
                        {opt.label}
                      </DropdownMenu.RadioItem>
                    {/each}
                  </DropdownMenu.RadioGroup>
                </DropdownMenu.Group>
              {/if}
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <DropdownMenu.Root
          open={trackOpen}
          onOpenChange={(open) => {
            trackOpen = open;
            if (open && dashPlayer) refreshMenus(dashPlayer);
          }}
        >
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <button
                type="button"
                title="Tracks"
                {...props}
                class="pointer-events-auto flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/25"
              >
                <ListVideo size={22} strokeWidth={2} />
              </button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            align="end"
            side="top"
            class="z-[1000] max-h-[300px]"
            portalProps={{ disabled: isFullscreen }}
          >
            {#each trackSections as section, i (i)}
              {#if section.options.length > 0}
                {#if i > 0}<DropdownMenu.Separator />{/if}
                <DropdownMenu.Group>
                  <DropdownMenu.Label
                    class="text-xs font-medium text-muted-foreground"
                    >{section.type.charAt(0).toUpperCase() +
                      section.type.slice(1)}</DropdownMenu.Label
                  >
                  <DropdownMenu.RadioGroup
                    value={section.selected}
                    onValueChange={(v) => onTrackChange(section.type, v)}
                  >
                    {#each section.options as opt (opt.id)}
                      <DropdownMenu.RadioItem
                        value={opt.id}
                        class="cursor-pointer"
                      >
                        {opt.label}
                      </DropdownMenu.RadioItem>
                    {/each}
                  </DropdownMenu.RadioGroup>
                </DropdownMenu.Group>
              {/if}
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <button
          type="button"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          class="pointer-events-auto flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/25"
          onclick={toggleFullscreen}
        >
          {#if isFullscreen}
            <Minimize size={22} strokeWidth={2} />
          {:else}
            <Maximize size={22} strokeWidth={2} />
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>
