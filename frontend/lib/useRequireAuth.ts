"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tokens } from "@/lib/tokens";

export function useRequireAuth() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (tokens.getIdToken()) {
      setAllowed(true);
      return;
    }

    router.replace("/login");
  }, [router]);

  return allowed;
}
