"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

const MotionLink = motion.create(Link);

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = getTranslations(language);

  // Matches the Figma structure exactly: "CV Analysis" is a group that expands
  // into the 3-step flow (Upload CV / Select Role / Analyse CV); Dashboard,
  // Road Map and Settings are flat items below it.
  const CV_FLOW = [
    { label: t.sidebar.uploadCv, href: "/upload_cv", icon: "pepicons-pencil:cv" },
    { label: t.sidebar.selectRole, href: "/select_role", icon: "ant-design:select-outlined" },
    { label: t.sidebar.analyseCv, href: "/analyse_cv", icon: "hugeicons:chart-analysis" },
  ];

  const NAV_ITEMS = [
    { label: t.sidebar.dashboard, href: "/dashboard", icon: "solar:widget-2-linear" },
    { label: t.sidebar.jobPostings, href: "/postings", icon: "solar:case-minimalistic-linear" },
    { label: t.sidebar.roadMap, href: "/roadmap", icon: "solar:routing-2-linear" },
    { label: t.sidebar.settings, href: "/settings", icon: "solar:settings-linear" },
  ];

  const cvFlowActive = CV_FLOW.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

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
          {/* CV Analysis group */}
          <div
            className={`
              hidden md:flex items-center gap-3 rounded-lg px-3 py-2.5
              justify-center md:justify-start
              ${cvFlowActive ? "text-[var(--nav-active)]" : "text-[var(--creamy)] hover:text-[var(--nav-active)]"}
            `}
          >
            <Icon icon="hugeicons:chart-analysis" className="w-6 h-6 shrink-0" />
            <span className="hidden md:inline text-lg font-black">{t.sidebar.cvAnalysis}</span>
          </div>
          <div className="flex flex-col gap-1 pb-2 md:pl-9">
            {CV_FLOW.map((item) => {
              const isActive = pathname === item.href;
              return (
                <MotionLink
                  key={item.href}
                  href={item.href}
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`
                    flex items-center justify-center gap-3 rounded-lg px-3 py-2.5
                    md:justify-start md:px-0 md:py-1 md:text-sm md:font-semibold
                    ${isActive ? "text-[var(--nav-active)]" : "text-[var(--creamy)]/80 hover:text-[var(--nav-active)]"}
                  `}
                >
                  <Icon icon={item.icon} className="w-6 h-6 shrink-0 md:hidden" />
                  <span className="sr-only md:not-sr-only">{item.label}</span>
                </MotionLink>
              );
            })}
          </div>

          {/* Flat items */}
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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
                  ${isActive ? "text-[var(--nav-active)]" : "text-[var(--creamy)] hover:text-[var(--nav-active)]"}
                `}
              >
                <Icon icon={item.icon} className="w-6 h-6 shrink-0" />
                <span className="sr-only md:not-sr-only text-lg font-black">{item.label}</span>
              </MotionLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom: profile summary, driven entirely by AuthContext */}
      <MotionLink
        href={user ? "/profile" : "/signup"}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="
          flex items-center gap-3 px-3 py-4 mx-2 mb-2
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
    </aside>
  );
}
