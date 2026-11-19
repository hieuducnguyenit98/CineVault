import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isElementNearOrAboveViewport } from '../utils/scrollReveal';

interface ScrollRevealShelfProps {
  id?: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
  revealKey?: string;
}

export function ScrollRevealShelf({
  id,
  ariaLabel,
  className = '',
  children,
  revealKey,
}: ScrollRevealShelfProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  });

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || revealed) return;

    const prefersReduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (prefersReduced) {
      setRevealed(true);
      return;
    }

    const revealIfVisible = (): boolean => {
      const rect = el.getBoundingClientRect();
      if (isElementNearOrAboveViewport(rect.top, rect.bottom, window.innerHeight, -24)) {
        setRevealed(true);
        return true;
      }
      return false;
    };

    if (revealIfVisible()) return;

    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (
              entry.isIntersecting ||
              isElementNearOrAboveViewport(
                entry.boundingClientRect.top,
                entry.boundingClientRect.bottom,
                window.innerHeight,
                -24
              )
            ) {
              setRevealed(true);
              observer?.disconnect();
              break;
            }
          }
        },
        {
          threshold: 0.01,
          rootMargin: '0px 0px 24px 0px',
        }
      );
      observer.observe(el);
    }

    const onScrollOrResize = () => {
      if (revealIfVisible()) {
        observer?.disconnect();
        window.removeEventListener('scroll', onScrollOrResize);
        window.removeEventListener('resize', onScrollOrResize);
      }
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [revealed, revealKey]);

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-label={ariaLabel}
      data-reveal-state={revealed ? 'visible' : 'pending'}
      className={`reveal-shelf ${className}`.trim()}
    >
      {children}
    </section>
  );
}
