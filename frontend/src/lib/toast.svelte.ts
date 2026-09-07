import { Icon } from "lucide-svelte";

export type ToastIcon = typeof Icon;

export type ToastFn = (msg: string, icon?: ToastIcon, durationMs?: number) => void;

interface ToastContext {
  toast: ToastFn;
}

let toastContext: ToastContext = $state({ toast: () => {} });

export function setToastContext(ctx: ToastContext): void {
  toastContext = ctx;
}

export function getToastContext(): ToastContext {
  return toastContext;
}
