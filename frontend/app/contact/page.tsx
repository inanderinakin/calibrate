"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/Icon";
import LegalPage from "@/components/LegalPage";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { sendContactMessage } from "@/lib/api";

export default function ContactPage() {
  const { language } = useLanguage();
  const t = getTranslations(language).legal.contact;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError(t.empty);
      return;
    }

    if (!email.includes("@") || !email.split("@").pop()?.includes(".")) {
      setError(t.invalidEmail);
      return;
    }

    setSending(true);

    try {
      await sendContactMessage(name.trim(), email.trim(), message.trim(), website);
      setSent(true);
    }
    catch {
      setError(t.failed);
    }
    finally {
      setSending(false);
    }
  }

  const field = "glass-input w-full rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]";

  return (
    <LegalPage>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-(--text-primary) md:text-4xl">{t.title}</h1>
          <p className="text-(--text-secondary)">{t.intro}</p>
        </header>

        {sent ? (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card flex items-center gap-3 rounded-[20px] border-2 border-(--accent-2) p-5 font-semibold text-(--text-primary)"
          >
            <Icon icon="lets-icons:check-fill" className="h-6 w-6 shrink-0 text-(--accent-2)" />
            {t.sent}
          </motion.p>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 rounded-[24px] p-6 md:p-8">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-name" className="text-sm font-medium text-(--text-primary)">
                {t.name}
              </label>
              <input
                id="contact-name"
                required
                maxLength={100}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={field}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-email" className="text-sm font-medium text-(--text-primary)">
                {t.email}
              </label>
              <input
                id="contact-email"
                required
                type="email"
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-message" className="text-sm font-medium text-(--text-primary)">
                {t.message}
              </label>
              <textarea
                id="contact-message"
                required
                rows={6}
                maxLength={4000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.messagePlaceholder}
                className={field}
              />
            </div>

            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
            />

            {error && (
              <p role="alert" className="rounded-lg border border-(--accent-2) px-4 py-2.5 text-sm font-medium text-(--text-primary)">
                {error}
              </p>
            )}

            <motion.button
              type="submit"
              disabled={sending}
              whileHover={sending ? undefined : { scale: 1.02 }}
              whileTap={sending ? undefined : { scale: 0.97 }}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-(--accent-bg) py-2.5 font-medium text-(--accent-text) disabled:opacity-70"
            >
              {sending && <Icon icon="cuida:loading-left-outline" className="h-5 w-5 animate-spin-ccw" />}
              {sending ? t.sending : t.submit}
            </motion.button>
          </form>
        )}
      </div>
    </LegalPage>
  );
}
