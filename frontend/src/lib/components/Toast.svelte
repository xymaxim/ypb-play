<script lang="ts">
  interface Props {
    message: string;
  }

  const { message }: Props = $props();
</script>

<div
  class="pointer-events-none absolute top-2 left-1/2 z-20 -translate-x-1/2 animate-in duration-600 fade-in slide-in-from-top-2"
>
  <div
    class="rounded-full bg-black px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-[var(--border)]"
  >
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
