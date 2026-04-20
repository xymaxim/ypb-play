<script lang="ts">
 import WelcomePanneau from "$lib/components/WelcomePanneau.svelte";
 import WordRotator from "$lib/components/WordRotator.svelte";

 interface Props {
     hiding: boolean;
 }

 let { hiding }: Props = $props();

 const collapseDuration = 600;

 let hidden = $state(false);

 let containerEl = $state<HTMLDivElement>();
 let wordsEl = $state<HTMLDivElement>();

 $effect(() => {
     if (!hiding) {
         hidden = false;
         if (wordsEl) {
             const spans = Array.from(wordsEl.querySelectorAll("span"));
             spans.forEach((span) => {
                 span.classList.remove("flying");
                 span.style.removeProperty("--dx");
                 span.style.removeProperty("--dy");
                 span.style.visibility = "";
             });
         }
         return;
     }

     if (hidden) return;

     flyOutWords();
     const timer = setTimeout(() => {
         hidden = true;
     }, collapseDuration);

     return () => clearTimeout(timer);
 });

 function flyOutWords() {
     if (!wordsEl || !containerEl) return;

     const containerRect = containerEl.getBoundingClientRect();
     const cx = containerRect.left + containerRect.width / 2;
     const cy = containerRect.top + containerRect.height / 2;

     const spans = Array.from(wordsEl.querySelectorAll("span"));
     spans.forEach((span) => {
         const rect = span.getBoundingClientRect();
         const sx = rect.left + rect.width / 2;
         const sy = rect.top + rect.height / 2;
         const dx = (sx - cx) * 2;
         const dy = (sy - cy) * 2;

         span.addEventListener(
             "animationend",
             () => {
                 span.style.visibility = "hidden";
             },
             { once: true },
         );

         span.style.setProperty("--dx", `${dx}px`);
         span.style.setProperty("--dy", `${dy}px`);
         span.classList.add("flying");
     });
 }
</script>

<div class="relative flex w-full flex-col items-center justify-center pointer-events-auto" class:hidden>
  <div bind:this={containerEl} class="w-full h-full overflow-hidden">
    <WelcomePanneau collapsing={hiding} />
  </div>

  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      bind:this={wordsEl}
      class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-0 text-[4rem] font-light tracking-tighter text-foreground pointer-events-none"
      style="--flying-duration: {collapseDuration}ms"
    >
      <WordRotator text="Rewind & play" class="gap-6" />
      <p class="flex gap-6">
          <WordRotator text="YouTube" class="font-semibold" />
          <WordRotator text="live streams" class="gap-6" />
      </p>
    </div>
  </div>
</div>

<style>
 :global(.words span) { display: inline-block; }

 @keyframes fly-out {
     from { transform: translate(0,0); opacity: 1; }
     to   { transform: translate(var(--dx), var(--dy)); opacity: 0; }
 }

 :global(.flying) {
     animation: fly-out var(--flying-duration) ease-in forwards;
 }
</style>
