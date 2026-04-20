<script lang="ts">
  import type { BasePrimitiveProps } from "../types";

  let { x, y, resolved, onclick }: BasePrimitiveProps<{}> = $props();
</script>

<g transform="translate({x}, {y})" />
