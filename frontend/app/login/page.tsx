"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { language } = useLanguage();
  const t = getTranslations(language);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // TODO: call the real auth endpoint and login(res.user) with its response.
    console.log(email, password);

    router.push("/upload_cv");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--page-bg)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md flex flex-col gap-4"
      >
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {t.login.title}
        </h1>

        <input
          required
          type="email"
          placeholder={t.login.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 bg-[var(--input-bg)] text-[var(--text-primary)]"
        />

        <input
          required
          type="password"
          placeholder={t.login.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 bg-[var(--input-bg)] text-[var(--text-primary)]"
        />

        <button
          type="submit"
          className="rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)] py-2.5 font-medium mt-2"
        >
          {t.login.submit}
        </button>
      </form>
    </main>
  );
}