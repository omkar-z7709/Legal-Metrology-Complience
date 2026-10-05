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
SIH/
├── backend/                  # Fastify 5 REST API & AI/OCR engine
├── frontend/                 # Next.js 15 App Router web application
├── samples/                  # Sample test datasets for inspection
│   ├── dataset_1/
│   ├── dataset_2/
│   └── preprocessed/
├── backup_history/           # Step-by-step architectural change summaries
├── docker-compose.yml        # Local Postgres + pgvector setup
├── package.json              # Monorepo workspace scripts
└── README.md
```

---

## 🚀 Quick Start

### 1. Monorepo Root Execution (Recommended)

```bash
# Install dependencies for all workspace packages
npm run install:all

# Start both backend (port 8000) and frontend (port 3000) concurrently
npm run dev
```

### 2. Individual Package Execution

#### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Health check available at: `http://localhost:8000/api/health`

#### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Dashboard accessible at: `http://localhost:3000`
