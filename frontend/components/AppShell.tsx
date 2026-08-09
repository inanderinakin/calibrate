import { ReactNode } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import BackButton from "./BackButton";

interface AppShellProps {
  children?: ReactNode;
  backHref?: string;
}

export default function AppShell({ children, backHref }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="page-texture flex min-h-screen text-[var(--text-primary)]">
      <Sidebar />
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex-1 min-w-0"
      >
        <div className="p-6 md:p-10 lg:p-14">
          {backHref && (
            <div className="mb-6 flex justify-start">
              <BackButton fallbackHref={backHref} />
            </div>
          )}
          {children}
        </div>
      </motion.main>
    </div>
  );
}
