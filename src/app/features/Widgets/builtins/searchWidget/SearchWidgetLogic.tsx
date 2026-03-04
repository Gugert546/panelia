import { useEffect, useMemo, useState } from "react";

import googleLogo from "/src/assets/google-logo.png";
import bingLogo from "/src/assets/bing-logo.svg";
import ddgLogo from "/src/assets/duckduckgo-logo.svg";

type EngineKey = "google" | "bing" | "duckduckgo";

const STORAGE_KEY = "panelia_search_engine_v1";

const ENGINES: Record<
  EngineKey,
  { label: string; icon: string; buildUrl: (q: string) => string }
> = {
  google: {
    label: "Google",
    icon: googleLogo,
    buildUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  bing: {
    label: "Bing",
    icon: bingLogo,
    buildUrl: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  },
  duckduckgo: {
    label: "DuckDuckGo",
    icon: ddgLogo,
    buildUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  },
};

export function useSearchWidget() {
  const [query, setQuery] = useState("");
  const [engine, setEngine] = useState<EngineKey>("google");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as EngineKey | null;
    if (saved && ENGINES[saved]) setEngine(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, engine);
  }, [engine]);

  const engineInfo = useMemo(() => ENGINES[engine], [engine]);

  function search() {
    const q = query.trim();
    if (!q) return;
    window.open(ENGINES[engine].buildUrl(q), "_blank", "noopener,noreferrer");
    setMenuOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") search();
    if (e.key === "Escape") setMenuOpen(false);
  }

  function toggleMenu() {
    setMenuOpen((v) => !v);
  }

  function chooseEngine(next: EngineKey) {
    setEngine(next);
    setMenuOpen(false);
  }

  return {
    state: {
      query,
      engine,
      engineInfo,
      menuOpen,
      engines: ENGINES,
    },
    actions: {
      setQuery,
      search,
      handleKeyDown,
      toggleMenu,
      chooseEngine,
      closeMenu: () => setMenuOpen(false),
    },
  };
}