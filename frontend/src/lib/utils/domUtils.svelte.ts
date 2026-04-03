export function useElementSize() {
  let el = $state<HTMLElement | null>(null);
  let width = $state(0);

  $effect(() => {
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      width = entries[0].contentRect.width;
    });
    ro.observe(el);
    return () => ro.disconnect();
  });

  return {
    get el() {
      return el;
    },
    set el(v) {
      el = v;
    },
    get width() {
      return width;
    },
  };
}
