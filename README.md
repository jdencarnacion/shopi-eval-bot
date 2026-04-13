# Shopi Eval Bot

Real-time AI assistant for Shopify Plus sales reps during merchant discovery calls.

## What it does

- **Battlecards** surface automatically when a competitor is mentioned (SFCC, Adobe Commerce, BigCommerce, WooCommerce, commercetools)
- **Fit cards** appear when a merchant describes a pain point Shopify solves
- **Live qualification scorecard** tracks WHAT-WHO-WHY discovery criteria (Problem, Impact, Authority, Budget, Timeline, Champion, Process, Competition)
- **Coaching notes** prompt the rep when something important happens

## Architecture

```
app/          — Next.js 14 web app (demo UI + API layer)
extension/    — Chrome extension (injects sidebar into Google Meet)
lib/          — Knowledge base + system prompt
```

### How it works

```
Google Meet audio
  → Chrome extension (tab audio capture)
  → /api/transcribe  (Deepgram nova-2, server-side)
  → /api/analyze     (Claude via Shopify AI Proxy)
  → Overlay sidebar  (battlecard / fit card / scorecard)
```

Latency: ~3–4 seconds from speech to card.

## Setup

### 1. Next.js app

```bash
pnpm install
```

Add to `.env.local`:
```
OPENAI_API_KEY=<shopify-llm-gateway-token>
SHOPIFY_LLM_BASE_URL=https://proxy.shopify.ai/v1
DEEPGRAM_API_KEY=<your-deepgram-key>   # free at console.deepgram.com
```

```bash
pnpm dev   # runs on localhost:3002
```

### 2. Chrome extension

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Join a Google Meet call
5. Click the 🎯 icon → **▶ Start Listening**

## Demo UI

Visit `http://localhost:3002` to test battlecard and fit card responses manually without a live call.
