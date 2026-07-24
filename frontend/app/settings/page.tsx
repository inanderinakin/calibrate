"use client";

import { useState, FormEvent } from "react";
import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  function handleSave(e: FormEvent) {
    e.preventDefault();
    updateUser({ firstName, lastName, email });
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 lg:p-14 flex flex-col gap-6 max-w-4xl">
        <header>
          <h1 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-[var(--text-primary)] mt-2">
            Manage your preferences and account settings
          </p>
        </header>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Profile information */}
          <div className="bg-[var(--card-bg)] rounded-[30px] shadow-lg p-6 md:p-9 flex flex-col gap-6">
            <h2 className="text-2xl font-medium text-[var(--accent)]">Profile Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-[var(--accent)] font-medium">First Name</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="border-2 border-[var(--accent)] rounded-[20px] px-4 py-3 bg-transparent text-[var(--text-primary)]"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[var(--accent)] font-medium">Last Name</span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="border-2 border-[var(--accent)] rounded-[20px] px-4 py-3 bg-transparent text-[var(--text-primary)]"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-[var(--accent)] font-medium">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-2 border-[var(--accent)] rounded-[20px] px-4 py-3 bg-transparent text-[var(--text-primary)]"
              />
            </label>

            <button
              type="submit"
              className="self-start bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-6 py-2.5 font-medium"
            >
              Save Changes
            </button>
          </div>

          {/* Language & Appearance */}
          <div className="bg-[var(--card-bg)] rounded-[30px] shadow-lg p-6 md:p-9 flex flex-col gap-4">
            <h2 className="text-2xl font-medium text-[var(--accent)]">Language & Appearence</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-[var(--accent)] font-medium">Language</span>
                <div className="border-2 border-[var(--accent)] rounded-[20px] px-4 py-3 flex items-center justify-between text-[var(--accent)]">
                  <span>English</span>
                  <Icon icon="weui:arrow-outlined" className="w-5 h-5 rotate-90" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[var(--accent)] font-medium">Appearence</span>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="border-2 border-[var(--accent)] rounded-[20px] px-4 py-3 flex items-center justify-between text-[var(--accent)]"
                >
                  <span>{theme === "light" ? "Light Mode" : "Dark Mode"}</span>
                  <Icon icon="weui:arrow-outlined" className="w-5 h-5 rotate-90" />
                </button>
              </div>
            </div>
          </div>
        </form>

        <button
          type="button"
          onClick={logout}
          className="self-end bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-8 py-2.5 font-medium flex items-center gap-2"
        >
          <Icon icon="material-symbols:logout-rounded" className="w-8 h-8" />
          Logout
        </button>
      </div>
    </AppShell>
  );
}
