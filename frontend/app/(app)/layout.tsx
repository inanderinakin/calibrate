import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

// The sidebar sits in the layout so it survives navigation. Rendered per page it was
// torn down and rebuilt on every tab switch, and an Iconify icon paints an empty span
// on its first render, so all four nav icons blanked for a frame each time.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-texture flex min-h-screen text-[var(--text-primary)]">
      <Sidebar />
      {children}
    </div>
  );
}
