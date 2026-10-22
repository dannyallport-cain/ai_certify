'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
  as?: 'div' | 'section' | 'li' | 'article';
};

const REVEAL_THRESHOLD = 0.12;

/**
 * Fades and lifts content into view once, the first time it is scrolled
 * near the viewport. Falls back to plain content when the browser has no
 * IntersectionObserver or the visitor prefers reduced motion.
 */
export function Reveal({ children, className, delay = 0, id, as = 'div' }: RevealProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = elementRef.current;

    if (!node) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: REVEAL_THRESHOLD, rootMargin: '0px 0px -60px 0px' },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const Tag = as;

  return (
    <Tag
      ref={elementRef as never}
      id={id}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-out will-change-transform motion-reduce:transition-none',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
