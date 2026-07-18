// app/projections/page.tsx — interactive financial projections model.
// Sliders drive a live 24-month P&L + AUM projection. Export to Excel (SheetJS).
"use client";
import { useState, useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, Area, AreaChart,
} from "recharts";
import * as XLSX from "xlsx";

const C = { cyan:"#39C5CF", lime:"#3FB950", amber:"#D29922", red:"#F85149", dim:"#8B949E", line:"#2A3038" };
const inr = (n:number) => {
  const a = Math.abs(n);
  if (a >= 10000000) return `${n<0?"-":""}₹${(a/10000000).toFixed(2)}Cr`;
  if (a >= 100000) return `${n<0?"-":""}₹${(a/100000).toFixed(1)}L`;
  return `${n<0?"-":""}₹${Math.round(a).toLocaleString("en-IN")}`;
};

type Drivers = {
  startLoans: number;      // loans disbursed in month 1
  monthlyGrowth: number;   // % MoM growth in new loans
  avgTicket: number;       // ₹ average loan size
  interestRate: number;    // % p.a.
  processingFee: number;   // % of loan
  tenureMonths: number;    // loan tenure
  npaRate: number;         // % of book that defaults (annualized loss)
  costOfCapital: number;   // % p.a. on borrowed funds
  opexPerLoan: number;     // ₹ operating cost per loan per month
  ownCapitalPct: number;   // % of book funded by own equity (rest is debt)
};

const DEFAULTS: Drivers = {
  startLoans: 40, monthlyGrowth: 12, avgTicket: 300000, interestRate: 20,
  processingFee: 2.5, tenureMonths: 24, npaRate: 3, costOfCapital: 12,
  opexPerLoan: 600, ownCapitalPct: 30,
};

function project(d: Drivers) {
  const months = 24;
  const rows: any[] = [];
  let activeLoans = 0;
  let bookOutstanding = 0;
  let cumProfit = 0;
  const disbursedByMonth: number[] = [];

  for (let m = 1; m <= months; m++) {
    const newLoans = Math.round(d.startLoans * Math.pow(1 + d.monthlyGrowth/100, m-1));
    disbursedByMonth.push(newLoans);
    const newDisbursed = newLoans * d.avgTicket;

    // loans that mature drop off after tenure
    const maturedLoans = m > d.tenureMonths ? disbursedByMonth[m - d.tenureMonths - 1] || 0 : 0;
    activeLoans += newLoans - maturedLoans;
    if (activeLoans < 0) activeLoans = 0;

    bookOutstanding = activeLoans * d.avgTicket * 0.6; // avg ~60% outstanding across tenure

    // revenue
    const interestIncome = bookOutstanding * (d.interestRate/100) / 12;
    const feeIncome = newDisbursed * (d.processingFee/100);

    // costs
    const debtFunded = bookOutstanding * (1 - d.ownCapitalPct/100);
    const capitalCost = debtFunded * (d.costOfCapital/100) / 12;
    const opex = activeLoans * d.opexPerLoan;
    const creditLoss = bookOutstanding * (d.npaRate/100) / 12;

    const netProfit = interestIncome + feeIncome - capitalCost - opex - creditLoss;
    cumProfit += netProfit;

    rows.push({
      month: `M${m}`,
      newLoans, activeLoans, aum: Math.round(bookOutstanding),
      interestIncome: Math.round(interestIncome), feeIncome: Math.round(feeIncome),
      capitalCost: Math.round(capitalCost), opex: Math.round(opex),
      creditLoss: Math.round(creditLoss), netProfit: Math.round(netProfit),
      cumProfit: Math.round(cumProfit),
    });
  }
  return rows;
}

