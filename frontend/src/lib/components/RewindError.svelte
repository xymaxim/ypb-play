<script lang="ts">
  import { Copy } from "lucide-svelte";
  import ActionButton from "./ActionButton.svelte";

  interface Props {
    error: string;
  }

  let { error }: Props = $props();

  function copyError() {
    return navigator.clipboard.writeText(error);
  }
</script>

<div
  class="items-left absolute inset-0 z-30 flex flex-col justify-center gap-3 rounded-lg bg-[#f4e2e0] px-10 text-center"
>
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
  <span class="text-xl font-semibold">Oops! Rewind failed</span>
  <p class="text-left text-base">Try rewinding again or choose another time.</p>
  <p
    class="max-h-50 overflow-y-auto text-left text-sm [overflow-wrap:anywhere]"
  >
    <span class="text-sm">Error:</span>
    {error}
  </p>
</div>
