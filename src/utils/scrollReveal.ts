export function computePosterRevealDelay(
  index: number,
  stepMs = 38,
  maxDelayMs = 190
): number {
  if (!Number.isFinite(index) || index <= 0) {
    return 0;
  }
  return Math.min(Math.round(index) * stepMs, maxDelayMs);
}

export function isElementNearOrAboveViewport(
  rectTop: number,
  rectBottom: number,
  viewportHeight: number,
  revealThresholdPx = -24
): boolean {
  if (viewportHeight <= 0) {
    return true;
  }
  // Already scrolled above the top or entering near the bottom edge of the viewport
  if (rectTop <= viewportHeight - revealThresholdPx) {
    return rectBottom >= -40 || rectTop < 0;
  }
  return false;
}

export function easeOutQuint(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return 1 - Math.pow(1 - t, 5);
}

let activeScrollAnimationFrame: number | null = null;
let cancelActiveScrollListeners: (() => void) | null = null;

export function cancelSmoothScroll(): void {
  if (activeScrollAnimationFrame !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(activeScrollAnimationFrame);
    activeScrollAnimationFrame = null;
  }
  if (cancelActiveScrollListeners) {
    cancelActiveScrollListeners();
    cancelActiveScrollListeners = null;
  }
}

export function smoothScrollToY(
  targetY: number,
  options?: { durationMs?: number; prefersReducedMotion?: boolean }
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  cancelSmoothScroll();

  const maxScrollY = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  );
  const destinationY = Math.min(maxScrollY, Math.max(0, Math.round(targetY)));

  const reducedMotion =
    options?.prefersReducedMotion ??
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
    false;

  if (reducedMotion || Math.abs(destinationY - window.scrollY) < 4) {
    window.scrollTo({ top: destinationY, behavior: 'auto' });
    return () => {};
  }

  const startY = window.scrollY;
  const distance = destinationY - startY;
  const durationMs = Math.max(220, Math.min(900, options?.durationMs ?? 620));
  const startTime = performance.now();

  const abortOnUserScroll = () => {
    cancelSmoothScroll();
  };

  window.addEventListener('wheel', abortOnUserScroll, { passive: true, once: true });
  window.addEventListener('touchstart', abortOnUserScroll, { passive: true, once: true });

  cancelActiveScrollListeners = () => {
    window.removeEventListener('wheel', abortOnUserScroll);
    window.removeEventListener('touchstart', abortOnUserScroll);
  };

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    const eased = easeOutQuint(progress);
    window.scrollTo(0, Math.round(startY + distance * eased));

    if (progress < 1) {
      activeScrollAnimationFrame = window.requestAnimationFrame(step);
    } else {
      cancelSmoothScroll();
    }
  };

  activeScrollAnimationFrame = window.requestAnimationFrame(step);
  return cancelSmoothScroll;
}

export function smoothScrollToElement(
  element: HTMLElement | null,
  offsetPx = 88,
  durationMs = 640
): () => void {
  if (typeof window === 'undefined' || !element) {
    return () => {};
  }
  const rect = element.getBoundingClientRect();
  const targetY = window.scrollY + rect.top - offsetPx;
  return smoothScrollToY(targetY, { durationMs });
}
