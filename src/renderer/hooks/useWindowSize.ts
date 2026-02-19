import { useState, useEffect } from 'react';

type LayoutMode = 'compact' | 'normal' | 'expanded';

interface WindowSize {
  width: number;
  height: number;
  mode: LayoutMode;
}

function getMode(width: number): LayoutMode {
  if (width < 350) return 'compact';
  if (width > 600) return 'expanded';
  return 'normal';
}

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    mode: getMode(window.innerWidth),
  }));

  useEffect(() => {
    let rafId: number | null = null;

    function handleResize(): void {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        setSize({ width, height, mode: getMode(width) });
        rafId = null;
      });
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return size;
}
