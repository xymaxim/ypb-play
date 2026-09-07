<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Kbd from "$lib/components/ui/kbd/index.js";

  let { open = $bindable(false) } = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Hotkeys</Dialog.Title>
    </Dialog.Header>

    <div class="mt-2 space-y-4 text-sm">
      <div>
        <h3 class="font-semibold">Play</h3>
        <ul class="mt-2 space-y-1">
          <li class="flex items-center justify-between">
            <span>Play/Pause</span>
            <Kbd.Root class="text-sm">Space</Kbd.Root>
          </li>
          <li class="flex items-center justify-between">
            <span>Seek to start</span>
            <Kbd.Root class="text-sm">Backspace</Kbd.Root>
          </li>
          <li class="flex items-center justify-between">
            <span>Seek back/forward</span>
            <Kbd.Group
              ><Kbd.Root class="text-sm">←</Kbd.Root>/<Kbd.Root class="text-sm"
                >→</Kbd.Root
              ></Kbd.Group
            >
          </li>
          <li class="flex items-center justify-between">
            <span>Mark interval start (A)</span>
            <Kbd.Root class="text-sm">a</Kbd.Root>
          </li>
          <li class="flex items-center justify-between">
            <span>Mark interval end (B)</span>
            <Kbd.Root class="text-sm">b</Kbd.Root>
          </li>
          <li class="flex items-center justify-between">
            <span>Set selected time</span>
            <Kbd.Root class="text-sm">r</Kbd.Root>
          </li>
          <li class="flex items-center justify-between">
            <span>Take screenshot</span>
            <Kbd.Root class="text-sm">s</Kbd.Root>
          </li>
        </ul>
      </div>

      <div>
        <h3 class="font-semibold">Timeline</h3>
        <ul class="mt-2 space-y-1">
          <li class="flex items-center justify-between">
            <span>Select time without rewind</span>
            <Kbd.Root class="text-sm">Ctrl + Click</Kbd.Root>
          </li>
        </ul>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
