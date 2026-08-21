"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

const MotionLink = motion.create(Link);

type NavItem = {
  label: string;
  href: string;
  icon: string;
  routes?: string[];
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = getTranslations(language);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const NAV_ITEMS: NavItem[] = [
    {
      label: t.sidebar.cvAnalysis,
      href: "/upload_cv",
      icon: "hugeicons:chart-analysis",
      routes: ["/upload_cv", "/select_role", "/analyse_cv"],
    },
    { label: t.sidebar.dashboard, href: "/dashboard", icon: "solar:widget-2-linear" },
    { label: t.sidebar.jobPostings, href: "/postings", icon: "solar:case-minimalistic-linear" },
    { label: t.sidebar.roadMap, href: "/roadmap", icon: "solar:routing-2-linear" },
    { label: t.sidebar.settings, href: "/settings", icon: "solar:settings-linear" },
  ];

  return (
    <aside
      className="
        sidebar-texture
        flex flex-col justify-between
        fixed inset-y-0 left-0 z-30 overflow-y-auto
        pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]
        w-16 md:w-64
        text-[var(--creamy)]
        transition-[width] duration-200
      "
    >
      <div>
        <div className="h-20 flex items-center justify-center md:justify-start md:px-6">
          <span className="hidden md:inline text-3xl font-black">Calibrate</span>
          <span className="md:hidden text-2xl font-black">C</span>
        </div>

        <nav className="mt-2 flex flex-col gap-1 px-2 md:px-4">
          {NAV_ITEMS.map((item) => {
            const routes = item.routes ?? [item.href];
            const isActive = routes.some(
              (route) => pathname === route || pathname.startsWith(route + "/")
            );
            return (
              <MotionLink
                key={item.href}
                href={item.href}
                whileHover={{ scale: 1.03, x: 2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5
                  justify-center md:justify-start
                  ${isActive ? "bg-[var(--nav-active-bg)] text-[var(--nav-active)]" : "text-[var(--creamy)] hover:bg-[var(--creamy)]/10"}
                `}
              >
                <Icon icon={item.icon} className="w-6 h-6 shrink-0" />
                <span className="sr-only md:not-sr-only text-lg font-black">{item.label}</span>
              </MotionLink>
            );
          })}
        </nav>
      </div>

      <div className="px-2 pb-2 md:px-4">
        <AnimatePresence initial={false}>
          {prefsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mb-2 flex flex-col gap-2 rounded-lg bg-[var(--creamy)]/10 p-2">
                <div className="flex gap-1">
                  {(["en", "tr"] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLanguage(code)}
                      className={`
                        flex-1 rounded-md py-1 text-xs font-black uppercase
                        ${language === code
                          ? "bg-[var(--nav-active-bg)] text-[var(--nav-active)]"
                          : "text-[var(--creamy)] hover:bg-[var(--creamy)]/10"}
                      `}
                    >
                      {code}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="
                    flex items-center justify-center gap-2 rounded-md py-1.5
                    text-[var(--creamy)] hover:bg-[var(--creamy)]/10
                    md:justify-start md:px-2
                  "
                >
                  <Icon
                    icon={theme === "dark" ? "solar:moon-linear" : "solar:sun-2-linear"}
                    className="w-5 h-5 shrink-0"
                  />
                  <span className="sr-only md:not-sr-only text-sm font-semibold">
                    {theme === "light" ? t.settings.lightMode : t.settings.darkMode}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setPrefsOpen((open) => !open)}
          aria-expanded={prefsOpen}
          className="
            flex w-full items-center gap-3 rounded-lg px-3 py-2.5
            justify-center md:justify-start
            text-[var(--creamy)] hover:bg-[var(--creamy)]/10
          "
        >
          <Icon icon="solar:tuning-2-linear" className="w-6 h-6 shrink-0" />
          <span className="sr-only md:not-sr-only text-lg font-black">
            {t.sidebar.preferences}
          </span>
        </button>

        {/* Bottom: profile summary, driven entirely by AuthContext */}
        <MotionLink
          href={user ? "/profile" : "/signup"}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="
            flex items-center gap-3 px-3 py-4
            justify-center md:justify-start
          "
        >
          <Icon icon="iconamoon:profile-circle-bold" className="w-10 h-10 shrink-0" />
          <div className="hidden md:flex md:flex-col md:min-w-0">
            {user ? (
              <>
                <span className="text-lg font-bold truncate">{user.firstName}</span>
                <span className="text-[10px] font-light truncate">
                  {user.studyField || t.sidebar.noFieldSet}
                </span>
              </>
            ) : (
              <span className="text-sm font-bold">{t.sidebar.signUpPrompt}</span>
            )}
          </div>
        </MotionLink>
      </div>
    </aside>
  );
}
