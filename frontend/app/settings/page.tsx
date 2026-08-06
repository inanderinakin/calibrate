"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

export default function SettingsPage() {
  const router = useRouter();

  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const t = getTranslations(language).settings;

  function handleSave(e: FormEvent) {
    e.preventDefault();

    updateUser({
      firstName,
      lastName,
      email,
    });
  }

  function handleLanguageChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    setLanguage(e.target.value as Language);
  }

  function handleLogout() {
    logout();

    /*
     * Redirect to app/page.tsx
     */
    router.push("/");
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 lg:p-14 flex flex-col gap-6 max-w-4xl">
        <header>
          <h1 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)]">
            {t.settings}
          </h1>

          <p className="text-[var(--text-primary)] mt-2">
            {t.subtitle}
          </p>
        </header>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Profile information */}
          <div className="bg-[var(--card-bg)] rounded-[30px] shadow-lg p-6 md:p-9 flex flex-col gap-6">
            <h2 className="text-2xl font-medium text-(--accent-bg)">
              {t.profileInformation}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-(--accent-bg) font-medium">
                  {t.firstName}
                </span>

                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="border-2 border-(--accent-bg) rounded-[20px] px-4 py-3 bg-transparent text-[var(--text-primary)]"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-(--accent-bg) font-medium">
                  {t.lastName}
                </span>

                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="border-2 border-(--accent-bg) rounded-[20px] px-4 py-3 bg-transparent text-[var(--text-primary)]"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-(--accent-bg) font-medium">
                {t.email}
              </span>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-2 border-(--accent-bg) rounded-[20px] px-4 py-3 bg-transparent text-[var(--text-primary)]"
              />
            </label>

            <button
              type="submit"
              className="self-start bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-6 py-2.5 font-medium"
            >
              {t.saveChanges}
            </button>
          </div>

          {/* Language & Appearance */}
          <div className="bg-[var(--card-bg)] rounded-[30px] shadow-lg p-6 md:p-9 flex flex-col gap-4">
            <h2 className="text-2xl font-medium text-(--accent-bg)">
              {t.languageAppearance}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Language */}
              <div className="flex flex-col gap-2">
                <span className="text-(--accent-bg) font-medium">
                  {t.language}
                </span>

                <div className="border-2 border-(--accent-bg) rounded-[20px] px-4 py-3 flex items-center justify-between text-(--accent-bg)">
                  <select
                    value={language}
                    onChange={handleLanguageChange}
                    className="w-full bg-transparent outline-none cursor-pointer text-(--accent-bg)"
                  >
                    <option value="en">
                      {t.english}
                    </option>

                    <option value="tr">
                      {t.turkish}
                    </option>
                  </select>

                  <Icon
                    icon="weui:arrow-outlined"
                    className="w-5 h-5 rotate-90 pointer-events-none"
                  />
                </div>
              </div>

              {/* Appearance */}
              <div className="flex flex-col gap-2">
                <span className="text-(--accent-bg) font-medium">
                  {t.appearance}
                </span>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="border-2 border-(--accent-bg) rounded-[20px] px-4 py-3 flex items-center justify-between text-(--accent-bg)"
                >
                  <span>
                    {theme === "light"
                      ? t.lightMode
                      : t.darkMode}
                  </span>

                  <Icon
                    icon="weui:arrow-outlined"
                    className="w-5 h-5 rotate-90"
                  />
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="self-end bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-8 py-2.5 font-medium flex items-center gap-2"
        >
          <Icon
            icon="material-symbols:logout-rounded"
            className="w-8 h-8"
          />

          {t.logout}
        </button>
      </div>
    </AppShell>
  );
}