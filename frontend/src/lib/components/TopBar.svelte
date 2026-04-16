<script lang="ts">
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { Copy, X } from "lucide-svelte";
  import { extractVideoId } from "$lib/utils/urlUtils";

  interface Props {
    onStreamStart: (videoId: string) => void;
    streamTitle: string | null;
    streamStatus: string;
    videoId: string | null;
  }

  let { onStreamStart, streamTitle, streamStatus, videoId }: Props = $props();

  let inputEl = $state<HTMLInputElement | null>(null);
  let inputValue = $state("");
  let focused = $state(false);
  let loading = $state(false);
  let error = $state(false);
  let currentVideoId = $state<string | null>(null);

  $effect(() => {
    if (videoId && videoId !== currentVideoId) {
      currentVideoId = videoId;
      inputValue = getCanonicalUrl(videoId);
    }
    if (streamStatus === "idle") {
      currentVideoId = null;
      inputValue = "";
      loading = false;
      error = false;
    }
  });

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
  <div class="relative {focused ? 'w-full' : 'w-90'}">
    <InputGroup.Root
      class="border-none {focused
        ? 'bg-white! shadow-md'
        : currentVideoId
          ? 'bg-neutral-200 hover:bg-white'
          : 'bg-white'} focus-visible:ring-0!"
    >
      <InputGroup.Input
        bind:ref={inputEl}
        value={displayValue}
        class="text-center text-sm font-medium focus-visible:ring-0!"
        type="text"
        placeholder="Paste YouTube live stream link"
        disabled={loading || streamStatus === "starting"}
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
          error = false;
        }}
      />
      {#if focused}
        <InputGroup.Addon align="inline-end" class="absolute right-0">
          <Button
            variant="ghost"
            size="icon"
            class="rounded-full"
            title="Dismiss"
            onmousedown={() => {
              inputValue = "";
              inputEl.value = "";
              inputEl.blur();
            }}
          >
            <X />
          </Button>
        </InputGroup.Addon>
      {/if}
    </InputGroup.Root>
    {#if focused && currentVideoId}
      <div
        class="items-top absolute top-full left-0 z-50 mt-1 flex w-full rounded-lg border bg-white p-3 shadow-md"
      >
        <div class="flex min-w-0 flex-1 flex-col gap-0!">
          {#if streamTitle}
            <span
              class="truncate text-sm font-medium text-foreground"
              title={streamTitle}
            >
              {streamTitle}
            </span>
          {:else}
            <Skeleton class="h-4 w-3/4" />
          {/if}
          <span class="truncate text-sm text-muted-foreground">
            {getCanonicalUrl(currentVideoId)}
          </span>
        </div>
        <Button variant="ghost" size="icon-sm" onclick={copyCurrentUrl}>
          <Copy />
        </Button>
      </div>
    {/if}
  </div>
</div>
