// lib/parsers/prompts.ts
// Extraction prompts for Claude vision. JSON-only output, format-agnostic.

export const BANK_STATEMENT_PROMPT = `You are a precise bank statement parser for Indian bank statements (any bank: HDFC, ICICI, SBI, Axis, Kotak, Yes, etc.).

Extract EVERY transaction from this statement. Respond with ONLY a JSON object, no markdown fences, no preamble:

{
  "account_holder": string | null,
  "bank_name": string | null,
  "statement_period": { "from": "YYYY-MM-DD" | null, "to": "YYYY-MM-DD" | null },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": string,
      "amount": number,            // always positive
      "direction": "credit" | "debit",
      "balance": number | null
    }
  ],
  "confidence": number             // 0..1 overall extraction confidence
}

Rules:
- amount is the absolute value; direction carries the sign.
- Indian formats: "1,23,456.78" means 123456.78. Dates may be DD/MM/YYYY or DD-MMM-YY — normalize to YYYY-MM-DD (day-first).
- Keep the full narration in description (settlement references like "ZOMATO", "SWIGGY", "BUNDL TECHNOLOGIES", UPI refs matter downstream).
- If a page is unreadable, skip its rows and lower confidence. Never invent transactions.
- If this document is NOT a bank statement, return {"transactions": [], "confidence": 0}.`;

export const PAYOUT_PROMPT = `You are a precise parser for Indian food-delivery platform payout reports/invoices (Zomato or Swiggy, any format or period).

Extract EVERY settlement/payout period in this document. Respond with ONLY a JSON object, no markdown fences, no preamble:

{
  "platform": "zomato" | "swiggy" | "unknown",
  "outlet_name": string | null,
  "settlements": [
    {
      "period_start": "YYYY-MM-DD" | null,
      "period_end": "YYYY-MM-DD" | null,
      "gross_sales": number | null,     // customer-paid order value / subtotal
      "commission": number | null,      // platform commission incl. its GST if shown together
      "ads": number | null,             // ad/CPC spend deductions
      "promos": number | null,          // discounts/promo funding borne by outlet
      "taxes": number | null,           // TDS/TCS/GST deductions not in commission
      "net_payout": number,             // final amount paid to outlet bank (REQUIRED)
      "payout_date": "YYYY-MM-DD" | null
    }
  ],
  "confidence": number                  // 0..1
}

Rules:
- net_payout is the single most important field — the exact amount that hits the bank.
- Weekly payout docs commonly have one settlement; monthly summaries may have several. Extract all.
- Indian number formats as above. Never invent values — use null for anything not present.
- If this is not a payout/settlement document, return {"platform":"unknown","settlements":[],"confidence":0}.`;
