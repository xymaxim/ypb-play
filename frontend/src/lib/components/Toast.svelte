<script lang="ts">
  import type { ToastIcon } from "../toast.svelte";

  interface Props {
    message: string;
    icon?: ToastIcon | null;
  }

  const { message, icon = null }: Props = $props();
</script>

<div
  class="pointer-events-none absolute top-2 left-1/2 z-20 -translate-x-1/2 animate-in fade-in slide-in-from-top-2"
>
  <div
    class="flex items-center gap-2 rounded-full bg-[var(--color-selected-darkest)] p-4 text-sm font-medium text-white shadow-md"
  >
    {#if icon}
      {@const IconComp = icon}
      <IconComp size={16} />
    {/if}
    {message}
  </div>
</div>

<style>
  @reference "tailwindcss";

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slide-in-from-top-2 {
    from {
      transform: translateY(-8px);
    }
    to {
      transform: translateY(0);
    }
  }

  .animate-in {
    animation:
      fade-in 200ms ease,
      slide-in-from-top-2 200ms ease;
  }
</style>
