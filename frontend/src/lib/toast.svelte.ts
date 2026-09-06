export type ToastFn = (msg: string, durationMs?: number) => void;

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
