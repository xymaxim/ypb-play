<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    text: string;
    min: number;
    max: number;
    class: string;
  }

  const { text, min = -20, max = 20, class: className }: Props = $props();

  type Word = { t: string; angle: number };
  let words: Word[] = $state([]);

  const randAngle = () => Math.floor(Math.random() * (max - min + 1)) + min;

  function randomize() {
    words = text
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => ({ t: w, angle: randAngle() }));
  }

  onMount(randomize);
</script>

<p class="flex {className}">
  {#each words as { t, angle }, i (i)}
    <span class="inline-block" style="rotate: {angle}deg;">
      {t}{i < words.length - 1 ? " " : ""}
    </span>
  {/each}
</p>
