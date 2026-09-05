<script lang="ts">
  import { getExplorerContext } from "$lib/explorer.svelte";
  import { clampViewRange } from "$lib/utils/timelineUtils";
  import { ChevronLeft, ChevronRight } from "lucide-svelte";

  interface Props {
    side: "left" | "right";
  }

  let { side }: Props = $props();

  const explorer = getExplorerContext();

  const available = $derived.by<boolean>(() => {
    const vr = explorer.viewRange;
    const ar = explorer.availableRange;
    if (vr === null || ar === null) return false;
    const span = vr.end - vr.start;
    const shift = side === "left" ? -span : span;
    const start = vr.start + shift;
    const end = vr.end + shift;
    return start <= ar.end && end >= ar.start;
  });

  function pan(e: MouseEvent) {
    e.stopPropagation();
    const vr = explorer.viewRange;
    const ar = explorer.availableRange;
    if (vr === null || ar === null) return;
    const span = vr.end - vr.start;
    const shift = side === "left" ? -span : span;
    const start = vr.start + shift;
    const end = vr.end + shift;
    if (start > ar.end || end < ar.start) return;
    const center = (vr.start + vr.end) / 2 + shift;
    explorer.setViewRange(
      clampViewRange(center, span, explorer.days, explorer.centeredOnMidnight),
    );
  }
</script>

{#if available}
  <button
    type="button"
    title={side === "left" ? "Pan left" : "Pan right"}
    onclick={pan}
    class="pointer-events-none absolute bottom-0 z-50 flex size-6 cursor-pointer items-center justify-center rounded-full bg-neutral-300 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-neutral-400/70"
    class:left-0={side === "left"}
    class:right-0={side === "right"}
    style="transform: translateX({side === 'left'
      ? '-100%'
      : '100%'}) translateY(0%);"
  >
    {#if side === "left"}
      <ChevronLeft class="size-5 text-neutral-50" strokeWidth={3} />
    {:else}
      <ChevronRight class="size-5 text-neutral-50" strokeWidth={3} />
    {/if}
  </button>
{/if}
