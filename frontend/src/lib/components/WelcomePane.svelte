<script lang="ts">
  import WelcomePanneau from "$lib/components/WelcomePanneau.svelte";
</script>

<div
  class="relative flex h-full w-full flex-col rounded-2xl bg-[var(--color-selected-lighter)]"
>
  <div class="relative flex h-full w-full items-center justify-center">
    <WelcomePanneau debug={false} />
  </div>
  <div class="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-0 text-[3rem] font-light tracking-tighter text-foreground"
    >
      <p>Rewind, play, highlight</p>
    </div>
  </div>
</div>
