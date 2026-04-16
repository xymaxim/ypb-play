<script lang="ts">
  import { untrack } from "svelte";
  import type { PrimitiveProps, CircleConfig } from "../types";
  import { randBetween, randFrom, randomOklch, oklch } from "../utils";

  let {
    x,
    y,
    config,
    seed = 0,
    onclick,
  }: PrimitiveProps<CircleConfig> = $props();

  // ─── Resolved random values ───────────────────────────────────────────────
  let r = $state(0);
  let color = $state("");
  let opacity = $state(1);
  let strokeWidth = $state(0);

  function roll() {
    r = randBetween(config.sizeRange) / 2;
    color = randomOklch(config.colorRange);
    opacity = config.opacity ? randBetween(config.opacity) : 1;
    strokeWidth = config.strokeWidth ? randBetween(config.strokeWidth) : 0;
  }

  $effect(() => {
    seed;
    untrack(() => roll());
  });

  // ─── Wiggle ───────────────────────────────────────────────────────────────
  let wiggling = $state(false);

  function handleClick() {
    wiggling = true;
    onclick?.();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
<g transform="translate({x}, {y})">
  <g
    class="primitive"
    class:wiggle={wiggling}
    onclick={handleClick}
    onanimationend={() => (wiggling = false)}
    role="button"
    style="cursor: pointer;"
  >
    <circle
      {r}
      fill={config.filled === false ? "none" : color}
      stroke={config.filled === false
        ? color
        : strokeWidth > 0
          ? color
          : "none"}
      stroke-width={strokeWidth}
      {opacity}
    />
  </g>
</g>

<style>
  .primitive {
    transform-box: fill-box;
    transform-origin: center;
  }

  @keyframes wiggle {
    0% {
      transform: rotate(0deg) scale(1);
    }
    20% {
      transform: rotate(-12deg) scale(1.15);
    }
    40% {
      transform: rotate(10deg) scale(0.95);
    }
    60% {
      transform: rotate(-6deg) scale(1.05);
    }
    80% {
      transform: rotate(4deg) scale(0.98);
    }
    100% {
      transform: rotate(0deg) scale(1);
    }
  }

  .wiggle {
    animation: wiggle 0.4s ease-in-out forwards;
  }
</style>
