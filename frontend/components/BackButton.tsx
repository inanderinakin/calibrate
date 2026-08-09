"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";

interface BackButtonProps {
  fallbackHref: string;
  label?: string;
  className?: string;
}

export default function BackButton({
  fallbackHref,
  label = "Back",
  className = "",
}: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleBack}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ x: -3, scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className={`glass flex w-fit items-center gap-2 rounded-[20px] px-4 py-2.5 text-(--text-primary) transition-colors hover:text-(--accent-2) ${className}`}
    >
      <Icon
        icon="weui:arrow-outlined"
        className="h-5 w-5 rotate-180"
      />
      <span className="font-black">{label}</span>
    </motion.button>
  );
}
