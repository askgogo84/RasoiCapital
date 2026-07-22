// app/projections/format.ts — Indian-format number helpers for the model UI.
// ₹ Cr for anything ≥ 1 Cr (2dp), ₹ L otherwise, Indian digit grouping.

export function inr(n: number, dp = 2): string {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(dp)} Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(dp)} L`;
  return `${s}₹${Math.round(a).toLocaleString("en-IN")}`;
}

// Compact axis label — always in Cr (charts span crores), 1dp, no unit spam.
export function crAxis(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(0)}L`;
  return `${s}₹${Math.round(a).toLocaleString("en-IN")}`;
}

// Plain integer with Indian grouping (loan counts, heads).
export function num(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

// Percent from a fraction (0.19 -> "19.00%").
export function pct(n: number, dp = 2): string {
  return `${(n * 100).toFixed(dp)}%`;
}

// Lakhs display (tech sheet stores lakhs).
export function lakh(n: number, dp = 2): string {
  return `₹${n.toFixed(dp)} L`;
}
