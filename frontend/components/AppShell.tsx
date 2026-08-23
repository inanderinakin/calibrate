import { ReactNode } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import BackButton from "./BackButton";
import { useSidebar } from "@/contexts/SidebarContext";
import { duration, ease } from "@/lib/motion";

interface AppShellProps {
  children?: ReactNode;
  backHref?: string;
}

export default function AppShell({ children, backHref }: AppShellProps) {
  const pathname = usePathname();
  const { expanded, mounted } = useSidebar();

  return (
    <motion.main
      key={pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.medium, ease: ease.smoothOut }}
      className={`flex-1 min-w-0 ml-16 ${expanded ? "md:ml-64" : "md:ml-16"} ${
        mounted ? "transition-[margin] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]" : ""
      }`}
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
  );
}
