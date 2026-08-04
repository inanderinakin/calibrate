"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { language } = useLanguage();
  const t = getTranslations(language);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [studyField, setStudyField] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // TODO: replace with a real API call once the backend exists, e.g.
    // const res = await fetch("/api/signup", { method: "POST", body: ... });
    // then call login(res.user) with the server's response instead of
    // the raw form values below.
    login({ firstName, lastName, email, studyField });

    router.push("/upload_cv");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--page-bg)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md flex flex-col gap-4"
      >
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {t.signup.title}
        </h1>

        <input
          required
          placeholder={t.signup.firstName}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 bg-[var(--input-bg)] text-[var(--text-primary)]"
        />
        <input
          required
          placeholder={t.signup.lastName}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 bg-[var(--input-bg)] text-[var(--text-primary)]"
        />
        <input
          required
          type="email"
          placeholder={t.signup.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 bg-[var(--input-bg)] text-[var(--text-primary)]"
        />
        <input
          required
          placeholder={t.signup.fieldOfStudy}
          value={studyField}
          onChange={(e) => setStudyField(e.target.value)}
          className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 bg-[var(--input-bg)] text-[var(--text-primary)]"
        />

        <button
          type="submit"
          className="rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)] py-2.5 font-medium mt-2"
        >
          {t.signup.submit}
        </button>
      </form>
    </main>
  );
}
