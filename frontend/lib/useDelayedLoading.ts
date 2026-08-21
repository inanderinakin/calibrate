"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Whether a loading placeholder should actually be on screen.
 *
 * Two rules, both about not making a fast response look broken: nothing shows until
 * the wait has lasted `delay`, so a warm API never flashes a skeleton at all; and once
 * something is showing it stays for at least `minimum`, so it cannot blink out a frame
 * later either.
 */
export function useDelayedLoading(active: boolean, delay = 300, minimum = 400) {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, delay);

      return () => clearTimeout(timer);
    }

    if (!visible) return;

    const elapsed = Date.now() - shownAt.current;

    if (elapsed >= minimum) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => setVisible(false), minimum - elapsed);
    return () => clearTimeout(timer);
  }, [active, visible, delay, minimum]);

  return visible;
}
