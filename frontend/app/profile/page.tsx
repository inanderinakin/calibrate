"use client";

import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="p-6 md:p-10 lg:p-14 flex flex-col gap-6">
        <header>
          <h1 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)]">Profile</h1>
          <p className="text-[var(--text-primary)] mt-2">
            Manage your Account and view achievements
          </p>
        </header>

        <div className="bg-[var(--card-bg)] rounded-[30px] shadow-lg p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start relative">
          <div className="w-40 h-44 rounded-[20px] border-2 border-(--accent-bg) bg-[rgba(171,171,171,0.3)] flex items-center justify-center shrink-0">
            <Icon icon="iconamoon:profile-thin" className="w-24 h-24 text-(--accent-bg)" />
          </div>

          <div className="flex-1 flex flex-col gap-6 w-full">
            <h2 className="text-3xl md:text-4xl font-bold text-(--accent-bg)">
              {user ? `${user.firstName} ${user.lastName}` : "Guest"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <Icon icon="mynaui:mail-solid" className="w-9 h-9 text-(--accent-bg) shrink-0" />
                <div>
                  <p className="font-bold text-(--accent-bg)">Email</p>
                  <a
                    href={`mailto:${user?.email ?? ""}`}
                    className="text-(--accent-bg) underline"
                  >
                    {user?.email ?? "—"}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Icon icon="weui:location-outlined" className="w-9 h-9 text-(--accent-bg) shrink-0" />
                <div>
                  <p className="font-bold text-(--accent-bg)">Location</p>
                  <p className="text-(--accent-bg)">Algeria</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Icon icon="solar:calendar-outline" className="w-9 h-9 text-(--accent-bg) shrink-0" />
                <div>
                  <p className="font-bold text-(--accent-bg)">Joined</p>
                  {/* TODO: replace with real signup date once the backend exists */}
                  <p className="text-(--accent-bg)">—</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Icon icon="solar:cup-bold" className="w-9 h-9 text-(--accent-bg) shrink-0" />
                <div>
                  <p className="font-bold text-(--accent-bg)">Achievements</p>
                  {/* TODO: replace with real progress once the backend exists */}
                  <p className="text-(--accent-bg)">—</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="self-start bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-8 py-3 font-medium"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
