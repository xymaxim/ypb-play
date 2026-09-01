<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import * as InputGroup from "$lib/components/ui/input-group";
  import { Button } from "$lib/components/ui/button";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Copy, Menu, X } from "lucide-svelte";
  import HotkeyModal from "./HotkeyModal.svelte";
  import { extractVideoId } from "$lib/utils/urlUtils";

  interface Props {
    onStreamStart: (videoId: string) => void;
    streamTitle: string | null;
    streamStatus: string;
    videoId: string | null;
    hasMissingDependencies?: boolean;
  }

  let {
    onStreamStart,
    streamTitle,
    streamStatus,
    videoId,
    hasMissingDependencies,
  }: Props = $props();

  let inputEl = $state<HTMLInputElement | null>(null);
  let inputValue = $state("");
  let focused = $state(false);
  let loading = $state(false);
  let error = $state(false);
  let currentVideoId = $state<string | null>(null);
  let showHotkeys = $state(false);

  // Effects
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

<div class="relative mb-1 flex items-center justify-center gap-2">
  <div class="relative {focused ? 'w-full' : 'w-100'}">
    <InputGroup.Root
      class="rounded-full! border-none {focused
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
        placeholder="Paste YouTube video link"
        disabled={loading ||
          streamStatus === "starting" ||
          hasMissingDependencies}
        title={hasMissingDependencies
          ? "Install missing tools to enable"
          : undefined}
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
        class="items-top absolute top-full left-0 z-50 mt-1 flex w-full rounded-2xl! border bg-white p-3 shadow-md"
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
        <Button
          variant="ghost"
          size="icon"
          title="Copy link"
          class="rounded-full"
          onmousedown={copyCurrentUrl}
        >
          <Copy />
        </Button>
      </div>
    {/if}
  </div>

  {#if !focused}
    <div class="absolute right-0">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            size="icon-lg"
            class="rounded-full hover:bg-neutral-200"
          >
            <Menu />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" class="w-50 text-base">
          <DropdownMenu.Item onSelect={() => (showHotkeys = true)}>
            Hotkeys
            <DropdownMenu.Shortcut>?</DropdownMenu.Shortcut>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  {/if}
</div>

<HotkeyModal bind:open={showHotkeys} />
