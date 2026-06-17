# InvisiQ → Claude Design — Prompt Pack

Hand these HTML files + prompts to **Claude Design** (Anthropic Labs) to generate animated
explainer videos / motion clips for the InvisiQ website.

## Files in this folder (upload all three)

| File | What it shows | Use as |
|---|---|---|
| `invisiq-overlay-empty.html` | Overlay just opened — logo, tagline, hotkey hints | "App launches" beat |
| `invisiq-overlay.html` | Active chat — user Q + AI answer w/ code, stealth typing ON, proctor badge | Core product UI |
| `invisiq-hero-floating.html` | Overlay floating over a screen-shared video call; dashed frame = what the capture sees | Establishing / payoff shot |

These are pixel-faithful to the real Electron app (exact colors from `tailwind.config.ts` +
`globals.css`, real component layout). Tell Claude Design to **match these exactly** — same
teal accent (`#14b8a6`), deep-navy surfaces, Inter UI / JetBrains Mono code, 12px rounded
corners, 85%-opacity glassy panel.

---

## Brand facts to feed Claude Design

- **Name:** InvisiQ
- **Tagline:** *Your AI copilot that sees everything, but is seen by no one.*
- **One-liner:** An invisible AI desktop overlay — invisible to Zoom, Teams, Meet, OBS, and
  proctoring tools, yet always on top for you.
- **Accent / mood:** teal `#14b8a6` on deep navy `#0b0e14`; calm, premium, "stealth-tech",
  not flashy. Subtle glow, glassmorphism, smooth easing (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Signature visuals:** the teal ghost mark, the glowing teal "stealth typing" input ring,
  the green shield (stealth ON), the "you're invisible" framing.

---

## Prompt 1 — 20–30s hero explainer (recommended starting point)

> I'm uploading three HTML mockups of **InvisiQ**, an invisible AI desktop overlay. Tagline:
> "Your AI copilot that sees everything, but is seen by no one." Use the uploaded files as the
> exact source of truth for UI, colors, type, and layout — do not redesign the interface.
>
> Create a **25-second animated explainer** in a 16:9 frame, dark/premium aesthetic, teal
> (`#14b8a6`) accent on deep navy. Storyboard:
> 1. **(0–4s)** A screen-share / video call (`invisiq-hero-floating.html` background) with a red
>    "You are sharing your screen" badge. Calm, ordinary.
> 2. **(4–9s)** The InvisiQ overlay (`invisiq-overlay-empty.html`) **fades + scales in** from the
>    bottom-right (200ms ease-out, fade + scale 0.95→1.0). Caption: "Meet InvisiQ."
> 3. **(9–16s)** Cut to the active overlay (`invisiq-overlay.html`): a user question types into
>    the glowing teal input, an AI answer with a code block **streams in token-by-token**, a
>    blinking caret at the end. Caption: "Ask anything. Get answers — instantly."
> 4. **(16–21s)** Pull back to the hero scene. A dashed red frame labelled "What the screen-share
>    sees" sweeps across — and the overlay is **outside it / invisible to the capture**. Caption:
>    "Invisible to Zoom, Teams, Meet, OBS, and proctoring tools."
> 5. **(21–25s)** End card: centered InvisiQ ghost mark + wordmark, tagline, soft teal glow pulse.
>
> Keep motion smooth and restrained, respect reduced-motion sensibilities, no harsh flashes.
> Export as MP4 (1920×1080) and a looping web-friendly version.

## Prompt 2 — 8s looping website hero clip (silent, autoplay)

> Using the uploaded InvisiQ mockups as exact UI reference, make an **8-second seamless loop**
> for a website hero (silent, autoplay, 16:9 and a 1:1 variant). The InvisiQ overlay
> (`invisiq-overlay.html`) sits bottom-right over a faintly blurred desktop. Loop: the teal
> "stealth typing" input ring **pulses** once, a short AI reply **streams in**, the green shield
> icon **glints**, then a soft teal glow breathes around the panel. Deep-navy bg, teal accent,
> glassmorphism. No text captions — pure product motion. Must loop perfectly.

## Prompt 3 — Feature spotlight: "Type without being seen"

> From the uploaded `invisiq-overlay.html`, animate a **10-second feature spotlight** on stealth
> typing. Zoom into the input row. Show the keyboard icon lighting teal with a glow, the input
> border ring pulsing, and the placeholder "Stealth typing — type anywhere…" being replaced by
> real typed text appearing **character by character** (as if captured invisibly). Then the
> proctor badge "Monitored app detected — you're invisible" slides up in teal. Caption:
> "Type from any app. Your keystrokes never touch the screen-share." Dark premium look, teal accent.

## Prompt 4 — Static social / OG image set

> Using the uploaded InvisiQ mockups, generate a set of **static marketing visuals**: (a) a 1200×630
> OG/social card — overlay floating over a dim desktop, tagline "Seen by no one." in the corner;
> (b) a 1080×1080 square for social; (c) a clean product shot of just the overlay on a soft
> gradient. Match the exact UI, teal `#14b8a6` accent, deep navy, Inter type.

---

## Tips for best results

- Upload **all three HTML files together** so Claude Design has the empty state, the active
  state, and the in-context scene — it can interpolate between them for transitions.
- If Claude Design supports reading a design system from a codebase, point it at
  `tailwind.config.ts` + `src/renderer/styles/globals.css` for the authoritative tokens.
- Ask it to **export to HTML or MP4/PPTX** (Claude Design supports Canva / PDF / PPTX / HTML
  export) so you can drop the result straight into the website or `ghostai-site`.
- Keep captions short; let the product motion (streaming text, glow, fade-in) carry the story.
