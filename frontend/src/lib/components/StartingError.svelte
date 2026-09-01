<script lang="ts">
  import * as Alert from "$lib/components/ui/alert";
  import { Copy } from "lucide-svelte";
  import ActionButton from "./ActionButton.svelte";

  interface Props {
    error: unknown;
    stdout: string;
  }

  let { error, stdout }: Props = $props();

  let message = $derived.by(() => {
    const raw = (error as any).message;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.message) return parsed.message;
      } catch {}
    }
    return String(raw ?? error);
  });

  let copyText = $derived(stdout ? `${message}\n${stdout}` : `${message}`);

  function copyError() {
    return navigator.clipboard.writeText(copyText);
  }
</script>

<Alert.Root
  class="relative mt-2 min-w-[640px] gap-0 rounded-2xl border-0 bg-[var(--color-destructive)]/5"
>
  <Alert.Title class="mb-0 text-base text-[var(--color-destructive)]">
    Stream start failed
  </Alert.Title>
  <div class="absolute top-3 right-3">
    <ActionButton
      variant="ghost"
      size="icon-sm"
      title="Copy error"
      notification={{ message: "Copied" }}
      action={copyError}
    >
      <Copy />
    </ActionButton>
  </div>
  <Alert.Description
    class="mt-2 max-h-[calc(100vh-32rem)] overflow-y-auto text-sm text-primary"
  >
    <p class="text-sm [overflow-wrap:anywhere]">
      <span class="font-semibold">Error:</span>
      {message}
    </p>
    {#if stdout}
      <span class="font-semibold">Output:</span>
      <p class="[overflow-wrap:anywhere] whitespace-pre-wrap">{stdout}</p>
    {/if}
  </Alert.Description>
</Alert.Root>
