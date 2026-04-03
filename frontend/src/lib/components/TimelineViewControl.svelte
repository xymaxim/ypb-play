<script lang="ts">
  import { getExplorerContext } from "../explorer.svelte";
  import { ZOOM_LEVELS, type ZoomLevelKey } from "../types";

  const explorer = getExplorerContext();

  const zoomKeys = (Object.keys(ZOOM_LEVELS) as ZoomLevelKey[]).reverse();
  const zoomKey = $derived(
    (Object.entries(ZOOM_LEVELS).find(
      ([, v]) => v === explorer.zoomLevel,
    )?.[0] ?? "1d") as ZoomLevelKey,
  );
</script>

<div class="flex items-center justify-between">
  <div class="flex items-center gap-3">
    {#each zoomKeys as key}
      <button
        class="text-xs transition-colors"
        class:font-bold={zoomKey === key}
        class:text-foreground={zoomKey === key}
        class:text-muted-foreground={zoomKey !== key}
        onclick={() => explorer.setZoom(ZOOM_LEVELS[key])}
      >
        {key}
      </button>
    {/each}
  </div>
</div>
