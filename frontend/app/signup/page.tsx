"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();

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
          Create your account
        </h1>

        <input
          required
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 bg-[var(--input-bg)] text-[var(--text-primary)]"
        />
        <input
          required
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 bg-[var(--input-bg)] text-[var(--text-primary)]"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 bg-[var(--input-bg)] text-[var(--text-primary)]"
        />
        <input
          required
          placeholder="Field of study"
          value={studyField}
          onChange={(e) => setStudyField(e.target.value)}
          className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 bg-[var(--input-bg)] text-[var(--text-primary)]"
        />

        <button
          type="submit"
          className="rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)] py-2.5 font-medium mt-2"
        >
          Sign up
        </button>
      </form>
    </main>
  );
}
