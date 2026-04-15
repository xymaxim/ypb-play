<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import * as Field from "$lib/components/ui/field";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { ArrowRight, X } from "lucide-svelte";
  import StartingDoodle from "$lib/components/StartingDoodle.svelte";
  import { extractVideoId } from "$lib/utils/urlUtils";

  interface Props {
    onStreamStart: (videoId: string) => void;
    disabled: boolean;
  }

  let { onStreamStart, disabled = false }: Props = $props();

  let inputEl = $state<HTMLInputElement | null>(null);
  let inputValue = $state("");
  let focused = $state(false);
  let error = $state(false);

  async function handleStart() {
    const videoId = extractVideoId(inputValue);
    if (!videoId) {
      error = true;
      return;
    }
    error = false;
    inputEl?.blur();
    focused = false;
    onStreamStart(videoId);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      handleStart();
    }
  }

  function clearInput() {
    inputValue = "";
    error = false;
    inputEl?.focus();
  }
</script>

<div class="pointer-events-auto flex w-full flex-col items-center">
  <StartingDoodle />
  <div class="mt-10 flex w-full max-w-[640px] justify-center">
    <Field.Field>
      <ButtonGroup.Root class="flex w-full items-center gap-2 px-5">
        <ButtonGroup.Root class="flex flex-1 items-center">
          <InputGroup.Root
            class={"h-11 w-full rounded-xl " +
              (focused
                ? "!bg-white shadow-md"
                : "bg-white hover:bg-neutral-50")}
          >
            <InputGroup.Input
              class="text-center text-sm! font-medium"
              bind:ref={inputEl}
              bind:value={inputValue}
              type="text"
              placeholder="Paste YouTube live stream link"
              aria-invalid={error}
              {disabled}
              onfocus={() => {
                focused = true;
              }}
              onblur={() => {
                focused = false;
              }}
              onkeydown={onKeyDown}
            />
            {#if inputValue}
              <InputGroup.Addon align="inline-end">
                <Button variant="ghost" size="icon-sm" onclick={clearInput}>
                  <X />
                </Button>
              </InputGroup.Addon>
            {/if}
          </InputGroup.Root>
        </ButtonGroup.Root>

        <ButtonGroup.Root class="flex items-center">
          <Button
            size="icon"
            class="size-11 bg-[var(--ypb-play)]"
            onclick={handleStart}
            disabled={disabled || !inputValue}
          >
            <ArrowRight class="size-5" />
          </Button>
        </ButtonGroup.Root>
      </ButtonGroup.Root>

      {#if error}
        <Field.Error
          >Invalid YouTube URL. Please paste a valid stream link.</Field.Error
        >
      {/if}
    </Field.Field>
  </div>
</div>
