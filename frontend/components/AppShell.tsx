import { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-texture flex min-h-screen text-[var(--text-primary)]">
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
