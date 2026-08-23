/**
 * The motion-token scale from globals.css, in the units framer-motion wants.
 * CSS holds these in ms, framer-motion takes seconds, so the two copies have to be
 * kept in step by hand. The comment on each line is the CSS token it mirrors.
 */
export const duration = {
  stagger: 0.04, // --duration-stagger
  micro: 0.08, // --duration-micro
  quick: 0.15, // --duration-quick
  fast: 0.25, // --duration-fast
  medium: 0.35, // --duration-medium
  slow: 0.4, // --duration-slow
  verySlow: 0.5, // --duration-very-slow
} as const;

type Bezier = [number, number, number, number];

export const ease = {
  smoothOut: [0.22, 1, 0.36, 1] as Bezier, // --ease-smooth-out
  bounce: [0.34, 1.36, 0.64, 1] as Bezier, // --ease-bounce
  inOut: "easeInOut", // --ease-in-out
  out: "easeOut", // --ease-out
  linear: "linear", // --ease-linear
} as const;
