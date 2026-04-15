<script lang="ts">
  import { ChevronDown, ChevronUp } from "lucide-svelte";
  import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
  } from "$lib/components/ui/collapsible";
  import * as Card from "$lib/components/ui/card";

  interface Props {
    onCancel: () => void;
    stdout: string;
    showLog: boolean;
  }

  let { onCancel, stdout, showLog }: Props = $props();
</script>

<Card.Root class="mt-2 gap-0 rounded-lg bg-[var(--background)]">
  <Card.Header>
    <Card.Title class="flex justify-between text-base">
      Start stream playback
      <a
        class="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-black transition-colors hover:text-muted-foreground"
        onclick={onCancel}
      >
        Cancel
      </a>
    </Card.Title>
  </Card.Header>
  <Card.Content class="pt-0">
    <Collapsible bind:open={showLog}>
      <div class="flex items-center justify-between text-sm">
        <CollapsibleTrigger
          class="flex items-center gap-2 text-muted-foreground"
        >
          <p class="animate-pulse">Running yt-dlp to fetch video info...</p>
          {#if showLog}<ChevronUp size={16} />{:else}<ChevronDown
              size={16}
            />{/if}
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        {#if stdout}
          <div
            class="mt-3 max-h-36 overflow-y-auto rounded-md bg-neutral-50 p-3 font-mono text-sm whitespace-pre-wrap text-muted-foreground"
          >
            {stdout}
          </div>
        {/if}
      </CollapsibleContent>
    </Collapsible>
  </Card.Content>
</Card.Root>
