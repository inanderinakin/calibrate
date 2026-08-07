"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // TODO: call the real auth endpoint and login(res.user) with its response.
    // For now restore the saved profile so the account information that was
    // updated in Settings survives a logout.
    login({
      email,
      firstName: "",
      lastName: "",
      studyField: "",
    });

    router.push("/upload_cv");
  }

  function handleSocialLogin(provider: string) {
    // TODO: wire this up to a real OAuth flow once the backend exists.
    login({
      email: `${provider.toLowerCase()}@example.com`,
      firstName: "",
      lastName: "",
      studyField: "",
    });

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
          Log in
        </motion.h1>

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
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="glass-input rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
        />

        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)] py-2.5 font-medium mt-2"
        >
          Log in
        </motion.button>

        <div className="flex items-center gap-3 mt-1">
          <div className="h-px flex-1 bg-[var(--text-muted)]" />
          <span className="text-sm font-medium text-[var(--text-muted)]">
            or continue with
          </span>
          <div className="h-px flex-1 bg-[var(--text-muted)]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <motion.button
            type="button"
            onClick={() => handleSocialLogin("Google")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-2.5 font-medium text-[var(--text-primary)]"
          >
            <Icon icon="flat-color-icons:google" className="h-5 w-5" />
            Google
          </motion.button>

          <motion.button
            type="button"
            onClick={() => handleSocialLogin("GitHub")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-2.5 font-medium text-[var(--text-primary)]"
          >
            <Icon icon="mdi:github" className="h-5 w-5" />
            GitHub
          </motion.button>
        </div>
        </motion.form>
      </div>
    </main>
  );
}
