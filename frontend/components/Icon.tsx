"use client";

import { Icon as IconifyIcon, IconProps } from "@iconify/react/offline";
import "@/lib/iconBundle";

// ssr makes Iconify read the bundled data on the very first render. Without it the
// component returns an empty span once and fills in on the next tick, which is what
// made the icons blink on every mount.
export function Icon(props: IconProps) {
  return <IconifyIcon ssr {...props} />;
}
