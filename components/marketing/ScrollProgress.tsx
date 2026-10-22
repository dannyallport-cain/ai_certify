'use client';

import { useEffect, useState } from 'react';

/**
 * Thin gradient line that fills as the visitor scrolls the page.
 * It sits flush with the bottom edge of the header so the shell
 * always shows how far through a page you are.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const next = scrollable > 0 ? window.scrollY / scrollable : 0;
      setProgress(Math.min(1, Math.max(0, next)));
    };

    const onScroll = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden">
      <div
        className="h-full origin-left bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 transition-[width] duration-150 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
