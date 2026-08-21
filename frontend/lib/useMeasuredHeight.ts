"use client";

import { useCallback, useRef, useState } from "react";

/**
 * The live height of an element, so a wrapper around it can animate to that number.
 *
 * A callback ref rather than useRef + useEffect: the measured element sits behind the
 * page's loading branches, so it is not attached on the first commit and an effect with
 * an empty dependency list would measure nothing and never run again.
 */
export function useMeasuredHeight() {
  const [height, setHeight] = useState<number>();
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();

    if (!node) return;

    observer.current = new ResizeObserver(() => setHeight(node.offsetHeight));
    observer.current.observe(node);
    setHeight(node.offsetHeight);
  }, []);

  return [ref, height] as const;
}
