"use client";

import { Icon } from "@/components/Icon";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { countryLabel } from "@/lib/countries";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function ProfilePage() {
  const allowed = useRequireAuth();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const t = getTranslations(language);

  function handleLogout() {
    logout();
    router.push("/");
  }

  const joinedDate = user?.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;

  if (!allowed) return <AppShell backHref="/dashboard" />;

  return (
    <AppShell backHref="/dashboard">
      <div className="flex flex-col gap-6">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)]">{t.profile.title}</h1>
          <p className="text-[var(--text-primary)] mt-2">
            {t.profile.subtitle}
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="soft-box rounded-[30px] shadow-lg p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start relative"
        >
          <div className="w-40 h-44 rounded-[20px] border-2 border-(--accent-bg) bg-[var(--soft-box-bg)] flex items-center justify-center shrink-0">
            <Icon icon="iconamoon:profile-thin" className="w-24 h-24 text-(--accent-bg)" />
          </div>

          <div className="flex-1 flex flex-col gap-6 w-full">
            <h2 className="text-3xl md:text-4xl font-bold text-(--accent-bg)">
              {user ? `${user.firstName} ${user.lastName}` : t.profile.guest}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <Icon icon="mynaui:mail-solid" className="w-9 h-9 text-(--accent-bg) shrink-0" />
                <div>
                  <p className="font-bold text-(--accent-bg)">{t.profile.email}</p>
                  <a
                    href={`mailto:${user?.email ?? ""}`}
                    className="text-(--accent-bg) underline"
                  >
                    {user?.email ?? "-"}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Icon icon="weui:location-outlined" className="w-9 h-9 text-(--accent-bg) shrink-0" />
                <div>
                  <p className="font-bold text-(--accent-bg)">{t.profile.country}</p>
                  <p className="text-(--accent-bg)">
                    {countryLabel(user?.country ?? "", language) || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Icon icon="solar:calendar-outline" className="w-9 h-9 text-(--accent-bg) shrink-0" />
                <div>
                  <p className="font-bold text-(--accent-bg)">{t.profile.joined}</p>
                  {/* TODO: replace with real signup date once the backend exists */}
                  <p className="text-(--accent-bg)">
                    {joinedDate ?? "-"}
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/settings"
              className="btn-hover self-start bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-8 py-3 font-medium flex items-center gap-2"
            >
              {t.profile.editProfile}

              <Icon icon="solar:settings-linear" className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>

        <motion.button
          type="button"
          onClick={handleLogout}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="btn-hover self-start bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-8 py-3 font-medium flex items-center gap-2"
        >
          {t.profile.logout}

          <Icon icon="material-symbols:logout-rounded" className="w-5 h-5" />
        </motion.button>
      </div>
    </AppShell>
  );
}