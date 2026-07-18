// components/Sidebar.tsx — left sidebar navigation (terminal-themed, collapsible).
// Order: Pitch → Underwrite → Pre-Score → Applications → Active Loans → Collections → Analytics → Financial Projections.
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Presentation, FileSearch, Radar, Files, Wallet,
  PhoneCall, BarChart3, TrendingUp, ChevronLeft, ChevronRight
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/pitch",                 label: "Pitch Deck",           icon: Presentation, group: "invest" },
  { href: "/underwrite",            label: "Underwrite",           icon: FileSearch,   group: "tool" },
  { href: "/underwrite/prescore",   label: "Pre-Score",            icon: Radar,        group: "tool" },
  { href: "/applications",          label: "Applications",         icon: Files,        group: "book" },
  { href: "/loans",                 label: "Active Loans",         icon: Wallet,       group: "book" },
  { href: "/collections",           label: "Collections",          icon: PhoneCall,    group: "book" },
  { href: "/analytics",             label: "Analytics",            icon: BarChart3,    group: "book" },
  { href: "/projections",           label: "Financial Projections",icon: TrendingUp,   group: "invest" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`rc-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="rc-sb-top">
        <Link href="/pitch" className="rc-sb-brand">
          <span className="rc-sb-logo">🍲</span>
          {!collapsed && <span className="rc-sb-name">Rasoi<b>Capital</b></span>}
        </Link>
        <button className="rc-sb-collapse" onClick={() => setCollapsed(!collapsed)} aria-label="Collapse sidebar">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="rc-sb-nav">
        {NAV.map((item, i) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href) && item.href !== "/underwrite") || pathname === item.href;
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const prevGroup = i > 0 ? NAV[i - 1].group : null;
          const showDivider = prevGroup && prevGroup !== item.group;
          return (
            <div key={item.href}>
              {showDivider && <div className="rc-sb-divider" />}
              <Link href={item.href} className={`rc-sb-link ${isActive ? "active" : ""}`} title={item.label}>
                <Icon size={18} className="rc-sb-icon" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="rc-sb-bottom">
        {!collapsed && <span className="rc-demo-pill">Demo Mode</span>}
        <ThemeToggle />
      </div>
    </aside>
  );
}
