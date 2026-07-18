// app/projections/page.tsx — placeholder so the sidebar link resolves.
// Real financial projections content lands in a later task.
export const metadata = { title: "Financial Projections — Rasoi Capital" };

export default function ProjectionsPage() {
  return (
    <div className="rc-page">
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: "var(--rc-fg)" }}>
          Financial Projections
        </h1>
        <p className="rc-eyebrow" style={{ marginTop: 6 }}>
          Revenue · Book Growth · Unit Economics
        </p>
      </div>

      <div
        className="rc-panel"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
          <div className="rc-panel-title" style={{ marginBottom: 8 }}>Coming Soon</div>
          <p style={{ color: "var(--rc-dim)", fontSize: 14, maxWidth: 420 }}>
            Financial projections — coming soon. Multi-year revenue, portfolio growth,
            and unit-economics models will render here.
          </p>
        </div>
      </div>
    </div>
  );
}
