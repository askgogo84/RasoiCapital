// app/analytics/page.tsx — Power-BI-style portfolio analytics, terminal-themed.
"use client";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, LineChart, Line, CartesianGrid,
} from "recharts";

const C = { cyan:"#39C5CF", lime:"#3FB950", amber:"#D29922", red:"#F85149", dim:"#8B949E", line:"#2A3038", fg:"#E6EDF3" };
const BUCKET_COLORS: Record<string,string> = {
  "Current":"#3FB950","Soft (1-15)":"#D29922","Early (16-30)":"#D29922",
  "Hard (31-60)":"#F85149","NPA L1 (61-90)":"#F85149","NPA L2 (90+)":"#B23A2E",
};
const inr = (n:number) => n >= 10000000 ? `₹${(n/10000000).toFixed(2)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;

function KPI({ label, value, sub, tone }: { label:string; value:string; sub?:string; tone?:string }) {
  return (
    <div className="rc-panel" style={{ padding:"18px 20px" }}>
      <div className="rc-mono" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", color:"var(--rc-dim)", marginBottom:8 }}>{label}</div>
      <div className="rc-mono" style={{ fontSize:26, fontWeight:600, color: tone || "var(--rc-fg)" }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:"var(--rc-dim)", marginTop:4 }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState<string|null>(null);
  useEffect(() => {
    fetch("/api/analytics").then(r=>r.json()).then(j=>{ if(j.error) setErr(j.detail||j.error); else setD(j); }).catch(e=>setErr(String(e)));
  }, []);

  if (err) return <div className="rc-page"><div className="rc-panel" style={{color:C.red}}>Failed to load analytics: {err}</div></div>;
  if (!d) return <div className="rc-page"><div className="rc-mono" style={{color:C.dim}}>Loading portfolio analytics…</div></div>;

  const k = d.kpis;
  return (
    <div className="rc-page">
      <div className="rc-eyebrow" style={{marginBottom:6}}>Portfolio</div>
      <h1 style={{fontSize:24, fontWeight:700, marginBottom:24, color:"var(--rc-fg)"}}>Analytics Dashboard</h1>

      {/* KPI row */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:14, marginBottom:24}}>
        <KPI label="Total Disbursed" value={inr(k.totalDisbursed)} sub={`${k.loanCount} loans`} />
        <KPI label="Outstanding" value={inr(k.totalOutstanding)} tone={C.cyan} />
        <KPI label="Collected" value={inr(k.totalCollected)} tone={C.lime} />
        <KPI label="Portfolio at Risk" value={`${k.par}%`} sub="DPD > 0 / outstanding" tone={k.par > 20 ? C.red : k.par > 10 ? C.amber : C.lime} />
        <KPI label="Active / NPA" value={`${k.activeCount} / ${k.npaCount}`} tone={C.fg} />
        <KPI label="Avg Ticket" value={inr(k.avgTicket)} />
      </div>

      {/* Charts grid */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18}}>
        <div className="rc-panel">
          <div className="rc-panel-title">DPD Bucket Distribution</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={d.byBucket} dataKey="count" nameKey="bucket" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {d.byBucket.map((e:any,i:number)=><Cell key={i} fill={BUCKET_COLORS[e.bucket]||C.cyan} />)}
              </Pie>
              <Tooltip contentStyle={{background:"var(--rc-panel2)", border:`1px solid ${C.line}`, borderRadius:8, color:"var(--rc-fg)", fontSize:13}} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center", marginTop:8}}>
            {d.byBucket.map((e:any,i:number)=>(
              <span key={i} className="rc-mono" style={{fontSize:11, color:"var(--rc-dim)", display:"flex", alignItems:"center", gap:5}}>
                <span style={{width:9,height:9,borderRadius:2,background:BUCKET_COLORS[e.bucket]||C.cyan,display:"inline-block"}} />{e.bucket} · {e.count}
              </span>
            ))}
          </div>
        </div>

        <div className="rc-panel">
          <div className="rc-panel-title">Outstanding by Bucket</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={d.byBucket} layout="vertical" margin={{left:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} horizontal={false} />
              <XAxis type="number" tick={{fill:C.dim, fontSize:11}} tickFormatter={inr} />
              <YAxis type="category" dataKey="bucket" tick={{fill:C.dim, fontSize:11}} width={90} />
              <Tooltip contentStyle={{background:"var(--rc-panel2)", border:`1px solid ${C.line}`, borderRadius:8, color:"var(--rc-fg)", fontSize:13}} formatter={(v:any)=>inr(v)} />
              <Bar dataKey="outstanding" radius={[0,4,4,0]}>
                {d.byBucket.map((e:any,i:number)=><Cell key={i} fill={BUCKET_COLORS[e.bucket]||C.cyan} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:18}}>
        <div className="rc-panel">
          <div className="rc-panel-title">Disbursement Trend</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={d.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
              <XAxis dataKey="month" tick={{fill:C.dim, fontSize:11}} />
              <YAxis tick={{fill:C.dim, fontSize:11}} tickFormatter={inr} />
              <Tooltip contentStyle={{background:"var(--rc-panel2)", border:`1px solid ${C.line}`, borderRadius:8, color:"var(--rc-fg)", fontSize:13}} formatter={(v:any)=>inr(v)} />
              <Line type="monotone" dataKey="amount" stroke={C.cyan} strokeWidth={2.5} dot={{fill:C.cyan, r:4}} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rc-panel">
          <div className="rc-panel-title">Loan Size Distribution</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.sizeBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="label" tick={{fill:C.dim, fontSize:11}} />
              <YAxis tick={{fill:C.dim, fontSize:11}} allowDecimals={false} />
              <Tooltip contentStyle={{background:"var(--rc-panel2)", border:`1px solid ${C.line}`, borderRadius:8, color:"var(--rc-fg)", fontSize:13}} />
              <Bar dataKey="count" fill={C.cyan} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
