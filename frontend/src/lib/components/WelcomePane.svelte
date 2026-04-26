<script lang="ts">
  import { Play, Pause, Rewind } from "lucide-svelte";
  import WelcomePanneau from "$lib/components/WelcomePanneau.svelte";
  import { TiltProvider, WordTilt, ElementTilt } from "$lib/components/tilt";

  interface Props {
    hiding: boolean;
  }

  let { hiding }: Props = $props();

  const collapseDuration = 600;

  let hidden = $state(false);
  let playing = $state(false);

  let seed = $state(0);

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

<div
  class="pointer-events-auto relative flex w-full flex-col items-center justify-center"
  class:hidden
>
  <div bind:this={containerEl} class="h-full w-full overflow-hidden opacity-80">
    <WelcomePanneau {seed} collapsing={hiding} {playing} />
  </div>

  <div class="absolute inset-0 overflow-hidden">
    <div
      bind:this={wordsEl}
      class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-0 text-[3.75rem] font-light tracking-tighter text-foreground"
      style="--flying-duration: {collapseDuration}ms"
    >
      <TiltProvider
        min={-10}
        max={10}
        gap="gap-6"
        {seed}
        class="flex flex-col select-none"
      >
        <div class="flex justify-center gap-6">
          <ElementTilt>
            <span
              class="pointer-events-auto flex cursor-pointer items-center gap-1 leading-none transition select-none hover:scale-105 active:scale-95"
              onclick={() => seed++}
            >
              <Rewind size={40} /> Rewind
            </span>
          </ElementTilt>
          <WordTilt text="&" />
          <ElementTilt>
            <span
              class="pointer-events-auto flex cursor-pointer items-center gap-1 leading-none transition select-none hover:scale-105 active:scale-95"
              onpointerdown={() => {
                playing = true;
              }}
              onpointerup={() => {
                playing = false;
              }}
            >
              {#if playing}
                <Pause size={40} />
              {:else}
                <Play size={40} />
              {/if}
              play
            </span>
          </ElementTilt>
        </div>
        <div class="flex gap-6">
          <WordTilt text="YouTube" class="font-semibold" />
          <WordTilt text="live streams" />
        </div>
      </TiltProvider>
    </div>
  </div>
</div>

<style>
  :global(.words span) {
    display: inline-block;
  }

  @keyframes fly-out {
    from {
      transform: translate(0, 0);
      opacity: 1;
    }
    to {
      transform: translate(var(--dx), var(--dy));
      opacity: 0;
    }
  }

  :global(.flying) {
    animation: fly-out var(--flying-duration) ease-in forwards;
  }
</style>
