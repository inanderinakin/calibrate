"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";

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
    <main className="min-h-screen flex flex-col bg-[var(--page-bg)] p-6 md:p-10 lg:p-14">
      <div className="mb-6 flex justify-start">
        <BackButton fallbackHref="/" />
      </div>

      <div className="flex flex-1 items-center justify-center">
        <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-card w-full max-w-md flex flex-col gap-4 rounded-[24px] p-8"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-semibold text-[var(--text-primary)]"
        >
          Create your account
        </motion.h1>

        <input
          required
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="glass-input rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
        />
        <input
          required
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="glass-input rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="glass-input rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
        />
        <input
          required
          placeholder="Field of study"
          value={studyField}
          onChange={(e) => setStudyField(e.target.value)}
          className="glass-input rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
        />

        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)] py-2.5 font-medium mt-2"
        >
          Sign up
        </motion.button>
        </motion.form>
      </div>
    </main>
  );
}
