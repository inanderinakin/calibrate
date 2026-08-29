"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import { useAuth, clearStoredProfile } from "@/contexts/AuthContext";
import { changePassword, deleteAccount, getProfile, updateProfile } from "@/lib/api";
import SuggestInput from "@/components/SuggestInput";
import PasswordRules, { passwordMeetsRules } from "@/components/PasswordRules";
import { countryAliases, countryLabel, countrySuggestions, isKnownCountry, toStoredCountry } from "@/lib/countries";
import { isKnownStudyField, studyFieldSuggestions } from "@/lib/studyFields";
import { session } from "@/lib/session";
import { clearAnalysisMarker } from "@/lib/useRestoreAnalysis";
import { identityProviders, readClaims, tokens } from "@/lib/tokens";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { duration, ease } from "@/lib/motion";

const HOLD_TO_DELETE_MS = 5000;

// Drawn in CSS rather than with an Icon: an icon resolves its SVG after mount,
// so it measures 0 wide for a frame and shoves the label sideways on every
// keystroke. Kept in the layout when there is nothing to flag, for the same reason.
function UnsavedDot({ on, title }: { on: boolean; title: string }) {
  return (
    <span
      title={on ? title : undefined}
      aria-label={on ? title : undefined}
      role={on ? "img" : undefined}
      className={`h-2 w-2 shrink-0 rounded-full bg-(--warning) ${on ? "" : "invisible"}`}
    />
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const { user, updateUser, logout } = useAuth();
  const { language } = useLanguage();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [country, setCountry] = useState(countryLabel(user?.country ?? "", language));
  const [studyField, setStudyField] = useState(user?.studyField ?? "");
  const [original, setOriginal] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    country: countryLabel(user?.country ?? "", language),
    studyField: user?.studyField ?? "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  // Read after mount rather than during render: the token lives in localStorage,
  // which is not there on the server, so deciding this inline would render the
  // form once and then swap it out.
  const [signInProvider, setSignInProvider] = useState<string | null>(null);
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

  useEffect(() => {
    const idToken = tokens.getIdToken();
    if (!idToken) return;

    setSignInProvider(identityProviders(readClaims(idToken))[0] ?? null);
  }, []);

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
  const legalText = getTranslations(language).legal;

  // The account is the source of truth. These two used to live only in
  // localStorage, so a new device showed them empty however often they were saved.
  useEffect(() => {
    if (!tokens.getIdToken()) return;

    getProfile()
      .then((saved) => {
        const savedCountry = saved.country ? countryLabel(saved.country, language) : "";
        if (saved.country) setCountry(savedCountry);
        if (saved.study_field) setStudyField(saved.study_field);

        setOriginal((prev) => ({
          ...prev,
          country: saved.country ? savedCountry : prev.country,
          studyField: saved.study_field || prev.studyField,
        }));
      })
      .catch(() => {});
  }, [language]);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();

    setPasswordChanged(false);

    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordMismatch);
      return;
    }

    setChangingPassword(true);
    setPasswordError(null);

    try {
      await changePassword(currentPassword, newPassword);

      setPasswordChanged(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    catch (err) {
      setPasswordError(err instanceof Error ? err.message : t.passwordFailed);
    }
    finally {
      setChangingPassword(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    setSaveError(null);
    setSaved(false);

    if (!isKnownStudyField(studyField)) {
      setSaveError(t.invalidStudyField);
      return;
    }

    if (!isKnownCountry(country, language)) {
      setSaveError(t.invalidCountry);
      return;
    }

    setSaving(true);

    try {
      const result = await updateProfile(
        firstName,
        lastName,
        toStoredCountry(country, language),
        studyField
      );

      updateUser({
        firstName: result.first_name,
        lastName: result.last_name,
        country: result.country,
        studyField: result.study_field,
      });

      setCountry(countryLabel(result.country, language));

      setOriginal({
        firstName: result.first_name,
        lastName: result.last_name,
        country: countryLabel(result.country, language),
        studyField: result.study_field,
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

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount();

      // Before tokens.clear(): the marker is keyed by the account, so dropping the
      // token first would leave it behind with no way to name it.
      clearAnalysisMarker();
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

  const changed = {
    firstName: firstName !== original.firstName,
    lastName: lastName !== original.lastName,
    country: country !== original.country,
    studyField: studyField !== original.studyField,
  };

  const hasChanges = Object.values(changed).some(Boolean);

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
                <span className="flex items-center gap-1.5 text-(--accent-bg) font-medium">
                  <UnsavedDot on={changed.firstName} title={t.unsavedChange} />
                  {t.firstName}
                </span>

                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="glass-input border-2 border-(--accent-bg) rounded-[20px] px-4 py-3 text-[var(--text-primary)] outline-none"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-(--accent-bg) font-medium">
                  <UnsavedDot on={changed.lastName} title={t.unsavedChange} />
                  {t.lastName}
                </span>

                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="glass-input border-2 border-(--accent-bg) rounded-[20px] px-4 py-3 text-[var(--text-primary)] outline-none"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SuggestInput
                id="settings-country"
                label={t.country}
                value={country}
                onChange={setCountry}
                suggestions={countrySuggestions(language)}
                aliases={countryAliases(language)}
                limit={countrySuggestions(language).length}
                matchMode="startsWith"
                variant="form"
                changed={changed.country}
                changedTitle={t.unsavedChange}
              />

              <SuggestInput
                id="settings-study-field"
                label={t.studyField}
                value={studyField}
                onChange={setStudyField}
                suggestions={studyFieldSuggestions(language)}
                variant="form"
                changed={changed.studyField}
                changedTitle={t.unsavedChange}
              />
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
              disabled={saving || !hasChanges}
              whileHover={saving || !hasChanges ? undefined : { scale: 1.02 }}
              whileTap={saving || !hasChanges ? undefined : { scale: 0.97 }}
              className="self-end bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-6 py-2.5 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? t.saving : t.saveChanges}
            </motion.button>
          </div>

        </motion.form>

        {signInProvider ? (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="glass-card rounded-[30px] shadow-lg p-6 md:p-9 flex flex-col gap-2"
          >
            <h2 className="text-2xl font-medium text-(--accent-bg) flex items-center gap-2">
              <Icon icon="mdi:google" className="w-7 h-7" />
              {t.passwordManagedByProvider}
            </h2>
            <p className="text-sm text-(--text-muted)">{t.passwordManagedByProviderHint}</p>
          </motion.section>
        ) : (
        <motion.form
          onSubmit={handleChangePassword}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass-card rounded-[30px] shadow-lg p-6 md:p-9 flex flex-col gap-6"
        >
          <div>
            <h2 className="text-2xl font-medium text-(--accent-bg)">
              {t.changePassword}
            </h2>
            <p className="mt-1 text-sm text-(--text-muted)">{t.changePasswordHint}</p>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-(--accent-bg) font-medium">{t.currentPassword}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="glass-input border-2 border-(--accent-bg) rounded-[20px] px-4 py-3 text-[var(--text-primary)] outline-none"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-(--accent-bg) font-medium">{t.newPassword}</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="glass-input border-2 border-(--accent-bg) rounded-[20px] px-4 py-3 text-[var(--text-primary)] outline-none"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-(--accent-bg) font-medium">{t.confirmPassword}</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass-input border-2 border-(--accent-bg) rounded-[20px] px-4 py-3 text-[var(--text-primary)] outline-none"
              />
            </label>
          </div>

          <PasswordRules value={newPassword} />

          {passwordError && (
            <p role="alert" className="rounded-[20px] border-2 border-(--accent-2) px-4 py-3 font-medium text-[var(--text-primary)]">
              {passwordError}
            </p>
          )}

          {passwordChanged && !passwordError && (
            <p className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
              <Icon icon="mdi:check-circle-outline" className="w-5 h-5" />
              {t.passwordChanged}
            </p>
          )}

          <motion.button
            type="submit"
            disabled={changingPassword || !currentPassword || !passwordMeetsRules(newPassword)}
            whileHover={changingPassword ? undefined : { scale: 1.02 }}
            whileTap={changingPassword ? undefined : { scale: 0.97 }}
            className="self-end bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-6 py-2.5 font-medium disabled:opacity-60"
          >
            {changingPassword ? t.changingPassword : t.changePassword}
          </motion.button>
        </motion.form>
        )}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card rounded-[30px] shadow-lg p-6 md:p-9 flex flex-col gap-4"
        >
          <div>
            <h2 className="text-2xl font-medium text-(--accent-bg)">
              {legalText.settingsHeading}
            </h2>
            <p className="mt-1 text-sm text-(--text-muted)">{legalText.settingsNote}</p>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <Link href="/privacy" className="font-medium text-(--accent-2) underline underline-offset-2">
              {legalText.footer.privacy}
            </Link>

            <Link href="/terms" className="font-medium text-(--accent-2) underline underline-offset-2">
              {legalText.footer.terms}
            </Link>

            <Link href="/kvkk" className="font-medium text-(--accent-2) underline underline-offset-2">
              {legalText.footer.kvkk}
            </Link>

            <Link href="/contact" className="font-medium text-(--accent-2) underline underline-offset-2">
              {legalText.footer.contact}
            </Link>
          </div>
        </motion.section>

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
            transition={{ duration: duration.fast, ease: ease.smoothOut }}
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
