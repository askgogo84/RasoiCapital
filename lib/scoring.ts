// Rasoi Capital — Credit Scoring Engine
// Exact implementation of Credit Risk Policy

export const OUTLET_MARGINS: Record<string, number> = {
  A: 35, B: 32, C: 27, D: 24
}

export const LOCATION_SCORES: Record<string, number> = {
  A: 5, B: 4, C: 3, D: 2, E: 1
}

// Factor 1: Outlet Margin (weight 30%)
export function scoreMargin(cat: string): number {
  const m = OUTLET_MARGINS[cat] || 0
  if (m >= 30) return 5
  if (m >= 25) return 4
  if (m >= 20) return 3
  if (m >= 15) return 2
  return 1
}

// Factor 2: Q-Q Sales Growth (weight 30%)
export function scoreQQGrowth(pct: number): number {
  if (pct >= 20) return 5
  if (pct >= 15) return 4
  if (pct >= 10) return 3
  if (pct >= 5)  return 2
  return 1
}

// Factor 3: Avg Monthly Sales (weight 20%)
export function scoreAvgSales(inr: number): number {
  const L = inr / 100000
  if (L >= 10) return 5
  if (L >= 7)  return 4
  if (L >= 5)  return 3
  if (L >= 3)  return 2
  return 1
}

// Factor 4: Location (weight 10%)
export function scoreLocation(code: string): number {
  return LOCATION_SCORES[code] || 1
}

// Factor 5: Ambience (weight 5%)
// pos = positive count (0-3), avg = average count (0-3)
export function scoreAmbience(pos: number, avg: number): number {
  if (pos === 3)               return 5
  if (pos === 2 && avg >= 1)   return 4
  if (pos === 1 && avg >= 2)   return 3
  if (avg === 3)               return 2
  return 1
}

// Factor 6: CIBIL (weight 5%)
export function scoreCIBIL(score: number): number {
  if (score >= 760) return 5
  if (score >= 730) return 4
  if (score >= 700) return 3
  if (score >= 670) return 2
  return 1
}

export interface ScoringInput {
  outletCategory:   string   // A/B/C/D
  avgMonthlySalesInr: number
  qqGrowthPct:      number
  locationCode:     string   // A-E
  ambiencePos:      number   // 0-3
  ambienceAvg:      number   // 0-3
  cibilScore:       number
  cycleNumber?:     number   // default 1
}

export interface ScoringResult {
  factors: {
    margin:   number
    qqGrowth: number
    avgSales: number
    location: number
    ambience: number
    cibil:    number
  }
  compositeScore:   number
  marginPct:        number
  bucket:           'G' | 'C' | 'P'
  bucketLabel:      string
  decision:         string
  loanTerms: {
    interestRatePct:    number
    processingFeePct:   number
    emiPctOfMargin:     number
    tenureMonths:       number
    collateralRequired: boolean
    monthlyMarginInr:   number
    monthlyEmiInr:      number
    dailyEmiInr:        number
    rawLoanAmtInr:      number
    finalLoanAmtInr:    number
    processingFeeInr:   number
    disbursementInr:    number
  }
  belowPar: boolean
}

export function runScoring(input: ScoringInput): ScoringResult {
  const cycle = input.cycleNumber || 1
  const marginPct = OUTLET_MARGINS[input.outletCategory] || 27

  const factors = {
    margin:   scoreMargin(input.outletCategory),
    qqGrowth: scoreQQGrowth(input.qqGrowthPct),
    avgSales: scoreAvgSales(input.avgMonthlySalesInr),
    location: scoreLocation(input.locationCode),
    ambience: scoreAmbience(input.ambiencePos, input.ambienceAvg),
    cibil:    scoreCIBIL(input.cibilScore),
  }

  const compositeScore = Math.round((
    factors.margin   * 0.30 +
    factors.qqGrowth * 0.30 +
    factors.avgSales * 0.20 +
    factors.location * 0.10 +
    factors.ambience * 0.05 +
    factors.cibil    * 0.05
  ) * 100) / 100

  // Bucket + terms from Credit Risk Policy
  let bucket: 'G' | 'C' | 'P', bucketLabel: string, decision: string
  let interestRatePct: number, processingFeePct: number
  let emiPctOfMargin: number, tenureMonths: number, collateralRequired: boolean

  if (compositeScore >= 4.5) {
    bucket = 'G'; bucketLabel = 'Good'; decision = 'auto_approve'
    interestRatePct = 18; processingFeePct = 2.5
    emiPctOfMargin = 45; tenureMonths = 12; collateralRequired = false
  } else if (compositeScore >= 4.0) {
    bucket = 'G'; bucketLabel = 'Good'; decision = 'auto_approve'
    interestRatePct = 18; processingFeePct = 2.5
    emiPctOfMargin = 40; tenureMonths = 12; collateralRequired = false
  } else if (compositeScore >= 3.7) {
    bucket = 'C'; bucketLabel = 'Consider'; decision = 'approve_with_conditions'
    interestRatePct = 19; processingFeePct = 2.5
    emiPctOfMargin = 35; tenureMonths = 6; collateralRequired = true
  } else if (compositeScore >= 3.5) {
    bucket = 'C'; bucketLabel = 'Consider'; decision = 'approve_with_conditions'
    interestRatePct = 20; processingFeePct = 2.5
    emiPctOfMargin = 30; tenureMonths = 6; collateralRequired = true
  } else if (compositeScore >= 3.25) {
    bucket = 'P'; bucketLabel = 'Pause'; decision = 'manual_review'
    interestRatePct = 25; processingFeePct = 3.0
    emiPctOfMargin = 25; tenureMonths = 6; collateralRequired = true
  } else if (compositeScore >= 3.0) {
    bucket = 'P'; bucketLabel = 'Pause'; decision = 'manual_review'
    interestRatePct = 27; processingFeePct = 3.0
    emiPctOfMargin = 20; tenureMonths = 6; collateralRequired = true
  } else {
    bucket = 'P'; bucketLabel = 'Pause'; decision = 'reject'
    interestRatePct = 27; processingFeePct = 3.0
    emiPctOfMargin = 0; tenureMonths = 0; collateralRequired = true
  }

  const belowPar = compositeScore < 3.0
  const monthlyMarginInr = (input.avgMonthlySalesInr * marginPct) / 100
  const monthlyEmiInr = monthlyMarginInr * (emiPctOfMargin / 100)
  const dailyEmiInr = Math.round(monthlyEmiInr / 30)
  const rawLoanAmtInr = monthlyEmiInr * tenureMonths
  const loanCap = cycle === 1 ? 300000 : cycle === 2 ? 700000 : rawLoanAmtInr
  const finalLoanAmtInr = Math.min(rawLoanAmtInr, loanCap)
  const processingFeeInr = finalLoanAmtInr * (processingFeePct / 100)
  const disbursementInr = finalLoanAmtInr - processingFeeInr

  return {
    factors, compositeScore, marginPct, bucket, bucketLabel, decision,
    loanTerms: {
      interestRatePct, processingFeePct, emiPctOfMargin, tenureMonths,
      collateralRequired, monthlyMarginInr,
      monthlyEmiInr: Math.round(monthlyEmiInr),
      dailyEmiInr,
      rawLoanAmtInr: Math.round(rawLoanAmtInr),
      finalLoanAmtInr: Math.round(finalLoanAmtInr),
      processingFeeInr: Math.round(processingFeeInr),
      disbursementInr: Math.round(disbursementInr),
    },
    belowPar,
  }
}
