<script lang="ts">
  import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
  } from "$lib/components/ui/input-group/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import CopySimpleIcon from "phosphor-svelte/lib/CopySimpleIcon";
  import XIcon from "phosphor-svelte/lib/XIcon";

  interface Props {
    onStreamStart: () => void;
    streamTitle: string | null;
  }

  let { onStreamStart, streamTitle }: Props = $props();

  let inputEl = $state<HTMLInputElement | null>(null);
  let inputValue = $state("");
  let focused = $state(false);
  let loading = $state(false);
  let error = $state(false);

  function extractVideoId(input: string): string | null {
    const trimmed = input.trim();
    const patterns = [
      /(?:youtube\.com\/watch\?[^#]*v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  let currentVideoId = $state<string | null>(null);

  function getDisplayUrl(videoId: string): string {
    return `youtube.com/live/${videoId}`;
  }

  function getCanonicalUrl(videoId: string): string {
    return `https://www.youtube.com/live/${videoId}`;
  }

  const displayValue = $derived(
    focused ? "" : currentVideoId ? getDisplayUrl(currentVideoId) : "",
  );

  async function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    const videoId = extractVideoId(inputValue);
    if (!videoId) {
      error = true;
      return;
    }
    error = false;
    inputEl?.blur();
    focused = false;
    loading = true;
    currentVideoId = videoId;
    inputValue = getCanonicalUrl(videoId);
    try {
      onStreamStart(videoId);
    } catch (err) {
      console.error("Failed to start stream:", err);
      error = true;
    } finally {
      loading = false;
    }
  }

  function copyCurrentUrl() {
    if (currentVideoId)
      navigator.clipboard.writeText(getCanonicalUrl(currentVideoId));
  }
</script>

<div class="mb-1 flex items-center justify-center gap-2">
  <div class="relative {focused ? 'w-full' : 'w-80'}">
    <InputGroup
      class={focused
        ? "bg-white! shadow-md"
        : "bg-neutral-200 hover:bg-neutral-300/70"}
    >
      <InputGroupInput
        class="text-sm font-medium text-center"
        bind:ref={inputEl}
        value={displayValue}
        type="text"
        placeholder="Paste YouTube live stream link"
        disabled={loading}
        aria-invalid={error}
        onfocus={() => {
          focused = true;
        }}
        onblur={() => {
          focused = false;
          error = false;
        }}
        onkeydown={onKeyDown}
        oninput={(e: Event) => {
          inputValue = (e.target as HTMLInputElement).value;
        }}
      />
      {#if focused && currentVideoId}
        <InputGroupAddon align="inline-end">
          <Button
            variant="ghost"
            size="icon-sm"
            onclick={() => {
              inputEl?.blur();
              focused = false;
            }}
          >
            <XIcon />
          </Button>
        </InputGroupAddon>
      {/if}
    </InputGroup>
    {#if focused && currentVideoId}
      <div
        class="absolute top-full left-0 z-50 mt-1 flex w-full items-center gap-2 rounded-lg border bg-white p-2 shadow-md"
      >
        <div class="flex min-w-0 flex-1 flex-col">
          {#if streamTitle}
            <span
              class="truncate text-sm font-medium text-neutral-800"
              title={streamTitle}
            >
              {streamTitle}
            </span>
          {:else}
            <Skeleton class="h-4 w-3/4" />
          {/if}
          <span class="mt-0.5 truncate text-xs text-neutral-500">
            {getCanonicalUrl(currentVideoId)}
          </span>
        </div>
        <Button variant="ghost" size="icon-sm" onclick={copyCurrentUrl}>
          <CopySimpleIcon />
        </Button>
      </div>
    {/if}
  </div>
</div>
