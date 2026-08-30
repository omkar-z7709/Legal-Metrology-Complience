# AI + RAG Based Legal Metrology Compliance System (SIH Prototype)

A high-precision, explainable automated compliance inspection system for packaged commodities under the Legal Metrology (Packaged Commodities) Rules, 2011.

---

## 🏛️ System Architecture

```
                       ┌────────────────────────┐
                       │ Officer / Inspector UI │
                       └───────────┬────────────┘
                                   │
                                   ▼
                       ┌────────────────────────┐
                       │   Next.js 15 App       │
                       │ (React 19, TypeScript) │
                       └───────────┬────────────┘
                                   │ HTTP / JSON
                                   ▼
                       ┌────────────────────────┐
                       │  Fastify 5 Backend API │
                       │      (TypeScript)      │
                       └─────┬────────────┬─────┘
                             │            │
             ┌───────────────┘            └───────────────┐
             ▼                                            ▼
┌─────────────────────────┐                  ┌─────────────────────────┐
│ OCR & Extraction Layer  │                  │ Supabase Infrastructure │
├─────────────────────────┤                  ├─────────────────────────┤
│ • Google Cloud Vision   │                  │ • PostgreSQL (Drizzle)  │
│ • Gemini Structured JSON│                  │ • pgvector (RAG Search) │
│ • TypeScript Rules      │                  │ • Supabase Auth (JWT)   │
│ • CV Visual Estimator   │                  │ • Storage (Signed URLs) │
└─────────────────────────┘                  └─────────────────────────┘
```

---

## 📁 Repository Structure

```
legal-metrology-compliance/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts           # Zod-validated environment config
│   │   ├── db/
│   │   │   └── supabase.ts      # Official Supabase client & connection health
│   │   ├── routes/
│   │   │   └── health.ts        # Fastify health & liveness routes
│   │   ├── scripts/
│   │   │   ├── test-db.ts       # Supabase connection probe
│   │   │   └── test-server.ts   # Route inject self-test
│   │   ├── app.ts               # Fastify app factory (CORS, sensible, routes)
│   │   └── server.ts            # Entrypoint listener
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css      # Tailwind CSS styling
│   │   │   ├── layout.tsx       # Root layout
│   │   │   └── page.tsx         # Module 0 verification dashboard
│   │   └── lib/
│   │       └── api.ts           # Type-safe API client
│   ├── .env.local.example
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml           # Optional local Postgres + pgvector setup
└── package.json                 # Monorepo workspace runner scripts
```

---

## 🚀 Quick Start (Module 0)

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Health check available at: `http://localhost:8000/api/health`

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Dashboard accessible at: `http://localhost:3000`
