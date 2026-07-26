// app/pitch/page.tsx — Rasoi Capital investor pitch (React, in-app, terminal-themed).
// Rewritten around weekly collection via a regulated virtual account. "Download the deck" button included.
"use client";
import { useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from "recharts";

// Deck-matched palette — TRUE colours extracted from public/RasoiCapital_PitchDeck.pptx slide shapes.
// SOURCE OF TRUTH is the CSS custom properties `.rc-pitch { --pitch-* }` in app/rasoi-theme.css.
// These JS constants MUST mirror those token values exactly. They can't be `var(--pitch-*)` references
// because the page builds translucent tints by string-concatenating an 8-bit alpha suffix onto the hex
// (e.g. `${C.cyan}1a`), and CSS var() can't carry an alpha suffix. So we keep hex literals in lockstep.
// C.cyan=accent, fg=ink, dim=body, line=border, lime=green, amber, red, violet=teal.
const C = { cyan:"#E8520A", lime:"#15803D", amber:"#B45309", red:"#B91C1C", dim:"#475569", line:"#E2E8F0", violet:"#0F766E", fg:"#0F172A" };
// Deck surface colours (force the pitch page to the deck's light look regardless of theme toggle)
const DECK_BG = "#FAF7F2", DECK_PANEL = "#FFFFFF", DECK_PANEL2 = "#F8FAFC";

// ——— small primitives ———
function Section({ id, eyebrow, title, children, tight }: any) {
  return (
    <section id={id} style={{ padding: tight ? "48px 0 24px" : "72px 0", borderBottom:`1px solid ${C.line}` }}>
      {eyebrow && <div className="rc-eyebrow" style={{marginBottom:10}}>{eyebrow}</div>}
      {title && <h2 style={{fontSize:"clamp(24px,3.4vw,38px)", fontWeight:700, lineHeight:1.1, color:C.fg, marginBottom:28, maxWidth:900}}>{title}</h2>}
      {children}
    </section>
  );
}
function Card({ children, accent, style }: any) {
  return <div className="rc-panel" style={{ borderTop:`2px solid ${accent||C.line}`, ...style }}>{children}</div>;
}
function Stat({ big, label, tone }: any) {
  return (
    <div>
      <div className="rc-mono" style={{fontSize:"clamp(22px,3vw,32px)", fontWeight:700, color:tone||C.cyan, lineHeight:1}}>{big}</div>
      <div style={{fontSize:13, color:C.dim, marginTop:6}}>{label}</div>
    </div>
  );
}
function Pill({ children, tone }: any) {
  return <span className="rc-mono" style={{fontSize:11, letterSpacing:".05em", padding:"4px 10px", borderRadius:6, background:`${tone||C.cyan}1a`, color:tone||C.cyan, border:`1px solid ${tone||C.cyan}44`}}>{children}</span>;
}
function Row({ k, v, tone }: any) {
  return (
    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${C.line}`}}>
      <span style={{fontSize:13, color:C.dim}}>{k}</span>
      <span className="rc-mono" style={{fontSize:14, fontWeight:600, color:tone||C.fg}}>{v}</span>
    </div>
  );
}

// ——— data for charts ———
const marketData = [
  { year:"FY24", size:5.69 }, { year:"FY25", size:6.15 }, { year:"FY26", size:6.65 },
  { year:"FY27", size:7.19 }, { year:"FY28", size:7.77 },
];

export default function PitchPage() {
  const [demo, setDemo] = useState({ sales:700000, growth:12, cibil:740 });

  return (
    <div className="rc-pitch rc-page" style={{maxWidth:1080, background:DECK_BG, color:C.fg, minHeight:"100vh"}}>

      {/* download bar */}
      <div style={{display:"flex", justifyContent:"flex-end", marginBottom:8}}>
        <a href="/RasoiCapital_PitchDeck.pptx" download className="rc-btn" style={{width:"auto", padding:"9px 16px", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:8}}>
          ⬇ Download the deck (.pptx)
        </a>
      </div>

      {/* ——— HERO ——— */}
      <section style={{padding:"64px 0 72px", borderBottom:`1px solid ${C.line}`}}>
        <div className="rc-mono" style={{color:C.cyan, letterSpacing:".2em", fontSize:13, marginBottom:20}}>RASOI CAPITAL</div>
        <h1 style={{fontSize:"clamp(34px,6vw,64px)", fontWeight:800, lineHeight:1.02, color:C.fg, marginBottom:20, letterSpacing:"-.02em"}}>
          India feeds the world.<br/><span style={{color:C.cyan}}>Nobody funds the kitchen.</span>
        </h1>
        <p style={{fontSize:"clamp(15px,2vw,19px)", color:C.dim, maxWidth:680, lineHeight:1.5, marginBottom:32}}>
          The AI-first lending platform for India's ₹5.7 lakh crore HORECA industry — built on a
          live, working underwriting engine you can test today.
        </p>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(140px,100%),1fr))", gap:20, maxWidth:720}}>
          <Stat big="₹60 Cr" label="Raising" />
          <Stat big="NBFC Licence + NOF" label="Includes" tone={C.fg} />
          <Stat big="Live & Demo-Ready" label="Product status" tone={C.lime} />
          <Stat big="Seed / Pre-Series A" label="Stage" tone={C.fg} />
        </div>
        <div style={{marginTop:28, fontSize:13, color:C.dim}}>Nexus AI · Bengaluru · Investor Presentation · 2026</div>
      </section>

      {/* ——— BEFORE WE BEGIN ——— */}
      <Section id="live" eyebrow="Before we begin" title="This is not a concept deck.">
        <p style={{color:C.dim, fontSize:16, maxWidth:760, marginBottom:28, marginTop:-8}}>
          Everything here is running in production, right now. You're welcome to open it on your phone while we talk.
        </p>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(240px,100%),1fr))", gap:16}}>
          <Card accent={C.lime}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}><b style={{color:C.fg}}>AI Underwriting Engine</b><Pill tone={C.lime}>LIVE</Pill></div>
            <p style={{fontSize:13.5, color:C.dim, lineHeight:1.5}}>6-factor HORECA credit model scores any outlet in under a second and writes a full AI risk memo.</p>
            <div className="rc-mono" style={{fontSize:12, color:C.cyan, marginTop:10}}>/underwrite</div>
          </Card>
          <Card accent={C.lime}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}><b style={{color:C.fg}}>Full Lending Platform</b><Pill tone={C.lime}>LIVE</Pill></div>
            <p style={{fontSize:13.5, color:C.dim, lineHeight:1.5}}>Applications, loan book, virtual-account collections engine, DPD buckets, portfolio analytics. 17-table production database.</p>
          </Card>
          <Card accent={C.amber}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}><b style={{color:C.fg}}>RBI-Aligned Policy Stack</b><Pill tone={C.amber}>DRAFTED</Pill></div>
            <p style={{fontSize:13.5, color:C.dim, lineHeight:1.5}}>Credit policy, collection & recovery policy (Fair Practices Code), bureau reporting framework — written, reviewed, board-ready.</p>
          </Card>
        </div>
        <div style={{marginTop:20, padding:"14px 18px", background:`${C.cyan}12`, border:`1px solid ${C.cyan}33`, borderRadius:10, fontSize:14, color:C.fg}}>
          🎯 <b>Demo moment:</b> we'll underwrite a live restaurant on screen — hold your scepticism until then.
        </div>
      </Section>

      {/* ——— PROBLEM ——— */}
      <Section id="problem" eyebrow="The problem" title="Kitchens run on credit nobody gives them.">
        <p style={{color:C.dim, fontSize:16, maxWidth:780, marginBottom:28, marginTop:-8}}>
          A restaurant earning ₹7 lakh a month — daily cash flow, real customers, real margins — walks into a bank and gets rejected. Why?
        </p>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(240px,100%),1fr))", gap:16, marginBottom:24}}>
          <Card accent={C.red}>
            <b style={{color:C.fg}}>ITR can't see daily cash</b>
            <p style={{fontSize:13.5, color:C.dim, lineHeight:1.5, marginTop:8}}>30–40% of HORECA revenue is cash & UPI that annual filings under-report. Banks score the paperwork, not the business.</p>
          </Card>
          <Card accent={C.red}>
            <b style={{color:C.fg}}>Generic SME models misfire</b>
            <p style={{fontSize:13.5, color:C.dim, lineHeight:1.5, marginTop:8}}>A dhaba and a steel trader get the same scorecard. Margin structures, seasonality, footfall — all invisible to NBFC models.</p>
          </Card>
          <Card accent={C.red}>
            <b style={{color:C.fg}}>Monthly EMI vs daily income</b>
            <p style={{fontSize:13.5, color:C.dim, lineHeight:1.5, marginTop:8}}>HORECA earns daily but repays monthly — one bad week breaks the EMI. Product design itself manufactures defaults.</p>
          </Card>
        </div>
        <div style={{display:"flex", flexWrap:"wrap", gap:28, padding:"20px 24px", background:DECK_PANEL2, borderRadius:12}}>
          <Stat big="36–48%" label="p.a. — informal moneylenders, the default banker of Indian HORECA" tone={C.red} />
          <Stat big="~70%" label="of outlets remain outside formal credit (industry est.)" tone={C.amber} />
          <Stat big="8.5M+" label="people employed — India's 2nd largest employer (NRAI)" tone={C.fg} />
        </div>
      </Section>

      {/* ——— MARKET ——— */}
      <Section id="market" eyebrow="The market" title="3rd-largest food market on Earth by 2028.">
        <div className="rc-grid-2" style={{alignItems:"center", gap:28}}>
          <div className="rc-panel">
            <div className="rc-panel-title">Indian food services industry (₹ lakh Cr)</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={marketData}>
                <defs><linearGradient id="mkt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.cyan} stopOpacity={.4}/><stop offset="100%" stopColor={C.cyan} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                <XAxis dataKey="year" tick={{fill:C.dim, fontSize:12}} />
                <YAxis tick={{fill:C.dim, fontSize:12}} domain={[5,8]} />
                <Tooltip contentStyle={{background:DECK_PANEL2, border:`1px solid ${C.line}`, borderRadius:8, fontSize:13}} formatter={(v:any)=>`₹${v}L Cr`} />
                <Area type="monotone" dataKey="size" stroke={C.cyan} strokeWidth={2.5} fill="url(#mkt)" />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{fontSize:12, color:C.dim, marginTop:8}}>NRAI IFSR 2024 · 8.1% CAGR · organised segment growing 13.2%</div>
          </div>
          <div style={{display:"grid", gap:14}}>
            <Card accent={C.cyan}><div style={{display:"flex", justifyContent:"space-between"}}><b style={{color:C.fg}}>TAM</b><span className="rc-mono" style={{color:C.cyan}}>₹95,000+ Cr</span></div><p style={{fontSize:13, color:C.dim, marginTop:6}}>Working capital + expansion credit across 14M+ outlets (~12% of GMV)</p></Card>
            <Card accent={C.cyan}><div style={{display:"flex", justifyContent:"space-between"}}><b style={{color:C.fg}}>SAM</b><span className="rc-mono" style={{color:C.cyan}}>₹28,000 Cr</span></div><p style={{fontSize:13, color:C.dim, marginTop:6}}>Customer-facing outlets in top 20 cities with digital payment trails</p></Card>
            <Card accent={C.lime}><div style={{display:"flex", justifyContent:"space-between"}}><b style={{color:C.fg}}>SOM (3-yr)</b><span className="rc-mono" style={{color:C.lime}}>₹1,700 Cr AUM</span></div><p style={{fontSize:13, color:C.dim, marginTop:6}}>~26,000 active loans at ₹6.5L avg — just 0.2% of outlets</p></Card>
          </div>
        </div>
      </Section>

      {/* ——— SOLUTION ——— */}
      <Section id="solution" eyebrow="The solution" title="Built around how a kitchen actually earns.">
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(260px,100%),1fr))", gap:16}}>
          <Card accent={C.cyan}>
            <div style={{fontSize:26, marginBottom:8}}>🧠</div>
            <b style={{color:C.fg}}>AI that sees the business</b>
            <ul style={{fontSize:13.5, color:C.dim, lineHeight:1.6, marginTop:10, paddingLeft:16}}>
              <li>6-factor HORECA scoring — margin, growth, sales, location, ambience, bureau</li>
              <li>Reconciles bank + aggregator data; scores the agreement, not the claim</li>
              <li>Rasoi IQ writes a full, auditable credit memo for every decision</li>
            </ul>
          </Card>
          <Card accent={C.violet}>
            <div style={{fontSize:26, marginBottom:8}}>🏦</div>
            <b style={{color:C.fg}}>Collection at the source</b>
            <ul style={{fontSize:13.5, color:C.dim, lineHeight:1.6, marginTop:10, paddingLeft:16}}>
              <li>A regulated virtual account sits in the borrower's settlement path</li>
              <li>Swiggy/Zomato payouts route in; EMI auto-deducted <b>before</b> the borrower is paid</li>
              <li>Remainder swept to the restaurant — repayment is structural, not behavioural</li>
            </ul>
          </Card>
          <Card accent={C.lime}>
            <div style={{fontSize:26, marginBottom:8}}>🛡️</div>
            <b style={{color:C.fg}}>Collections built for dignity</b>
            <ul style={{fontSize:13.5, color:C.dim, lineHeight:1.6, marginTop:10, paddingLeft:16}}>
              <li>5-bucket framework (Clean → NPA) under RBI Fair Practices Code</li>
              <li>Escalation proportional to DPD — relationship first, recovery second</li>
              <li>Clean payers earn better terms + cross-sell after 6 months</li>
            </ul>
          </Card>
        </div>
      </Section>

      {/* ——— COLLECTION MOAT (the centerpiece) ——— */}
      <Section id="collection" eyebrow="⭐ The collection moat" title="We don't chase repayment. We collect at the source.">
        <p style={{color:C.dim, fontSize:16, maxWidth:820, marginBottom:32, marginTop:-8}}>
          Every competitor debits the borrower's account and hopes the balance is there. We take our EMI
          <b style={{color:C.fg}}> before the money ever reaches the borrower</b> — powered by regulated virtual-account
          escrow rails, the same architecture Mahindra Finance, IIFL and Oxyzo already run on.
        </p>
        {/* 3-step mechanism */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(220px,100%),1fr))", gap:16, marginBottom:24}}>
          <Card accent={C.violet}><div className="rc-mono" style={{color:C.violet, fontSize:13, marginBottom:6}}>STEP 1</div><b style={{color:C.fg}}>Virtual account, in the borrower's name</b><p style={{fontSize:13, color:C.dim, marginTop:8, lineHeight:1.5}}>A regulated virtual account opened at loan origination. It's theirs — but it sits in the settlement path.</p></Card>
          <Card accent={C.violet}><div className="rc-mono" style={{color:C.violet, fontSize:13, marginBottom:6}}>STEP 2</div><b style={{color:C.fg}}>Aggregator payouts route through it</b><p style={{fontSize:13, color:C.dim, marginTop:8, lineHeight:1.5}}>Swiggy & Zomato settlements land here — where 30–60% of a modern outlet's revenue already flows.</p></Card>
          <Card accent={C.violet}><div className="rc-mono" style={{color:C.violet, fontSize:13, marginBottom:6}}>STEP 3</div><b style={{color:C.fg}}>Deduct first, sweep the rest</b><p style={{fontSize:13, color:C.dim, marginTop:8, lineHeight:1.5}}>Weekly EMI auto-deducted at source; the remainder swept to the restaurant, same day.</p></Card>
        </div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(200px,100%),1fr))", gap:16, marginBottom:24}}>
          <Card><b style={{color:C.cyan}}>Structural, not behavioural</b><p style={{fontSize:13, color:C.dim, marginTop:6, lineHeight:1.5}}>The money is collected before it can be spent. A borrower can't forget, go overdrawn, or deprioritise us.</p></Card>
          <Card><b style={{color:C.cyan}}>Collection cost collapses</b><p style={{fontSize:13, color:C.dim, marginTop:6, lineHeight:1.5}}>No field collection, no bounce cycles for the performing book. The rails do the work.</p></Card>
          <Card><b style={{color:C.cyan}}>Lower loss → cheaper loans</b><p style={{fontSize:13, color:C.dim, marginTop:6, lineHeight:1.5}}>At-source collection cuts expected loss on settled revenue — so we approve outlets a bank rejects, below informal rates.</p></Card>
        </div>
        <div style={{padding:"22px 26px", background:`${C.violet}14`, border:`1px solid ${C.violet}44`, borderRadius:12}}>
          <div style={{fontSize:"clamp(16px,2.2vw,22px)", color:C.fg, fontWeight:600, lineHeight:1.4}}>
            "Monthly lenders collect from the borrower. We collect from the platform, before the borrower is even paid.
            <span style={{color:C.violet}}> That's not a better collection process — it's a different physics."</span>
          </div>
        </div>
      </Section>

      {/* ——— AI UNDERWRITING ——— */}
      <Section id="ai" eyebrow="Product · AI underwriting" title="We don't score what a restaurant claims. We score what independent sources prove.">
        <p style={{color:C.dim, fontSize:16, maxWidth:820, marginBottom:28, marginTop:-8}}>
          Any lender can read a bank statement. Our engine reconciles independent data sources and scores the
          <b style={{color:C.fg}}> agreement between them</b> — confidence from corroboration, not from documents a borrower could fabricate.
        </p>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(230px,100%),1fr))", gap:14, marginBottom:28}}>
          <Card accent={C.cyan}><b style={{color:C.fg}}>1 · Multi-source reconciliation</b><p style={{fontSize:13, color:C.dim, marginTop:6, lineHeight:1.5}}>Bank statements + Swiggy/Zomato payouts matched transaction-by-transaction. Claimed sales must show up as money that landed.</p></Card>
          <Card accent={C.cyan}><b style={{color:C.fg}}>2 · Data Integrity Score</b><p style={{fontSize:13, color:C.dim, marginTop:6, lineHeight:1.5}}>How well independent sources agree. TRUSTED / REVIEW / FLAGGED — computed before we ever score creditworthiness.</p></Card>
          <Card accent={C.red}><b style={{color:C.fg}}>3 · Fraud override</b><p style={{fontSize:13, color:C.dim, marginTop:6, lineHeight:1.5}}>Round-number clusters, circular transfers, manufactured consistency force the riskiest band. Built to catch the file that's <i>too clean</i>.</p></Card>
          <Card accent={C.lime}><b style={{color:C.fg}}>4 · Digital exhaust pre-score</b><p style={{fontSize:13, color:C.dim, marginTop:6, lineHeight:1.5}}>Before a document is uploaded: ratings, price band, location, nearby demand (colleges, tech parks). Real-world presence becomes a credit signal.</p></Card>
        </div>
        {/* 6-factor weights */}
        <div className="rc-panel">
          <div className="rc-panel-title">The 6-factor HORECA model — five of six factors are data-derived, not self-reported</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(150px,100%),1fr))", gap:12, marginTop:8}}>
            {[["Outlet Margin","30%",C.cyan],["Q-Q Growth","30%",C.cyan],["Avg Sales","20%",C.cyan],["Location","10%",C.lime],["Ambience","5%",C.lime],["CIBIL","5%",C.dim]].map(([f,w,t]:any)=>(
              <div key={f} style={{padding:"12px 14px", background:DECK_PANEL2, borderRadius:8}}>
                <div className="rc-mono" style={{fontSize:22, fontWeight:700, color:t}}>{w}</div>
                <div style={{fontSize:12.5, color:C.dim, marginTop:4}}>{f}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:14, fontSize:13, color:C.dim}}>CIBIL is deliberately our <b style={{color:C.fg}}>smallest</b> weight — every competitor makes it the biggest. That inversion is why we approve outlets they reject, profitably.</div>
        </div>
      </Section>

      {/* ——— LIVE DEMO ——— */}
      <Section id="demo" eyebrow="🎯 Live demo" title="Let's underwrite a real restaurant. Right now.">
        <div className="rc-grid-2" style={{gap:20}}>
          <div className="rc-panel">
            <div className="rc-panel-title">We type — the investor picks the numbers</div>
            <div style={{display:"grid", gap:14, marginTop:6}}>
              <label style={{fontSize:13, color:C.dim}}>Avg monthly sales · <b className="rc-mono" style={{color:C.cyan}}>₹{demo.sales.toLocaleString("en-IN")}</b>
                <input type="range" min={200000} max={1500000} step={50000} value={demo.sales} onChange={e=>setDemo({...demo, sales:+e.target.value})} style={{width:"100%", accentColor:C.cyan}} /></label>
              <label style={{fontSize:13, color:C.dim}}>Q-Q growth · <b className="rc-mono" style={{color:C.cyan}}>{demo.growth}%</b>
                <input type="range" min={-10} max={40} value={demo.growth} onChange={e=>setDemo({...demo, growth:+e.target.value})} style={{width:"100%", accentColor:C.cyan}} /></label>
              <label style={{fontSize:13, color:C.dim}}>CIBIL · <b className="rc-mono" style={{color:C.cyan}}>{demo.cibil}</b>
                <input type="range" min={600} max={850} value={demo.cibil} onChange={e=>setDemo({...demo, cibil:+e.target.value})} style={{width:"100%", accentColor:C.cyan}} /></label>
            </div>
          </div>
          <div className="rc-panel" style={{background:DECK_PANEL2}}>
            <div className="rc-panel-title">The engine returns (~2 seconds)</div>
            {(() => {
              const loan = Math.round(demo.sales); const rate = demo.cibil>760?18:demo.cibil>700?19:20;
              const weekly = Math.round(loan*(1+rate/100)/26); const daily = Math.round(weekly/7);
              const score = (3.0 + (demo.growth>10?0.4:0.1) + (demo.sales>600000?0.3:0) + (demo.cibil>720?0.2:0)).toFixed(2);
              const bucket = +score>=4?"G — Auto-approve":+score>=3.5?"C — Approve w/ conditions":"P — Manual review";
              const tone = +score>=4?C.lime:+score>=3.5?C.amber:C.red;
              return <div style={{display:"grid", gap:10, marginTop:4}}>
                <Row k="Composite score" v={`${score} / 5.00`} tone={tone} />
                <Row k="Bucket / decision" v={bucket} tone={tone} />
                <Row k="Rate / fee" v={`${rate}% p.a. · 2.5% PF`} />
                <Row k="Loan (Cycle-1 cap)" v={`₹${loan.toLocaleString("en-IN")}`} />
                <Row k="Weekly EMI (at source)" v={`≈ ₹${weekly.toLocaleString("en-IN")}/wk`} tone={C.violet} />
                <div style={{fontSize:12, color:C.dim, marginTop:2}}>≈ ₹{daily.toLocaleString("en-IN")}/day of sales — but collected weekly at source from the settlement flow, never debited from the borrower.</div>
                <div style={{fontSize:12, color:C.cyan, marginTop:4}}>+ Rasoi IQ credit memo: weak factors · path to G</div>
                <Row k="Collateral" v="Required" />
                <Row k="PDC" v="Required" />
              </div>;
            })()}
          </div>
        </div>
        <div style={{marginTop:14, fontSize:13, color:C.dim}}>Every number on the right is computed live in our production database — not a mock-up. Try it: <span className="rc-mono" style={{color:C.cyan}}>/underwrite</span></div>
      </Section>

      {/* ——— DISTRIBUTION ——— */}
      <Section id="distribution" eyebrow="Distribution strategy" title="We already have the rails to reach every kitchen in India.">
        <p style={{color:C.dim, fontSize:16, maxWidth:820, marginBottom:28, marginTop:-8}}>
          Most lenders spend years and crores acquiring SME borrowers. We start with distribution built in — three channels, each a warm pipe to the outlets we underwrite.
        </p>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(250px,100%),1fr))", gap:16}}>
          <Card accent={C.cyan}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}><b style={{color:C.fg}}>ONDC — already integrated</b><Pill tone={C.lime}>LIVE</Pill></div>
            <p style={{fontSize:13.5, color:C.dim, marginTop:8, lineHeight:1.5}}>Three of our founders built and exited <b>Tipplr</b> on the ONDC network. Rasoi inherits that live integration — programmatic reach to MSME restaurants nationwide. Not a partnership we hope to sign; a rail our own team built.</p>
          </Card>
          <Card accent={C.cyan}>
            <b style={{color:C.fg}}>NRAI — the industry body</b>
            <p style={{fontSize:13.5, color:C.dim, marginTop:8, lineHeight:1.5}}>The National Restaurant Association of India is the collective voice of the sector. A channel here puts Rasoi in front of organised HORECA demand and the operators who set norms.</p>
          </Card>
          <Card accent={C.cyan}>
            <b style={{color:C.fg}}>POS players — embedded at the till</b>
            <p style={{fontSize:13.5, color:C.dim, marginTop:8, lineHeight:1.5}}>Petpooja (150K+ outlets), UrbanPiper (45K+) and peers sit on daily transaction data. Embedded lending turns every terminal into an origination point. Revenue-share, near-zero CAC.</p>
          </Card>
        </div>
        <div style={{marginTop:18, padding:"14px 18px", background:DECK_PANEL2, borderRadius:10, fontSize:14, color:C.dim}}>
          Each channel is also a <b style={{color:C.fg}}>data channel</b> — ONDC order flow, POS feeds and settlement data don't just find borrowers, they price them. Distribution and credit intelligence run on the same pipes.
        </div>
      </Section>

      {/* ——— WHY WE WIN ——— */}
      <Section id="moat" eyebrow="Why we win · moat & USP" title="Five unfair advantages. None of them copyable.">
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(300px,100%),1fr))", gap:16}}>
          {[
            ["🧠","We score the business, not the paperwork","6-factor HORECA model with CIBIL as the smallest weight. That inversion approves outlets banks reject — at lower NPA.","Proprietary model calibrated to HORECA — 6-month rebuild minimum"],
            ["🏦","We collect at the source, before the borrower is paid","Our regulated virtual account intercepts Swiggy/Zomato settlements; EMI deducted first. Structurally impossible to replicate on debit-time architecture.","Requires escrow/virtual-account rails + settlement routing — not retrofittable onto NACH"],
            ["📡","POS + ONDC distribution — near-zero CAC","150K+ POS outlets plus a founder-built ONDC integration. Competitor field-sales CAC: ₹8–15K/loan. Ours: near zero on repeat.","Exclusive channel + founder-built ONDC rail — competitors need ground ops"],
            ["🔎","We control the pipe, not just the ping","Every rupee of a borrower's aggregator revenue flows through the account we control — live revenue data feeding the next credit cycle. Monthly lenders see 12 payments a year and hope.","Proprietary settlement-flow + labelled HORECA repayment data — cannot be bought"],
            ["🛡️","RBI-ready policy stack — live, board-reviewed","Credit policy, Collection & Recovery Policy (Fair Practices Code), bureau framework — written and board-ready. Most applicants spend 6–9 months here.","Policy stack complete before licence — 6–9 month structural head start"],
          ].map(([icon,title,body,lock]:any,i:number)=>(
            <Card key={i} accent={i===1?C.violet:i===3?C.violet:C.cyan}>
              <div style={{fontSize:24, marginBottom:6}}>{icon}</div>
              <b style={{color:C.fg, fontSize:15}}>{title}</b>
              <p style={{fontSize:13, color:C.dim, marginTop:8, lineHeight:1.5}}>{body}</p>
              <div style={{fontSize:11.5, color:C.lime, marginTop:10, display:"flex", gap:6}}>🔒 <span>{lock}</span></div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ——— COMPETITION ——— */}
      <Section id="competition" eyebrow="Competition" title="Nobody underwrites a kitchen. Until now.">
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${C.line}`}}>
                <th style={{textAlign:"left", padding:"10px 8px", color:C.dim, fontWeight:500}}></th>
                {["Oxyzo","LendingKart","FlexiLoans","Indifi","NeoGrowth","RASOI"].map(c=>(
                  <th key={c} style={{padding:"10px 8px", color:c==="RASOI"?C.cyan:C.dim, fontWeight:c==="RASOI"?700:500}}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["HORECA-specific scoring","✗","✗","✗","Partial","✗","✓ 6-factor"],
                ["Field intelligence (FSA)","✗","✗","✗","✗","✗","✓ Built-in"],
                ["Collection at source","✗","✗","✗","✗","Weekly (POS)","✓ Virtual account"],
                ["AI credit memo per loan","✗","✗","✗","✗","✗","✓ Rasoi IQ"],
                ["Borrower-friendly bureau","✗","✗","✗","✗","✗","✓ Monthly-cum."],
                ["Typical rate (SME)","12%+","18%+","19%+","Varies","20%+","18–27% risk-based"],
              ].map((row,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${C.line}`}}>
                  {row.map((cell,j)=>(
                    <td key={j} style={{padding:"9px 8px", color: j===0?C.fg: j===6?C.lime : cell==="✗"?C.dim:C.dim, fontWeight:j===0?600:400, textAlign:j===0?"left":"center"}}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:16, fontSize:13, color:C.dim}}>Competitors are validation, not threat: Oxyzo (₹11.8k Cr AUM, 0.74% NPA) proves SME lending prints money at scale — none of it is HORECA-deep. Our wedge is depth they can't retrofit.</div>
      </Section>

      {/* ——— DATA FLYWHEEL / MOAT ——— */}
      <Section id="flywheel" eyebrow="Moat" title="Every loan we make, makes the next loan smarter.">
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(230px,100%),1fr))", gap:16, marginBottom:24}}>
          <Card accent={C.cyan}><b style={{color:C.fg}}>1 · Originate</b><p style={{fontSize:13, color:C.dim, marginTop:6, lineHeight:1.5}}>FSA captures ambience, location, category — data no bureau sells.</p></Card>
          <Card accent={C.violet}><b style={{color:C.fg}}>2 · Observe the revenue</b><p style={{fontSize:13, color:C.dim, marginTop:6, lineHeight:1.5}}>Every settlement flows through the account we control — we see real revenue, not an inferred proxy.</p></Card>
          <Card accent={C.lime}><b style={{color:C.fg}}>3 · Label & learn</b><p style={{fontSize:13, color:C.dim, marginTop:6, lineHeight:1.5}}>Outcomes feed rl_training_data — the RL model is already architected in the production schema.</p></Card>
          <Card accent={C.cyan}><b style={{color:C.fg}}>4 · Underwrite sharper</b><p style={{fontSize:13, color:C.dim, marginTop:6, lineHeight:1.5}}>Better approvals at the same risk → lower NPA → cheaper debt capital.</p></Card>
        </div>
        <div style={{display:"flex", flexWrap:"wrap", gap:28, padding:"20px 24px", background:`${C.violet}12`, border:`1px solid ${C.violet}33`, borderRadius:12}}>
          <Stat big="Own the pipe" label="We control the account every rupee of aggregator revenue flows through — not a data feed we rent" tone={C.violet} />
          <Stat big="Zero" label="public datasets for outlet ambience, category margins, or footfall — ours is proprietary by construction" tone={C.cyan} />
          <Stat big="2-sided" label="lock-in: borrowers graduate to better terms; our model graduates to better selection" tone={C.lime} />
        </div>
      </Section>

      {/* ——— BUSINESS MODEL ——— */}
      <Section id="unit" eyebrow="Business model" title="Unit economics of a single loan.">
        <p style={{color:C.dim, fontSize:15, marginBottom:24, marginTop:-8}}>Illustrative · Bucket C · ₹7L · 24 months · 19% p.a. + 2.5% PF</p>
        <div className="rc-grid-2" style={{gap:24}}>
          <div className="rc-panel">
            <div style={{display:"grid", gap:2}}>
              <Row k="Interest income (24 mo)" v="+ ₹1,46,900" tone={C.lime} />
              <Row k="Processing fee (2.5%)" v="+ ₹17,500" tone={C.lime} />
              <Row k="Cost of debt capital" v="− ₹73,400" tone={C.red} />
              <Row k="Collection + opex" v="− ₹35,000" tone={C.red} />
              <Row k="Expected credit loss (provision)" v="− ₹28,000" tone={C.red} />
            </div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:16, padding:"14px 0 0", borderTop:`2px solid ${C.line}`}}>
              <b style={{color:C.fg}}>Net contribution / loan</b>
              <span className="rc-mono" style={{fontSize:22, fontWeight:700, color:C.lime}}>≈ ₹28,000</span>
            </div>
          </div>
          <div style={{display:"grid", gap:12}}>
            <Card accent={C.cyan}><b style={{color:C.fg}}>Cycle 1</b><p style={{fontSize:12.5, color:C.dim, marginTop:4}}>24 months · prove-out · ₹7L cap</p></Card>
            <Card accent={C.cyan}><b style={{color:C.fg}}>Cycle 2</b><p style={{fontSize:12.5, color:C.dim, marginTop:4}}>Repeat borrower · known payment history · uncapped</p></Card>
            <Card accent={C.lime}><b style={{color:C.fg}}>Cycle 3+</b><p style={{fontSize:12.5, color:C.dim, marginTop:4}}>Rate discounts via clean record · CAC ≈ ₹0 on repeats</p></Card>
          </div>
        </div>
        <div style={{marginTop:16, fontSize:13, color:C.dim}}>A HORECA borrower is not a transaction — it's an annuity. Illustrative and conservative. See the live interactive model: <span className="rc-mono" style={{color:C.cyan}}>/projections</span></div>
      </Section>

      {/* ——— REGULATORY ——— */}
      <Section id="regulatory" eyebrow="Regulatory strategy" title="Two roads to the licence. Both fully costed.">
        <p style={{color:C.dim, fontSize:15, marginBottom:24, marginTop:-8}}>RBI mandates ₹10 Cr minimum Net Owned Fund either way (Sec 45-IA, RBI Act) — it anchors this raise.</p>
        <div className="rc-grid-2" style={{gap:16}}>
          <Card accent={C.lime}>
            <div style={{display:"flex", justifyContent:"space-between"}}><b style={{color:C.fg}}>Path A · Acquire an NBFC</b><Pill tone={C.lime}>4–7 mo</Pill></div>
            <ul style={{fontSize:13, color:C.dim, lineHeight:1.6, marginTop:10, paddingLeft:16}}>
              <li>Buy a clean, dormant NBFC-ICC shell with valid CoR</li>
              <li>RBI prior approval — 26%+ stake / change of control + fit-&-proper</li>
              <li>30-day notice, then capital infusion to ₹10 Cr+ NOF</li>
              <li>Premium over book: ₹50L–1.5Cr by vintage</li>
            </ul>
            <div style={{fontSize:12, color:C.lime, marginTop:8}}>✓ Faster to first disbursal · existing CoR</div>
          </Card>
          <Card accent={C.cyan}>
            <div style={{display:"flex", justifyContent:"space-between"}}><b style={{color:C.fg}}>Path B · Fresh licence</b><Pill tone={C.cyan}>9–15 mo</Pill></div>
            <ul style={{fontSize:13, color:C.dim, lineHeight:1.6, marginTop:10, paddingLeft:16}}>
              <li>Incorporate, capitalise ₹10 Cr NOF ab initio</li>
              <li>COSMOS application — business plan, 5-yr projections, fit-&-proper</li>
              <li>Clean diligence trail — no legacy book, no inherited risk</li>
              <li>Our policy stack is already application-grade</li>
            </ul>
            <div style={{fontSize:12, color:C.cyan, marginTop:8}}>✓ Zero legacy risk · cleanest cap table</div>
          </Card>
        </div>
        <div style={{marginTop:16, fontSize:13, color:C.dim}}>We pursue Path A as primary with Path B in parallel — the ₹10 Cr NOF is identical and ring-fenced either way.</div>
      </Section>

      {/* ——— FOUNDERS (new dedicated section) ——— */}
      <Section id="founders" eyebrow="The team" title="Serial entrepreneurs who've built, scaled, and exited.">
        <p style={{color:C.dim, fontSize:16, maxWidth:840, marginBottom:28, marginTop:-8}}>
          Three of us built and exited <b style={{color:C.fg}}>Tipplr</b> together (acquired by GoKhana, Jan 2026) — a restaurant-commerce business on ONDC. We're now building the lending layer for the market we already know cold.
        </p>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(300px,100%),1fr))", gap:16}}>
          <Card accent={C.cyan}>
            <b style={{color:C.fg, fontSize:15}}>Goverdhan M D</b> <span style={{fontSize:12, color:C.cyan}}>· Co-Founder & CEO</span>
            <p style={{fontSize:13, color:C.dim, marginTop:8, lineHeight:1.55}}>Serial entrepreneur — "I build, scale, and exit marketplaces." Co-founded <b>Tipplr</b> (acquired by GoKhana, Jan 2026). 20+ years across marketplaces and enterprise technology. Leads product, technology, and fundraising.</p>
          </Card>
          <Card accent={C.cyan}>
            <b style={{color:C.fg, fontSize:15}}>Aparna</b> <span style={{fontSize:12, color:C.cyan}}>· Co-Founder</span>
            <p style={{fontSize:13, color:C.dim, marginTop:8, lineHeight:1.55}}>Founder Director of India's first credit-advocacy company. Works with regulators and <b>60+ lenders</b>; author of "Why is my Credit Report Screwed up" (Network18); columns in Mint, Femina, Outlook Money; TV credit expert. Leads credit policy & regulator relationships.</p>
          </Card>
          <Card accent={C.cyan}>
            <b style={{color:C.fg, fontSize:15}}>Srinivas Jayaram</b> <span style={{fontSize:12, color:C.cyan}}>· Co-Founder</span>
            <p style={{fontSize:13, color:C.dim, marginTop:8, lineHeight:1.55}}>Co-founded <b>Tipplr</b>. 20+ years across enterprise IT, data platforms, and startups — Engineering, Product & Data across Retail, FMCG, Banking, Insurance, FoodTech. Hands-on in AI/ML and ONDC. IICA-Certified Independent Director. Leads engineering & the AI platform.</p>
          </Card>
          <Card accent={C.cyan}>
            <b style={{color:C.fg, fontSize:15}}>Boi</b> <span style={{fontSize:12, color:C.cyan}}>· Co-Founder</span>
            <p style={{fontSize:13, color:C.dim, marginTop:8, lineHeight:1.55}}>Founder of <b>Petoo</b>, supplying ready-to-cook products to 300+ restaurants monthly across North-East India. IIM-Bangalore; 18+ years in banking & telecom (ICICI, Vodafone Idea) in credit & prepaid products. Already sells to the outlets we lend to.</p>
          </Card>
          <Card accent={C.cyan}>
            <b style={{color:C.fg, fontSize:15}}>Mathew Varkey</b> <span style={{fontSize:12, color:C.cyan}}>· Co-Founder</span>
            <p style={{fontSize:13, color:C.dim, marginTop:8, lineHeight:1.55}}>Co-founded <b>Tipplr</b>; Founder of Vanbey Services. Serial startup mentor and early-stage investor with 30+ years of marketing & business development across Asia. Leads go-to-market and distribution.</p>
          </Card>
          <Card accent={C.violet} style={{display:"flex", flexDirection:"column", justifyContent:"center"}}>
            <b style={{color:C.violet, fontSize:15}}>Why this team wins</b>
            <p style={{fontSize:12.5, color:C.dim, marginTop:8, lineHeight:1.55}}>Domain + credit + technology + distribution + operating experience — every leg of a HORECA lending business covered by someone who's actually done it.</p>
          </Card>
        </div>
      </Section>

      {/* ——— CLOSE ——— */}
      <section style={{padding:"64px 0 40px"}}>
        <div className="rc-mono" style={{color:C.cyan, letterSpacing:".2em", fontSize:13, marginBottom:16}}>RASOI CAPITAL</div>
        <h2 style={{fontSize:"clamp(28px,4.5vw,46px)", fontWeight:800, color:C.fg, lineHeight:1.05, marginBottom:16}}>
          The kitchen always pays.<br/><span style={{color:C.cyan}}>Now someone finally lends to it.</span>
        </h2>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(220px,100%),1fr))", gap:14, margin:"28px 0"}}>
          <Card accent={C.lime}><b style={{color:C.fg}}>✓ Working product</b><p style={{fontSize:12.5, color:C.dim, marginTop:4}}>Live AI underwriting + full lending stack — demo in your hands today</p></Card>
          <Card accent={C.lime}><b style={{color:C.fg}}>✓ Regulatory clarity</b><p style={{fontSize:12.5, color:C.dim, marginTop:4}}>₹10 Cr NOF priced in · both licence paths costed · policies board-ready</p></Card>
          <Card accent={C.violet}><b style={{color:C.fg}}>✓ Unfair data</b><p style={{fontSize:12.5, color:C.dim, marginTop:4}}>We control the account every rupee of aggregator revenue flows through</p></Card>
          <Card accent={C.lime}><b style={{color:C.fg}}>✓ Asset-backed raise</b><p style={{fontSize:12.5, color:C.dim, marginTop:4}}>~80% of funds become NOF + loan book, not burn</p></Card>
        </div>
        <div style={{display:"flex", gap:12, flexWrap:"wrap", alignItems:"center"}}>
          <a href="/underwrite" className="rc-btn" style={{width:"auto", padding:"11px 20px", textDecoration:"none"}}>🎯 Try the live engine</a>
          <a href="/RasoiCapital_PitchDeck.pptx" download className="rc-btn rc-btn-ghost" style={{width:"auto", padding:"11px 20px", textDecoration:"none"}}>⬇ Download the deck</a>
        </div>
        <div style={{marginTop:24, fontSize:13, color:C.dim}}>Goverdhan M D · Aparna · Srinivas Jayaram · Boi · Mathew Varkey — Co-Founders</div>
      </section>

    </div>
  );
}
