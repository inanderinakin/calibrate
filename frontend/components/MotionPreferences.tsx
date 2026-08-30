"use client";

import { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

/**
 * Makes framer-motion honour the OS "reduce motion" setting, which the dashboard,
 * roadmap and settings screens ignored across roughly fifty motion elements.
 * "user" keeps opacity fades and drops the transform and layout animations.
 */
export default function MotionPreferences({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
