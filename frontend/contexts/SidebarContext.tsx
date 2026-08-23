"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const SIDEBAR_KEY = "calibrate:sidebar_expanded";

interface SidebarContextValue {
  expanded: boolean;
  toggle: () => void;
  /** False until localStorage has been read, so the width can be set without animating. */
  mounted: boolean;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

/**
 * The rail and the page content both have to know the collapsed state: the sidebar is
 * fixed, so the content clears it with a left margin, and that margin has to shrink with
 * the rail. Keeping the state inside Sidebar meant the content could never follow it.
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    function restore() {
      setExpanded(window.localStorage.getItem(SIDEBAR_KEY) !== "0");
      setMounted(true);
    }
    restore();
  }, []);

  function toggle() {
    setExpanded((open) => {
      window.localStorage.setItem(SIDEBAR_KEY, open ? "0" : "1");
      return !open;
    });
  }

  return (
    <SidebarContext.Provider value={{ expanded, toggle, mounted }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
