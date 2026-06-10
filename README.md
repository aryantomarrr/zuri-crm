# Zuri CRM — AI-Native Marketing Platform

> A marketer types one business goal. The AI builds the audience, writes personalized messages, picks the channel, fires the campaign, and tells you what happened — and why.

**Live Demo**: https://zuri-crm.vercel.app  
**Channel Stub**: https://channel-stub-production.up.railway.app  
**Repo**: https://github.com/aryantomarrr/zuri-crm

---

## What I Built

Zuri is an AI-native Mini CRM for a fictional Indian DTC women's fashion brand. It helps a marketer go from a plain-English business goal to a launched, tracked campaign — with AI handling every step in between.

The marketer opens the app and sees a chat interface. They type:

> *"Win back customers who spent over ₹2000 but haven't ordered in 60 days. Offer 20% off."*

The AI agent then:
1. **Builds the segment** — translates natural language to a SQL WHERE clause, queries the database, returns matched customers with names, cities, and spend data
2. **Recommends the channel** — scores WhatsApp vs Email vs SMS based on campaign type and segment characteristics, explains its reasoning
3. **Drafts personalized messages** — generates a unique message per customer using their name, city, and purchase history
4. **Creates the campaign** — saves everything to the database, stores AI reasoning
5. **Launches and tracks** — fires messages to the channel stub, receives async delivery callbacks, updates live stats in real time
6. **Surfaces insights** — after callbacks settle, generates a plain-English campaign performance summary

---

## Architecture

```
┌─────────────────────────────────────┐     ┌──────────────────────────┐
│         CRM Core (Next.js)          │     │   Channel Stub (Express) │
│         Vercel                      │     │   Railway                │
│                                     │     │                          │
│  Chat UI → AI Agent                 │────▶│  POST /send              │
│  (OpenRouter / claude-3-haiku)      │     │  Simulates delivery      │
│                                     │◀────│  POST /api/receipt       │
│  PostgreSQL (Neon) + Prisma         │     │  Async callbacks         │
│  SSE live stats stream              │     └──────────────────────────┘
└─────────────────────────────────────┘
```

### Two-service design
The CRM and channel stub are completely separate services on separate domains. This mirrors how real messaging infrastructure works — the CRM dispatches to a channel provider and receives asynchronous delivery receipts via webhooks.

### AI agent architecture
The agent uses OpenRouter's tool-use API with 4 tools:
- `build_segment` — NL → SQL → DB query
- `recommend_channel` — scoring logic based on campaign type and segment
- `draft_messages` — per-customer personalization
- `create_campaign` — saves to DB with AI reasoning stored

### Data model
```
customers → orders
         ↓
      segments → campaigns → campaign_members → comm_events
                                                (append-only event log)
```

`comm_events` is append-only. Every delivery callback inserts a row. Analytics are aggregated from this table — no mutable counters, no race conditions.

### Live stats
Uses Server-Sent Events (SSE) for real-time delivery updates. The `/api/campaigns/[id]/live` route polls the database every 2 seconds and streams updates to the frontend. Chose SSE over WebSocket because it's unidirectional (server→client only), works natively on Vercel, and requires no additional infrastructure.

---

## Channel Stub Design

The stub simulates a full messaging delivery lifecycle with realistic rates:

| Channel | Delivered | Read | Clicked | Converted |
|---------|-----------|------|---------|-----------|
| WhatsApp | 91% | 68% | 22% | 5% |
| Email | 88% | 35% | 9% | 3% |
| SMS | 94% | 45% | 12% | 4% |

Events fire in correct sequence: `sent → delivered → read → clicked → order_placed`. A message can never be `clicked` before `delivered`.

**Retry logic**: failed callbacks retry 3× with exponential backoff (1s, 2s, 3s).

**Idempotency**: the receipt API uses a unique constraint on `(campaignMemberId, eventType)` — duplicate callbacks don't corrupt counts.

---

## Scale Tradeoffs

| Decision | What I did | What I'd do at scale |
|----------|-----------|---------------------|
| Queue | In-memory setTimeout | BullMQ + Redis for durability, dead letter queue |
| Live updates | SSE polling every 2s | WebSocket or Redis pub/sub |
| NL→SQL | Keyword regex + AI | Constrained DSL to prevent SQL injection, read-only DB role |
| Message generation | Per-member AI call | Batch API calls, pre-generate at segment creation |
| Database | Neon serverless | RDS with connection pooling (PgBouncer) |
| AI provider | OpenRouter | Anthropic direct, with fallback provider |

---

## What I Did NOT Build (and Why)

- **Authentication** — Single marketer demo. Would use NextAuth.js at production scale.
- **Real channel integrations** — Assignment explicitly says don't. Stub only.
- **A/B testing** — Valid feature but not core to demonstrating the AI-native loop.
- **Campaign scheduling** — All campaigns fire immediately. Cron scheduling adds complexity without demo value.
- **Automation workflows** — Trigger-based drips are a separate product surface.
- **Sales/support CRM** — Assignment explicitly says this is NOT a deals/pipeline/tickets CRM.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend + API | Next.js 14 (App Router) | One repo, API routes built-in, SSE works natively |
| AI | OpenRouter (claude-3-haiku) | Tool use API, fast, cost-effective |
| Database | Neon PostgreSQL + Prisma | Serverless, free tier, typed queries |
| Channel Stub | Express.js | Minimal, separate service, Railway deploy |
| Styling | Tailwind CSS | Fast to write, consistent |
| CRM Deploy | Vercel | Zero config, SSE support |
| Stub Deploy | Railway | Always-on, separate domain |

---

## Local Development

### Prerequisites
- Node.js 18+
- A Neon PostgreSQL database
- An OpenRouter API key

### Setup

```bash
# Clone
git clone https://github.com/aryantomarrr/zuri-crm
cd zuri-crm

# Install deps
npm install

# Set environment variables
cp .env.example .env
# Fill in DATABASE_URL, OPENROUTER_API_KEY, CHANNEL_STUB_URL, NEXT_PUBLIC_APP_URL

# Run migrations and seed
npx prisma migrate dev
npx prisma db seed

# Start CRM
npm run dev

# Start channel stub (separate terminal)
cd ../channel-stub
npm install
npx ts-node index.ts
```

---

## Seed Data

60 customers across Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Kolkata, Pune with realistic Indian names, order histories, and spend patterns. Categories: kurtas, sarees, ethnic wear, western wear, accessories. Price range ₹600–₹12,000.

---

## AI-Native Workflow

Built using this chat (Claude) as a pair programmer alongside Cursor for editing. Claude generated complete file implementations which were reviewed, tested, and corrected before committing. Every architectural decision was made deliberately — Claude's output was the starting point, not the final answer.
