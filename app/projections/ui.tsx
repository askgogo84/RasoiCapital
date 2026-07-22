// app/projections/ui.tsx — shared presentational primitives for /projections.
// Chart colours are CSS-var references so every chart follows the dark/light theme.
"use client";
import React from "react";

export const CH = {
  cyan: "var(--rc-cyan)",
  lime: "var(--rc-lime)",
  amber: "var(--rc-amber)",
  red: "var(--rc-red)",
  dim: "var(--rc-dim)",
  line: "var(--rc-line)",
  fg: "var(--rc-fg)",
  panel2: "var(--rc-panel2)",
};

// Recharts tooltip styled to the theme.
export const tooltipStyle = {
  background: "var(--rc-panel2)",
  border: "1px solid var(--rc-line)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--rc-fg)",
} as const;
export const tooltipLabelStyle = { color: "var(--rc-fg)" } as const;
export const tooltipItemStyle = { color: "var(--rc-fg)" } as const;

// A titled section anchor. `id` powers the in-page nav scroll.
export function Section({
  id,
  title,
  eyebrow,
  children,
  action,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section id={id} className="rc-proj-section" style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 16 }}>
        <div>
          {eyebrow && <div className="rc-eyebrow">{eyebrow}</div>}
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--rc-fg)", marginTop: 4 }}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// A chart wrapped in the width-safe panel pattern (min-width:0 host).
export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rc-panel" style={{ minWidth: 0 }}>
      <div className="rc-panel-title">{title}</div>
      <div style={{ width: "100%", minWidth: 0 }}>{children}</div>
    </div>
  );
}

// KPI card showing one metric across Y1/Y2/Y3.
export function KpiCard({
  label,
  rows,
}: {
  label: string;
  rows: { year: string; value: string; tone?: string; strong?: boolean }[];
}) {
  return (
    <div className="rc-panel" style={{ padding: "16px 18px" }}>
      <div className="rc-panel-title" style={{ marginBottom: 12 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.year} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="rc-mono" style={{ fontSize: 11, color: "var(--rc-dim)" }}>{r.year}</span>
            <span
              className="rc-mono"
              style={{ fontSize: r.strong ? 19 : 15, fontWeight: r.strong ? 700 : 500, color: r.tone || "var(--rc-fg)" }}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