function Slider({ label, value, onChange, min, max, step, fmt }: any) {
  return (
    <div style={{marginBottom:16}}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
        <span style={{fontSize:13, color:"var(--rc-dim)"}}>{label}</span>
        <span className="rc-mono" style={{fontSize:13, color:"var(--rc-cyan)"}}>{fmt ? fmt(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(Number(e.target.value))}
        style={{width:"100%", accentColor:"#39C5CF"}} />
    </div>
  );
}

function Stat({ label, value, tone }: any) {
  return (
    <div className="rc-panel" style={{padding:"16px 18px"}}>
      <div className="rc-mono" style={{fontSize:10, letterSpacing:".08em", textTransform:"uppercase", color:"var(--rc-dim)", marginBottom:6}}>{label}</div>
      <div className="rc-mono" style={{fontSize:22, fontWeight:600, color:tone||"var(--rc-fg)"}}>{value}</div>
    </div>
  );
}

export default function ProjectionsPage() {
  const [d, setD] = useState<Drivers>(DEFAULTS);
  const set = (k: keyof Drivers) => (v: number) => setD(p => ({...p, [k]: v}));
  const rows = useMemo(() => project(d), [d]);

  const last = rows[rows.length-1];
  const totalDisbursed = rows.reduce((s,r)=>s + r.newLoans * d.avgTicket, 0);
  const totalRevenue = rows.reduce((s,r)=>s + r.interestIncome + r.feeIncome, 0);
  const breakeven = rows.find(r=>r.cumProfit > 0);

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    // assumptions sheet
    const assumptions = [
      ["Rasoi Capital — Financial Projections","",""],
      ["Assumption","Value",""],
      ["Loans in month 1", d.startLoans,""],
      ["Monthly growth %", d.monthlyGrowth,""],
      ["Avg ticket (₹)", d.avgTicket,""],
      ["Interest rate % p.a.", d.interestRate,""],
      ["Processing fee %", d.processingFee,""],
      ["Tenure (months)", d.tenureMonths,""],
      ["NPA / credit loss %", d.npaRate,""],
      ["Cost of capital % p.a.", d.costOfCapital,""],
      ["Opex per loan / month (₹)", d.opexPerLoan,""],
      ["Own capital %", d.ownCapitalPct,""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(assumptions), "Assumptions");
    // projection sheet
    const header = ["Month","New Loans","Active Loans","AUM (₹)","Interest Income","Fee Income","Capital Cost","Opex","Credit Loss","Net Profit","Cumulative Profit"];
    const body = rows.map(r=>[r.month,r.newLoans,r.activeLoans,r.aum,r.interestIncome,r.feeIncome,r.capitalCost,r.opex,r.creditLoss,r.netProfit,r.cumProfit]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header,...body]), "24-Month Projection");
    XLSX.writeFile(wb, "Rasoi_Financial_Projections.xlsx");
  }

  return (
    <div className="rc-page">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6}}>
        <div>
          <div className="rc-eyebrow">Investor Model</div>
          <h1 style={{fontSize:24, fontWeight:700, color:"var(--rc-fg)", marginTop:4}}>Financial Projections</h1>
        </div>
        <button className="rc-btn" style={{width:"auto", padding:"10px 18px"}} onClick={exportExcel}>⬇ Export to Excel</button>
      </div>
      <p style={{color:"var(--rc-dim)", fontSize:13, marginBottom:24}}>Adjust the drivers — the 24-month P&L and AUM projection recalculates live. Export the full model to Excel anytime.</p>

      {/* headline stats */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:24}}>
        <Stat label="AUM @ M24" value={inr(last.aum)} tone={C.cyan} />
        <Stat label="Total Disbursed" value={inr(totalDisbursed)} />
        <Stat label="Total Revenue" value={inr(totalRevenue)} tone={C.lime} />
        <Stat label="Cumulative Profit @ M24" value={inr(last.cumProfit)} tone={last.cumProfit>0?C.lime:C.red} />
        <Stat label="Breakeven" value={breakeven ? breakeven.month : ">M24"} tone={breakeven?C.lime:C.amber} />
      </div>

      <div style={{display:"grid", gridTemplateColumns:"300px 1fr", gap:20}}>
        {/* driver panel */}
        <div className="rc-panel">
          <div className="rc-panel-title">Drivers</div>
          <Slider label="Loans in month 1" value={d.startLoans} onChange={set("startLoans")} min={10} max={200} step={5} />
          <Slider label="Monthly growth" value={d.monthlyGrowth} onChange={set("monthlyGrowth")} min={0} max={30} step={1} fmt={(v:number)=>`${v}%`} />
          <Slider label="Avg ticket" value={d.avgTicket} onChange={set("avgTicket")} min={100000} max={800000} step={25000} fmt={inr} />
          <Slider label="Interest rate" value={d.interestRate} onChange={set("interestRate")} min={12} max={30} step={0.5} fmt={(v:number)=>`${v}%`} />
          <Slider label="Processing fee" value={d.processingFee} onChange={set("processingFee")} min={0} max={5} step={0.25} fmt={(v:number)=>`${v}%`} />
          <Slider label="Tenure" value={d.tenureMonths} onChange={set("tenureMonths")} min={6} max={36} step={6} fmt={(v:number)=>`${v}mo`} />
          <Slider label="NPA / credit loss" value={d.npaRate} onChange={set("npaRate")} min={0} max={10} step={0.5} fmt={(v:number)=>`${v}%`} />
          <Slider label="Cost of capital" value={d.costOfCapital} onChange={set("costOfCapital")} min={6} max={18} step={0.5} fmt={(v:number)=>`${v}%`} />
          <Slider label="Opex / loan / mo" value={d.opexPerLoan} onChange={set("opexPerLoan")} min={200} max={2000} step={100} fmt={inr} />
          <Slider label="Own capital" value={d.ownCapitalPct} onChange={set("ownCapitalPct")} min={0} max={100} step={5} fmt={(v:number)=>`${v}%`} />
          <button className="rc-btn rc-btn-ghost" style={{marginTop:8}} onClick={()=>setD(DEFAULTS)}>Reset to defaults</button>
        </div>

        {/* charts */}
        <div style={{display:"grid", gap:18}}>
          <div className="rc-panel">
            <div className="rc-panel-title">AUM Growth (24 months)</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={rows}>
                <defs><linearGradient id="aum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.cyan} stopOpacity={0.4}/><stop offset="100%" stopColor={C.cyan} stopOpacity={0}/>
                </linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                <XAxis dataKey="month" tick={{fill:C.dim, fontSize:10}} interval={2} />
                <YAxis tick={{fill:C.dim, fontSize:10}} tickFormatter={inr} />
                <Tooltip contentStyle={{background:"var(--rc-panel2)", border:`1px solid ${C.line}`, borderRadius:8, fontSize:12}} formatter={(v:any)=>inr(v)} />
                <Area type="monotone" dataKey="aum" stroke={C.cyan} strokeWidth={2} fill="url(#aum)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="rc-panel">
            <div className="rc-panel-title">Monthly Net Profit & Cumulative</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                <XAxis dataKey="month" tick={{fill:C.dim, fontSize:10}} interval={2} />
                <YAxis tick={{fill:C.dim, fontSize:10}} tickFormatter={inr} />
                <Tooltip contentStyle={{background:"var(--rc-panel2)", border:`1px solid ${C.line}`, borderRadius:8, fontSize:12}} formatter={(v:any)=>inr(v)} />
                <Legend wrapperStyle={{fontSize:12}} />
                <Line type="monotone" dataKey="netProfit" name="Monthly" stroke={C.lime} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cumProfit" name="Cumulative" stroke={C.amber} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
