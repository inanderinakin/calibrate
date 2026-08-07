"use client";

import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
export default function ProfilePage() {
  const { user } = useAuth();

  const joinedDate = user?.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <AppShell backHref="/dashboard">
      <div className="flex flex-col gap-6">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)]">Profile</h1>
          <p className="text-[var(--text-primary)] mt-2">
            Manage your Account and view achievements
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
                  <p className="text-(--accent-bg)">
                    {joinedDate ?? "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Icon icon="solar:cup-bold" className="w-9 h-9 text-(--accent-bg) shrink-0" />
                <div>
                  <p className="font-bold text-(--accent-bg)">Achievements</p>
                  {/* TODO: replace with real progress once the backend exists */}
                  <p className="text-(--accent-bg)">—</p>
                  <p className="text-(--accent-bg) text-sm">In progress</p>
                </div>
              </div>
            </div>

            <Link
              href="/settings"
              className="btn-hover self-start bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-8 py-3 font-medium flex items-center gap-2"
            >
              Edit Profile

              <Icon icon="solar:settings-linear" className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
