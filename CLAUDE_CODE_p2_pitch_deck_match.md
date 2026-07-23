# CLAUDE CODE INSTRUCTION — P2: make /pitch match the deck (theme-independent light) + fix edge cutting

Repo: `C:\Users\gover\rasoi-capital` · branch `main`.

**Rules**
1. Investigate and report Step 0 before editing anything.
2. Scope: `app/pitch/page.tsx` and the pitch section of `app/rasoi-theme.css` ONLY. Do not touch global tokens, other pages, or the sidebar. No new dependencies.
3. After each step say what changed and why.
4. `npx next build` before pushing. Commit to `main` (check `git branch --show-current`).

---

## Context: the bug

`/pitch` is styled to match the downloadable deck (cream/orange), but its cards still resolve colours from the global `--rc-*` theme tokens. In dark mode the card surfaces go dark while the text stays deck-dark — dark-on-dark, invisible. Screenshot confirms: the "AI Underwriting Engine / Full Lending Platform / RBI-Aligned Policy Stack" cards render with unreadable body text in dark mode.

**The fix is NOT to add dark-mode colours to /pitch.** The pitch page is an investor artifact that must match a light deck. It should render light in both theme states, and the theme toggle should simply not affect it.

Separately, content is being cut off at the left and right edges — a section is escaping the page container.

---

## STEP 0 — Investigate (report, do not edit)

1. How is the theme applied? Print the exact mechanism — `data-theme` attribute on `<html>`/`<body>`, a `.dark` class, or something else. Show the selector used in `app/rasoi-theme.css` (e.g. `[data-theme="dark"] { ... }`).
2. Print the full list of CSS custom properties `/pitch` consumes. Grep `app/pitch/page.tsx` for `var(--` and list every unique token.
3. What is the outermost wrapper element and className in `app/pitch/page.tsx`? Does it use `rc-page` like other routes, or something custom?
4. Find the cause of the horizontal cut-off. Look for any of: `width: 100vw`, negative margins (`margin-left: -`), `position: absolute` sections, `left: 50%` full-bleed tricks, or a fixed `width`/`min-width` larger than the container. Print what you find with file and line.
5. Does `app/pitch/page.tsx` use inline `style={{}}` colours with hardcoded hex values anywhere? List them.

Report all five before continuing.

---

## STEP 1 — Lock /pitch to the deck palette, theme-independent

These are the **exact colours extracted from `public/RasoiCapital_PitchDeck.pptx`** — use these values, do not substitute:

```css
/* ---- /pitch : deck-matched palette, independent of the dark/light toggle ---- */
.rc-pitch {
  --pitch-bg:        #FAF7F2;  /* deck page background (cream) */
  --pitch-surface:   #FFFFFF;  /* card surface */
  --pitch-surface-2: #F8FAFC;  /* alternate/inset surface */
  --pitch-border:    #E2E8F0;
  --pitch-border-str:#CBD5E1;
  --pitch-ink:       #0F172A;  /* headings */
  --pitch-body:      #475569;  /* body text */
  --pitch-muted:     #94A3B8;  /* captions, eyebrows */
  --pitch-accent:    #E8520A;  /* deck orange */
  --pitch-accent-bg: #FFF4EC;  /* orange tint panel */
  --pitch-green:     #15803D;
  --pitch-teal:      #0F766E;
  --pitch-amber:     #B45309;
  --pitch-red:       #B91C1C;

  background: var(--pitch-bg);
  color: var(--pitch-body);
}

/* The toggle must not reach inside the pitch page — redeclare under BOTH theme
   states so dark mode inherits identical values. Replace the selector below with
   the actual mechanism found in Step 0. */
[data-theme="dark"] .rc-pitch,
[data-theme="light"] .rc-pitch {
  --pitch-bg:        #FAF7F2;
  --pitch-surface:   #FFFFFF;
  --pitch-surface-2: #F8FAFC;
  --pitch-border:    #E2E8F0;
  --pitch-border-str:#CBD5E1;
  --pitch-ink:       #0F172A;
  --pitch-body:      #475569;
  --pitch-muted:     #94A3B8;
  --pitch-accent:    #E8520A;
  --pitch-accent-bg: #FFF4EC;
  --pitch-green:     #15803D;
  --pitch-teal:      #0F766E;
  --pitch-amber:     #B45309;
  --pitch-red:       #B91C1C;
  background: var(--pitch-bg);
  color: var(--pitch-body);
}

.rc-pitch h1, .rc-pitch h2, .rc-pitch h3 { color: var(--pitch-ink); }
.rc-pitch .rc-eyebrow { color: var(--pitch-muted); }

.rc-pitch .rc-panel,
.rc-pitch .rc-card {
  background: var(--pitch-surface);
  border: 1px solid var(--pitch-border);
  color: var(--pitch-body);
}
.rc-pitch .rc-panel-title { color: var(--pitch-ink); }
```

Then in `app/pitch/page.tsx`:

- Add `rc-pitch` to the outermost wrapper div's className (keep whatever is already there).
- Replace every `var(--rc-*)` colour reference inside this page with its `--pitch-*` equivalent (`--rc-fg` → `--pitch-ink` for headings / `--pitch-body` for prose, `--rc-dim` → `--pitch-muted`, `--rc-panel` → `--pitch-surface`, accent → `--pitch-accent`).
- Replace the hardcoded hex inline styles found in Step 0 with the matching `--pitch-*` token so there is one source of truth.
- Status badges: LIVE → `--pitch-green`, DRAFTED / roadmap → `--pitch-amber`, risk/red → `--pitch-red`. Badge text must sit on a light tinted background, never coloured-on-coloured.

Do NOT restructure the JSX, reorder sections, or reword copy.

## STEP 1b — The download button (was a separate open item)

While you are in this file: the "Download the deck" button text was reported invisible in light mode (teal-on-teal). With the palette above, set it explicitly — white text on `--pitch-accent` fill, in both theme states. Confirm the button still resolves to `/RasoiCapital_PitchDeck.pptx`.

---

## STEP 2 — Fix the edge cutting

Using your Step 0 finding: the page content must stay inside the same content container the other routes use, so it never sits flush against or past the viewport edge next to the sidebar.

- If a section uses a `100vw` / negative-margin full-bleed trick, remove it — `100vw` includes the scrollbar and ignores the sidebar offset, which is what pushes content past the right edge.
- Ensure the page wrapper has symmetric horizontal padding and `max-width` consistent with `/analytics` and `/projections`, and `overflow-x: hidden` is NOT used to mask the problem — fix the cause.
- Add `box-sizing: border-box` to pitch children if any element sets `width: 100%` alongside horizontal padding.

Target: at 1440px, 1024px, and 375px, no content touches or crosses the left/right boundary, and there is no horizontal scrollbar.

---

## STEP 3 — Verify

`npm run dev`, then on `/pitch`:

1. **Toggle dark/light** — the page must look identical in both. Every card's body text readable in both. This is the primary acceptance test.
2. All three status cards (AI Underwriting Engine, Full Lending Platform, RBI-Aligned Policy Stack) fully legible.
3. Widths 1440 / 1024 / 375 — no edge cut-off, no horizontal scrollbar.
4. Download button legible in both themes and downloads the .pptx.
5. Confirm no other route changed appearance (spot-check `/analytics` and `/underwrite` in both themes — the new selectors must not leak).

---

## STEP 4 — Audit report

- Every file modified and what changed.
- Which `--rc-*` tokens you replaced and with what.
- The actual root cause of the edge cutting.
- Any place the `.rc-pitch` scoping could leak to another route.
- What Gogo should check on the deployed URL before showing an investor.
