"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Press-and-hold before a destructive action fires. Same idea as the delete
 * button in Settings: the action takes the CV analysis and roadmap with it, so
 * a single misclick should not be enough.
 */
export function useHoldToConfirm(durationMs: number, onComplete: () => void) {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const fromKeyboard = useRef(false);

  function stop() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    fromKeyboard.current = false;
    setProgress(0);
  }

  // Safari does not focus a button when you press it, so pressing it fires blur
  // and kills the hold that pointerdown just started. Only a keyboard hold
  // cares about focus leaving.
  function stopOnBlur() {
    if (fromKeyboard.current) stop();
  }

  function start(keyboard = false) {
    if (frame.current !== null) return;

    fromKeyboard.current = keyboard;
    const began = performance.now();

    const tick = (now: number) => {
      const ratio = Math.min((now - began) / durationMs, 1);

      if (ratio >= 1) {
        stop();
        onComplete();
        return;
      }

      setProgress(ratio);
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
  }

  useEffect(() => stop, []);

  return { progress, start, stop, stopOnBlur };
}
