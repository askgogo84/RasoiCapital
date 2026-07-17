// components/ThemeToggle.tsx — light/dark toggle, persists choice, defaults dark.
"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("rc-theme")) as "dark" | "light" | null;
    const initial = saved ?? "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("rc-theme", next); } catch {}
  }

  return (
    <button className="rc-toggle" onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? "☾ dark" : "☀ light"}
    </button>
  );
}
