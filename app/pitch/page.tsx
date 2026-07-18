// app/pitch/page.tsx — investor pitch, embedded inside the sidebar shell.
// For now this iframes the existing static deck at /pitch.html (kept in /public).
// A later task will rebuild the deck content as native React.
export const metadata = { title: "Pitch Deck — Rasoi Capital" };

export default function PitchPage() {
  return (
    <div className="rc-page rc-page--flush">
      <iframe
        src="/pitch.html"
        title="Rasoi Capital — Investor Pitch"
        className="rc-pitch-frame"
      />
    </div>
  );
}
