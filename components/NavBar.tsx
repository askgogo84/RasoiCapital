// components/NavBar.tsx — themed top nav (rc-nav) with active link highlighting + theme toggle.
"use client";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/underwrite",   label: "Underwrite",   icon: "🧠" },
  { href: "/applications", label: "Applications", icon: "📋" },
  { href: "/loans",        label: "Active Loans", icon: "💰" },
  { href: "/collections",  label: "Collections",  icon: "📞" },
  { href: "/analytics",    label: "Analytics",    icon: "📊" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="rc-nav sticky top-0 z-50">
      <div style={{ display: "flex", alignItems: "center", gap: 24, minWidth: 0 }}>
        <span className="rc-nav-brand" style={{ whiteSpace: "nowrap" }}>
          🍽️ Rasoi<span> Capital</span>
        </span>
        <div className="rc-nav-links" style={{ overflowX: "auto" }}>
          {NAV.map((n) => {
            const active = pathname === n.href || pathname?.startsWith(n.href + "/");
            return (
              <a key={n.href} href={n.href}
                 className={`rc-nav-link${active ? " active" : ""}`}
                 style={{ whiteSpace: "nowrap" }}>
                <span style={{ marginRight: 6 }}>{n.icon}</span>{n.label}
              </a>
            );
          })}
        </div>
      </div>
      <div className="rc-nav-right">
        <ThemeToggle />
        <span className="rc-demo-pill">Demo Mode</span>
      </div>
    </nav>
  );
}
