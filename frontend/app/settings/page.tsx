"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import { useAuth, clearStoredProfile } from "@/contexts/AuthContext";
import { deleteAccount, updateProfile } from "@/lib/api";
import { session } from "@/lib/session";
import { tokens } from "@/lib/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

const HOLD_TO_DELETE_MS = 5000;

export default function SettingsPage() {
  const router = useRouter();

  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdFrame = useRef<number | null>(null);
  const holdFromKeyboard = useRef(false);

  function stopHold() {
    if (holdFrame.current !== null) cancelAnimationFrame(holdFrame.current);
    holdFrame.current = null;
    holdFromKeyboard.current = false;
    setHoldProgress(0);
  }

  // Safari does not focus a button when you press it, so pressing the autofocused
  // button fired blur and killed the hold that pointerdown had just started. Only
  // a keyboard hold cares about focus leaving.
  function stopHoldOnBlur() {
    if (holdFromKeyboard.current) stopHold();
  }

  function startHold(fromKeyboard = false) {
    if (deleting || holdFrame.current !== null) return;

    holdFromKeyboard.current = fromKeyboard;

    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / HOLD_TO_DELETE_MS, 1);

      if (progress >= 1) {
        stopHold();
        handleDelete();
        return;
      }

      setHoldProgress(progress);
      holdFrame.current = requestAnimationFrame(tick);
    };

    holdFrame.current = requestAnimationFrame(tick);
  }

  useEffect(() => stopHold, []);

  function closeConfirm() {
    stopHold();
    setConfirmingDelete(false);
    setDeleteError(null);
  }

  useEffect(() => {
    if (!confirmingDelete) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleting) closeConfirm();
    }

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [confirmingDelete, deleting]);

  const t = getTranslations(language).settings;

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    setSaving(true);
    setSaveError(null);
    setSaved(false);

    try {
      const result = await updateProfile(firstName, lastName);

      updateUser({
        firstName: result.first_name,
        lastName: result.last_name,
      });

      setSaved(true);
    }
    catch (err) {
      setSaveError(err instanceof Error ? err.message : t.saveFailed);
    }
    finally {
      setSaving(false);
    }
  }

  function handleLanguageChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    setLanguage(e.target.value as Language);
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount();

      tokens.clear();
      session.clear();
      clearStoredProfile();

      window.location.assign("/");
    }
    catch (err) {
      setDeleteError(err instanceof Error ? err.message : t.deleteFailed);
      setDeleting(false);
    }
  }

  function handleLogout() {
    logout();

    /*
     * Redirect to app/page.tsx
     */
    router.push("/");
  }

  return (
    <AppShell backHref="/dashboard">
      <div className="flex flex-col gap-6 max-w-4xl">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)]">
            {t.settings}
          </h1>

          <p className="text-[var(--text-primary)] mt-2">
            {t.subtitle}
          </p>
        </motion.header>

        <motion.form
          onSubmit={handleSave}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col gap-6"
        >
          {/* Profile information */}
          <div className="glass-card rounded-[30px] shadow-lg p-6 md:p-9 flex flex-col gap-6">
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
                  className="glass-input border-2 border-(--accent-bg) rounded-[20px] px-4 py-3 text-[var(--text-primary)] outline-none"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-(--accent-bg) font-medium">
                  {t.lastName}
                </span>

                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="glass-input border-2 border-(--accent-bg) rounded-[20px] px-4 py-3 text-[var(--text-primary)] outline-none"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-(--accent-bg) font-medium">
                {t.email}
              </span>

              <input
                type="email"
                value={user?.email ?? ""}
                readOnly
                className="glass-input border-2 border-(--accent-bg) rounded-[20px] px-4 py-3 text-[var(--text-primary)] outline-none opacity-60 cursor-not-allowed"
              />
            </label>

            {saveError && (
              <p role="alert" className="rounded-[20px] border-2 border-(--accent-2) px-4 py-3 font-medium text-[var(--text-primary)]">
                {saveError}
              </p>
            )}

            {saved && !saveError && (
              <p className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                <Icon icon="mdi:check-circle-outline" className="w-5 h-5" />
                {t.saved}
              </p>
            )}

            <motion.button
              type="submit"
              disabled={saving}
              whileHover={saving ? undefined : { scale: 1.02 }}
              whileTap={saving ? undefined : { scale: 0.97 }}
              className="self-end bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-6 py-2.5 font-medium disabled:opacity-60"
            >
              {saving ? t.saving : t.saveChanges}
            </motion.button>
          </div>

          {/* Language & Appearance */}
          <div className="glass-card rounded-[30px] shadow-lg p-6 md:p-9 flex flex-col gap-4">
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
                    className="w-full bg-transparent outline-none cursor-pointer text-(--accent-bg) appearance-none"
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
        </motion.form>

        <div className="self-end flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <motion.button
            type="button"
            onClick={() => { setConfirmingDelete(true); setDeleteError(null); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="bg-(--danger) text-(--on-danger) rounded-[20px] px-8 py-2.5 font-medium flex items-center justify-center gap-2"
          >
            <Icon icon="mdi:trash-can-outline" className="w-7 h-7" />
            {t.deleteAccount}
          </motion.button>

          <motion.button
            type="button"
            onClick={handleLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-8 py-2.5 font-medium flex items-center justify-center gap-2"
          >
            <Icon
              icon="material-symbols:logout-rounded"
              className="w-8 h-8"
            />

            {t.logout}
          </motion.button>
        </div>
      </div>

      {confirmingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onPointerDown={(e) => { if (e.target === e.currentTarget && !deleting) closeConfirm(); }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-[24px] bg-[var(--card-bg)] p-6 md:p-8 shadow-2xl flex flex-col gap-4 text-center"
          >
            <h2 id="delete-title" className="text-2xl font-bold text-(--danger)">
              {t.deleteAccount}
            </h2>

            <p className="text-[var(--text-primary)]">
              {t.deleteExplanation}
            </p>

            <p className="font-bold text-[var(--text-primary)]">
              {t.deleteConfirmQuestion}
            </p>

            {deleteError && (
              <p role="alert" className="rounded-[16px] border-2 border-(--danger) px-4 py-3 font-medium text-[var(--text-primary)]">
                {deleteError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={deleting}
                onPointerDown={() => startHold()}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    startHold(true);
                  }
                }}
                onKeyUp={stopHold}
                onBlur={stopHoldOnBlur}
                className="relative flex-1 overflow-hidden rounded-[20px] bg-(--danger) px-6 py-3 font-bold text-(--on-danger) disabled:opacity-60 touch-none select-none"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-black/30"
                  style={{ width: `${holdProgress * 100}%` }}
                />

                <span className="relative">
                  {deleting
                    ? t.deleting
                    : holdProgress > 0
                      ? t.keepHolding
                      : t.deleteConfirm}
                </span>
              </button>

              <button
                type="button"
                autoFocus
                onClick={closeConfirm}
                disabled={deleting}
                className="rounded-[20px] border-2 border-(--accent-bg) px-6 py-3 font-medium text-(--accent-bg) disabled:opacity-60"
              >
                {t.cancel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AppShell>
  );
}