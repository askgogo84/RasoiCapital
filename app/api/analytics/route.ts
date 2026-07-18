// app/api/analytics/route.ts
// Aggregates the seeded portfolio for the Analytics dashboard charts.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: loans, error } = await supabaseAdmin
      .from("active_loans")
      .select("principal_amount_inr, outstanding_principal, total_paid, total_overdue, current_dpd, dpd_bucket, status, interest_rate_pct, tenure_months, disbursed_at, outlet_id");
    if (error) throw new Error(error.message);
    const L = loans ?? [];

    // KPIs
    const totalDisbursed = L.reduce((s, l) => s + Number(l.principal_amount_inr || 0), 0);
    const totalOutstanding = L.reduce((s, l) => s + Number(l.outstanding_principal || 0), 0);
    const totalCollected = L.reduce((s, l) => s + Number(l.total_paid || 0), 0);
    const overdueAmt = L.reduce((s, l) => s + Number(l.total_overdue || 0), 0);
    const activeCount = L.filter(l => l.status === "active").length;
    const npaCount = L.filter(l => l.status === "npa").length;
    // Portfolio at risk = outstanding on any loan with dpd > 0, / total outstanding
    const parOutstanding = L.filter(l => Number(l.current_dpd) > 0).reduce((s, l) => s + Number(l.outstanding_principal || 0), 0);
    const par = totalOutstanding > 0 ? (parOutstanding / totalOutstanding) * 100 : 0;

    // DPD bucket distribution (count + outstanding)
    const bucketOrder = ["current","soft","early","hard","npa_l1","npa_l2"];
    const bucketLabels: Record<string,string> = { current:"Current", soft:"Soft (1-15)", early:"Early (16-30)", hard:"Hard (31-60)", npa_l1:"NPA L1 (61-90)", npa_l2:"NPA L2 (90+)" };
    const byBucket = bucketOrder.map(b => ({
      bucket: bucketLabels[b],
      count: L.filter(l => l.dpd_bucket === b).length,
      outstanding: L.filter(l => l.dpd_bucket === b).reduce((s,l)=>s+Number(l.outstanding_principal||0),0),
    })).filter(x => x.count > 0);

    // Disbursement trend by month
    const byMonth: Record<string, number> = {};
    for (const l of L) {
      if (!l.disbursed_at) continue;
      const m = new Date(l.disbursed_at).toISOString().slice(0,7);
      byMonth[m] = (byMonth[m] || 0) + Number(l.principal_amount_inr || 0);
    }
    const trend = Object.entries(byMonth).sort().map(([month, amount]) => ({ month, amount }));

    // Loan size distribution
    const sizeBuckets = [
      { label: "₹2-2.5L", min: 200000, max: 250000 },
      { label: "₹2.5-3L", min: 250000, max: 300000 },
      { label: "₹3-4L", min: 300000, max: 400000 },
      { label: "₹4L+", min: 400000, max: Infinity },
    ].map(b => ({ label: b.label, count: L.filter(l => Number(l.principal_amount_inr) >= b.min && Number(l.principal_amount_inr) < b.max).length }))
     .filter(x => x.count > 0);

    return NextResponse.json({
      kpis: {
        totalDisbursed, totalOutstanding, totalCollected, overdueAmt,
        activeCount, npaCount, loanCount: L.length,
        par: Math.round(par * 10) / 10,
        avgTicket: L.length ? Math.round(totalDisbursed / L.length) : 0,
      },
      byBucket, trend, sizeBuckets,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "analytics failed", detail: String(err?.message ?? err) }, { status: 500 });
  }
}
