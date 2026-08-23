"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

interface BackButtonProps {
  fallbackHref: string;
  label?: string;
  className?: string;
}

export default function BackButton({
  fallbackHref,
  label,
  className = "",
}: BackButtonProps) {
  const router = useRouter();
  const { language } = useLanguage();
  // A default parameter cannot call a hook, which is how "Back" stayed English on
  // every page in both languages: no caller has ever passed a label.
  const text = label ?? getTranslations(language).common.back;

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
      className={`glass flex h-10 w-fit items-center gap-2 rounded-[20px] px-4 text-(--text-primary) transition-colors hover:text-(--accent-2) ${className}`}
    >
      <Icon
        icon="weui:arrow-outlined"
        className="h-5 w-5 rotate-180"
      />
      <span className="font-black">{text}</span>
    </motion.button>
  );
}
