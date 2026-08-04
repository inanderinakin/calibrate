"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

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
        h-screen sticky top-0
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
              flex items-center gap-3 rounded-lg px-3 py-2.5
              justify-center md:justify-start
              ${cvFlowActive ? "text-[var(--nav-active)]" : "text-[var(--creamy)] hover:text-[var(--nav-active)]"}
            `}
          >
            <Icon icon="hugeicons:chart-analysis" className="w-6 h-6 shrink-0" />
            <span className="hidden md:inline text-lg font-black">{t.sidebar.cvAnalysis}</span>
          </div>
          <div className="hidden md:flex flex-col gap-1 pl-9 pb-2">
            {CV_FLOW.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-semibold py-1 ${
                    isActive ? "text-[var(--nav-active)]" : "text-[var(--creamy)]/80 hover:text-[var(--nav-active)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Flat items */}
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5
                  justify-center md:justify-start
                  ${isActive ? "text-[var(--nav-active)]" : "text-[var(--creamy)] hover:text-[var(--nav-active)]"}
                `}
              >
                <Icon icon={item.icon} className="w-6 h-6 shrink-0" />
                <span className="hidden md:inline text-lg font-black">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: profile summary, driven entirely by AuthContext */}
      <Link
        href="/profile"
        className="
          flex items-center gap-3 px-3 py-4 mx-2 mb-2
          justify-center md:justify-start
        "
      >
        <Icon icon="iconamoon:profile-circle-bold" className="w-10 h-10 shrink-0" />
        <div className="hidden md:flex md:flex-col md:min-w-0">
          <span className="text-lg font-bold truncate">{user?.firstName ?? t.profile.guest}</span>
          <span className="text-[10px] font-light truncate">
            {user?.studyField ?? t.sidebar.noFieldSet}
          </span>
        </div>
      </Link>
    </aside>
  );
}
