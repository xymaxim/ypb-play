<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";

  interface Props {
    onStreamStart: () => void;
  }

  let { onStreamStart }: Props = $props();

  let inputEl = $state<HTMLInputElement | null>(null);
  let inputValue = $state("");
  let focused = $state(false);
  let loading = $state(false);
  let error = $state(false);

  const displayValue = $derived(
    focused
      ? (inputValue ? (inputValue.startsWith('https://') ? inputValue : `https://${inputValue}`) : '')
      : inputValue.replace(/^https?:\/\//, '')
  );

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

    function getNormalizedUrl(videoId: string): string {
        return `youtube.com/live/${videoId}`
    }

  async function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    const videoId = extractVideoId(inputValue);
    if (!videoId) {
      error = true;
      return;
    }
    error = false;
    loading = true;
    inputValue = getNormalizedUrl(videoId);
    try {
      onStreamStart(videoId);
    } catch (err) {
      console.error("Failed to start stream:", err);
      error = true;
    } finally {
      loading = false;
    }
  }
</script>

<div class="mb-1 flex items-center justify-center gap-2">
  <Input
    bind:ref={inputEl}
    value={displayValue}
    type="text"
    placeholder="Paste YouTube live stream link"
    disabled={loading}
    class="h-8 rounded-lg border px-3 text-sm font-medium transition-[width] duration-200 outline-none hover:bg-neutral-300/70
         {focused ? 'w-full bg-white! shadow-md' : 'w-80 bg-neutral-200'}"
    aria-invalid={error}
    onfocus={() => {
      focused = true;
      setTimeout(() => inputEl?.select(), 200);
    }}
    onblur={() => {
      focused = false;
    }}
    onkeydown={onKeyDown}
    oninput={(e: Event) => {
      inputValue = (e.target as HTMLInputElement).value;
    }}
  />
</div>
