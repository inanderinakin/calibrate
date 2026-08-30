"use client";

import { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

/**
 * Makes framer-motion honour the OS "reduce motion" setting everywhere.
 *
 * globals.css already switches off the CSS keyframes and the button hover under
 * `prefers-reduced-motion`, and a handful of components ask for `useReducedMotion()`
 * themselves, but the dashboard, roadmap and settings screens carry roughly fifty
 * motion elements between them that did not check. Turning animations off in Windows
 * is a common thing to do on a machine that is already struggling, and until now that
 * setting bought nothing on exactly the screens where it would have helped most.
 *
 * `reducedMotion="user"` leaves opacity fades alone and drops the transform and layout
 * animations, which are the ones that cost layout and paint.
 */
export default function MotionPreferences({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
