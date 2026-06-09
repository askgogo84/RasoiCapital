# ============================================================
# RASOI CAPITAL — COMPLETE SETUP GUIDE
# Run every command below from Jarvis (PowerShell)
# Time to live demo: ~45 minutes
# ============================================================

# ─────────────────────────────────────────────────────────────
# STEP 1 — Create Supabase Project
# ─────────────────────────────────────────────────────────────
# 1. Go to https://supabase.com/dashboard
# 2. Click "New Project"
# 3. Settings:
#    - Name:     rasoi-capital
#    - Password: (save this securely)
#    - Region:   South Asia (Mumbai) — IMPORTANT for RBI compliance
#    - Plan:     Free tier is fine for demo
# 4. Wait ~2 minutes for provisioning
# 5. Go to Settings → API
# 6. Copy:
#    - Project URL     → NEXT_PUBLIC_SUPABASE_URL
#    - anon public     → NEXT_PUBLIC_SUPABASE_ANON_KEY
#    - service_role    → SUPABASE_SERVICE_ROLE_KEY (keep secret!)

# ─────────────────────────────────────────────────────────────
# STEP 2 — Run Database Schema
# ─────────────────────────────────────────────────────────────
# Go to: Supabase Dashboard → SQL Editor
# Run each file IN ORDER (paste and click Run):
#   1. RasoiCapital_001_schema.sql
#   2. RasoiCapital_002_scoring_functions.sql
#   3. RasoiCapital_003_rls.sql
#   4. RasoiCapital_004_seed.sql
#
# ⚠️  Supabase SQL editor truncates large pastes.
#     If a file is >200 lines, paste in chunks of ~80 lines each.
#
# After running 004_seed.sql, verify:
# SELECT * FROM outlet_categories;        -- should show A,B,C,D
# SELECT * FROM location_types;           -- should show A,B,C,D,E
# SELECT COUNT(*) FROM city_cost_rates;   -- should show 8

# ─────────────────────────────────────────────────────────────
# STEP 3 — Clone / Setup Local Repo
# ─────────────────────────────────────────────────────────────
# On Jarvis (PowerShell):

cd C:\Users\gover

# Copy the rasoi-capital folder here (from Claude's output)
# Then:

cd rasoi-capital
npm install

# Create your .env.local
Copy-Item .env.example .env.local
# Edit .env.local with your Supabase keys and Anthropic API key

# Test locally
npm run dev
# Open http://localhost:3000

# ─────────────────────────────────────────────────────────────
# STEP 4 — Push to GitHub
# ─────────────────────────────────────────────────────────────

git init
git add .
git commit -m "Initial commit — Rasoi Capital v0.1"

# Create repo on GitHub: github.com/askgogo84/rasoi-capital
# Then:
git remote add origin https://github.com/askgogo84/rasoi-capital.git
git branch -M main
git push -u origin main

# ─────────────────────────────────────────────────────────────
# STEP 5 — Deploy to Vercel
# ─────────────────────────────────────────────────────────────
# Option A — Vercel CLI (from Jarvis):
npx vercel --prod

# Follow prompts:
#   - Link to existing account: Yes (same as CreditIQ)
#   - Set up and deploy: Yes
#   - Project name: rasoi-capital
#   - Directory: ./

# Option B — Vercel Dashboard:
# 1. Go to vercel.com/dashboard
# 2. "Add New Project" → Import from GitHub → rasoi-capital
# 3. Framework: Next.js (auto-detected)
# 4. Add environment variables (see Step 6)
# 5. Click Deploy

# ─────────────────────────────────────────────────────────────
# STEP 6 — Set Vercel Environment Variables
# ─────────────────────────────────────────────────────────────
# Vercel Dashboard → rasoi-capital project → Settings → Environment Variables
# Add ALL of these (all environments: Production + Preview + Development):

# NEXT_PUBLIC_SUPABASE_URL       = https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJ...
# SUPABASE_SERVICE_ROLE_KEY      = eyJ...  (sensitive — do not expose)
# ANTHROPIC_API_KEY              = sk-ant-...
# CRON_SECRET                    = RasoiCapital-cron-2026

# After adding vars: Vercel → Deployments → Redeploy

# ─────────────────────────────────────────────────────────────
# STEP 7 — Set Up Custom Domain (optional)
# ─────────────────────────────────────────────────────────────
# Buy rasoi.capital at GoDaddy/Namecheap (~$35/yr)
# Vercel → rasoi-capital → Settings → Domains
# Add: rasoi.capital
# Add DNS records as instructed by Vercel
# SSL auto-provisioned (~5 minutes)

# ─────────────────────────────────────────────────────────────
# STEP 8 — Set Up Cron Jobs
# ─────────────────────────────────────────────────────────────
# Go to: https://cron-job.org (free account)
# Create 6 jobs — all GET requests, all with this header:
#   Header Name:  x-cron-secret
#   Header Value: RasoiCapital-cron-2026

# Job 1:  06:00 IST  →  https://rasoi-capital.vercel.app/api/cron/update-dpd
# Job 2:  07:00 IST  →  https://rasoi-capital.vercel.app/api/cron/emi-reminders
# (Jobs 3-6 to be added as those routes are built in next sprint)

# ─────────────────────────────────────────────────────────────
# STEP 9 — Verify Everything Works
# ─────────────────────────────────────────────────────────────

# Test underwriting (from browser):
# 1. Go to https://rasoi-capital.vercel.app/underwrite
# 2. Fill: Category B, Sales ₹7L, Growth 12%, Location B, CIBIL 740
#    Ambience: 2 positive, 1 average
# 3. Click "Analyse & Underwrite"
# 4. Expected: Score ~3.7, Bucket C, Rate 19%, Claude narrative appears

# Test scoring API directly (PowerShell):
$body = @{
  outletCategory = "B"
  avgMonthlySalesInr = 700000
  qqGrowthPct = 12
  locationCode = "B"
  ambiencePos = 2
  ambienceAvg = 1
  cibilScore = 740
  outletName = "Test Outlet"
  city = "Bengaluru"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://rasoi-capital.vercel.app/api/score/run" `
  -Method POST -ContentType "application/json" -Body $body

# Expected response: success:true, composite_score:~3.7, bucket:"C"

# ─────────────────────────────────────────────────────────────
# TROUBLESHOOTING
# ─────────────────────────────────────────────────────────────

# Build fails with TypeScript errors:
#   npx tsc --noEmit
#   Fix any type errors shown

# Supabase connection fails:
#   Check NEXT_PUBLIC_SUPABASE_URL has no trailing slash
#   Check anon key is correct (not service role key)

# AI narrative not appearing:
#   Check ANTHROPIC_API_KEY is set in Vercel env vars
#   Check Vercel function logs for errors

# RLS blocking data:
#   Temporarily disable RLS for testing:
#   ALTER TABLE credit_score_runs DISABLE ROW LEVEL SECURITY;
#   Re-enable before going to production

# UTF-8 corruption (Windows):
#   Use: [System.IO.File]::WriteAllText(path, content, [System.Text.Encoding]::UTF8)
#   Never use: Set-Content or Out-File without -Encoding UTF8NoBOM
