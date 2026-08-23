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
import { useSidebar } from "@/contexts/SidebarContext";

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

  // Below md the rail is collapsed by the breakpoint and the toggle is hidden, so this
  // only ever decides the md+ width. It lives in context because the page content has to
  // shrink its left margin along with the rail.
  const { expanded, toggle: toggleExpanded, mounted } = useSidebar();

  const collapseButton = (extra: string) => (
    <button
      type="button"
      onClick={toggleExpanded}
      aria-expanded={expanded}
      aria-label={expanded ? t.sidebar.collapse : t.sidebar.expand}
      className={`items-center justify-center rounded-lg p-2 text-[var(--creamy)] hover:bg-[var(--creamy)]/10 ${extra}`}
    >
      <Icon
        icon="mdi:chevron-left"
        className={`h-6 w-6 shrink-0 transition-transform duration-[var(--duration-fast)] ${expanded ? "" : "rotate-180"}`}
      />
    </button>
  );

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
      className={`
        sidebar-texture
        flex flex-col justify-between
        fixed inset-y-0 left-0 z-30 overflow-y-auto
        pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]
        w-16 ${expanded ? "md:w-64" : "md:w-16"}
        text-[var(--creamy)]
        ${mounted ? "transition-[width] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]" : ""}
      `}
    >
      <div>
        <div className={`h-20 flex items-center justify-center ${expanded ? "md:justify-between md:px-6" : ""}`}>
          <span className={`hidden ${expanded ? "md:inline" : ""} text-3xl font-black`}>Calibrate</span>
          <span className={`${expanded ? "md:hidden" : ""} text-2xl font-black`}>C</span>
          {collapseButton(`hidden ${expanded ? "md:flex" : "md:hidden"}`)}
        </div>

        {/* Collapsed it keeps its own row under the mark rather than crowding it. */}
        {collapseButton(`mx-2 mb-1 w-[calc(100%-1rem)] hidden ${expanded ? "md:hidden" : "md:flex"}`)}

        <nav className={`mt-2 flex flex-col gap-1 px-2 ${expanded ? "md:px-4" : ""}`}>
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
                  justify-center ${expanded ? "md:justify-start" : ""}
                  ${isActive ? "bg-[var(--nav-active-bg)] text-[var(--nav-active)]" : "text-[var(--creamy)] hover:bg-[var(--creamy)]/10"}
                `}
              >
                <Icon icon={item.icon} className="w-6 h-6 shrink-0" />
                <span className={`sr-only ${expanded ? "md:not-sr-only" : ""} text-lg font-black`}>{item.label}</span>
              </MotionLink>
            );
          })}
        </nav>
      </div>

      <div className={`px-2 pb-2 ${expanded ? "md:px-4" : ""}`}>
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
                {/* Side by side they are ~24px wide in the collapsed rail, so stack them. */}
                <div className={`flex gap-1 ${expanded ? "" : "flex-col"}`}>
                  {([["en", "🇺🇸"], ["tr", "🇹🇷"]] as const).map(([code, flag]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLanguage(code)}
                      className={`
                        flex-1 rounded-md py-1.5 text-center text-xl leading-none
                        ${language === code
                          ? "bg-[var(--nav-active-bg)] text-[var(--nav-active)]"
                          : "text-[var(--creamy)] hover:bg-[var(--creamy)]/10"}
                      `}
                    >
                      <span aria-hidden>{flag}</span>
                      <span className="sr-only">{code === "en" ? "English" : "Türkçe"}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`
                    flex items-center justify-center gap-2 rounded-md py-1.5
                    text-[var(--creamy)] hover:bg-[var(--creamy)]/10
                    ${expanded ? "md:justify-start md:px-2" : ""}
                  `}
                >
                  <Icon
                    icon={theme === "dark" ? "solar:moon-linear" : "solar:sun-2-linear"}
                    className={`w-5 h-5 shrink-0 ${theme === "dark" ? "rotate-[40deg]" : ""}`}
                  />
                  <span className={`sr-only ${expanded ? "md:not-sr-only" : ""} text-sm font-semibold`}>
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
          className={`
            flex w-full items-center gap-3 rounded-lg px-3 py-2.5
            justify-center ${expanded ? "md:justify-start" : ""}
            text-[var(--creamy)] hover:bg-[var(--creamy)]/10
          `}
        >
          <Icon icon="solar:tuning-2-linear" className="w-6 h-6 shrink-0" />
          <span className={`sr-only ${expanded ? "md:not-sr-only" : ""} text-lg font-black`}>
            {t.sidebar.preferences}
          </span>
        </button>

        {/* Bottom: profile summary, driven entirely by AuthContext */}
        <MotionLink
          href={user ? "/profile" : "/signup"}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`
            flex items-center gap-3 px-3 py-4
            justify-center ${expanded ? "md:justify-start" : ""}
          `}
        >
          <Icon icon="iconamoon:profile-circle-bold" className="w-10 h-10 shrink-0" />
          <div className={`hidden ${expanded ? "md:flex" : ""} md:flex-col md:min-w-0`}>
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
