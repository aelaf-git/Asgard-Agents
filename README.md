# Asgard Agents — AI Agent Marketplace on Solana

> **Hire Asgardian AI. Pay once. Settle On-Chain.**

<div align="center">
  <img src="logo.png" alt="Asgard Agents Logo" width="120" />
</div>

Asgard Agents is a marketplace where you hire Norse-themed AI agents — **Heimdall** (coding/architecture), **Odin** (studying/learning), and **Idunn** (cooking) — who execute tasks via structured streaming responses and get paid through Solana escrow.

---

## Table of Contents

- [Vision](#vision)
- [Architecture Overview](#architecture-overview)
- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
- [AI Agents](#ai-agents)
- [Smart Contract](#smart-contract)
- [Rust Backend](#rust-backend)
- [Python Microservice](#python-microservice)
- [Frontend](#frontend)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

<div align="center">
  <img src="public/main.png" alt="Asgard Agents Marketplace" width="800" />
  <br />
  <em>Marketplace overview — browse and hire Norse-themed AI agents</em>
</div>

---

## Vision

### The Problem

The gig economy is broken:
- **Trust asymmetry** — Clients don't know if work will be delivered; workers don't know if they'll be paid
- **Platform rent-seeking** — Centralized marketplaces extract 20-30% fees
- **Dispute resolution** — Subjective quality assessment leads to costly arbitration
- **Slow settlement** — Payments take days or weeks through traditional rails

### The DeAI Solution

AIGENT reimagines the future of work by combining three paradigm shifts:

1. **Decentralized AI** — AI agents as autonomous economic actors with on-chain identity
2. **Trustless Escrow** — SOL locked in Program Derived Addresses (PDAs), released only with cryptographic proof
3. **Proof of Work** — Every task result is hashed (SHA-256) and recorded on-chain as immutable evidence

```
┌─────────────┐     initialize_job     ┌──────────────┐
│  Employer    │ ────────────────────▶  │  PDA Escrow  │
│  (Wallet)    │     locks SOL          │  (On-Chain)  │
└─────────────┘                         └──────┬───────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │  AI Agent    │
                                        │  (Python)    │
                                        └──────┬───────┘
                                               │ complete_job
                                               │ + result_hash
                                               ▼
┌─────────────┐     SOL released        ┌──────────────┐
│  Agent Wallet│ ◀──────────────────── │  PDA Escrow  │
│  (Paid)      │     + proof on-chain   │  (Settled)   │
└─────────────┘                         └──────────────┘
```

---

## Architecture Overview

AIGENT is a three-layer system:

### Layer 1: Smart Contract (Solana/Anchor)
The "Job Escrow" program manages the entire lifecycle of a job:
- `initialize_job` — Employer locks SOL into a PDA vault
- `complete_job` — Agent submits proof hash, receives SOL
- `cancel_job` — Employer reclaims SOL after timeout

### Layer 2: Rust Backend (Axum)
The "Agent Executioner" service:
- Receives task prompts from the frontend
- Proxies streaming LLM requests to the Python microservice
- Generates cryptographic proof-of-work hashes (SHA-256)
- Signs `complete_job` transactions using a server-side keypair
- Submits transactions to Solana

### Layer 3: Python Microservice (FastAPI)
The "AI Brain":
- Routes requests to per-agent Groq LLM handlers (llama-3.3-70b-versatile)
- Heimdall agent outputs validated JSON with Mermaid diagrams
- Idunn agent outputs structured recipe JSON with step-by-step workflow
- Odin agent responds to PDF-based study questions
- SSE streaming from FastAPI → Rust → Frontend

### Layer 4: React Frontend (Vite)
The cyberpunk-styled marketplace UI:
- Agent marketplace with per-category input modes
- Real-time execution terminal with SSE streaming
- Architecture session with Mermaid diagram rendering (Heimdall)
- Guided cooking workflow with step navigation, timer, ingredient checklist (Idunn)
- PDF upload zone with chat interface (Odin)
- Wallet connection and transaction signing
- Job history dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐ │
│  │ Marketplace│  │Agent Detail│  │ Dashboard │  │Terminal │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────┬────┘ │
│        └───────────────┼──────────────┘              │      │
│                        ▼                             │      │
│               ┌─────────────────┐                    │      │
│               │ useSolanaProgram│ ◀──────────────────┘      │
│               │   + JobContext  │                            │
│               └────────┬────────┘                            │
└────────────────────────┼────────────────────────────────────┘
                         │
            ┌────────────┼────────────┐
            ▼                         ▼
┌───────────────────┐    ┌────────────────────┐
│  RUST BACKEND     │    │  PYTHON SERVICE    │
│  (Axum)           │    │  (FastAPI)         │
│  ┌─────────────┐  │    │  ┌─────────────┐  │
│  │ AI Service   │──┼──▶│  │ Agent Router │  │
│  │ (SSE Proxy) │  │    │  │ (Groq LLM)  │  │
│  └──────┬──────┘  │    │  └─────────────┘  │
│         ▼         │    └────────┬───────────┘
│  ┌─────────────┐  │            │
│  │ Solana Svc  │──┼───┐        │
│  │ (Signer)    │  │   │        │
│  └─────────────┘  │   │        │
└───────────────────┘   │        │
                        ▼        ▼
                 ┌────────────────────┐
                 │  SOLANA BLOCKCHAIN │
                 │  ┌──────────────┐  │
                 │  │ Job Escrow   │  │
                 │  │ Program      │  │
                 │  │              │  │
                 │  │ - Jobs (PDA) │  │
                 │  │ - Vaults     │  │
                 │  │ - Escrow     │  │
                 │  └──────────────┘  │
                 └────────────────────┘
```

---

## Technical Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contract | Rust, Anchor Framework | On-chain escrow logic, PDA vaults |
| Backend | Rust, Axum, Tokio | Task processing, Solana tx signing |
| AI Microservice | Python, FastAPI, Groq | LLM inference per agent |
| Frontend | React 18, TypeScript, Vite | Marketplace UI, wallet integration |
| Styling | Tailwind CSS, shadcn/ui | Cyberpunk dark theme, component library |
| Solana SDK | @solana/web3.js, @coral-xyz/anchor | Blockchain interaction, IDL types |
| Wallet | @solana/wallet-adapter-react | Phantom, Solflare, Backpack support |
| LLM | Groq (llama-3.3-70b-versatile) | Task execution intelligence |
| Streaming | SSE (Server-Sent Events) | Real-time chunked responses |
| Diagrams | Mermaid | Architecture flow visualization |
| Crypto | SHA-256 | Proof-of-work hash generation |

---

## Project Structure

```
aigent/
├── backend/                          # Rust backend (Axum)
│   ├── Cargo.toml
│   ├── .env.example
│   └── src/
│       ├── main.rs
│       ├── config.rs
│       ├── error.rs
│       ├── models.rs
│       ├── routes/
│       │   ├── mod.rs
│       │   ├── health.rs
│       │   ├── agent.rs
│       │   └── job.rs                # POST /api/job/execute, /chat
│       └── services/
│           ├── mod.rs
│           ├── ai.rs                 # SSE proxy to Python
│           └── solana.rs
│
├── python_service/                   # Python AI microservice
│   ├── main.py                       # FastAPI entrypoint + SSE streaming
│   ├── requirements.txt
│   └── agents/
│       ├── heimdall/
│       │   └── agent.py              # Architecture JSON + Mermaid
│       ├── odin/
│       │   └── agent.py              # Study comprehension
│       └── idunn/
│           └── agent.py              # Structured recipe JSON
│
├── contracts/                        # Solana smart contract (Anchor)
│   └── programs/workspace/src/
│       └── lib.rs
│
├── src/                              # React frontend
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── HeroSection.tsx
│   │   ├── AgentCard.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── TaskPromptForm.tsx        # Per-category input modes
│   │   ├── ExecutionTerminal.tsx     # Agent routing hub
│   │   ├── AgentChatUI.tsx           # Reusable chat UI (Odin)
│   │   ├── ArchitectureSession.tsx   # Heimdall blueprint + chat + Mermaid
│   │   ├── CookingSession.tsx        # Idunn guided recipe workflow
│   │   ├── JobHistoryCard.tsx
│   │   └── MermaidChart.tsx          # Mermaid diagram renderer
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── AgentDetail.tsx
│   │   ├── Dashboard.tsx
│   │   └── NotFound.tsx
│   ├── hooks/
│   │   └── useSolanaProgram.ts
│   ├── lib/
│   │   ├── types.ts
│   │   ├── agents.ts
│   │   ├── agentService.ts           # XHR + SSE streaming client
│   │   ├── architectureParser.ts     # Flexible JSON extraction with field aliases
│   │   ├── recipeParser.ts           # Recipe JSON + follow-up parser
│   │   ├── aigentEscrow.ts
│   │   ├── jobContext.tsx
│   │   └── configAddress.ts
│   ├── types/
│   │   ├── architecture.ts           # Architecture / Mermaid types
│   │   └── recipe.ts                 # Recipe / FollowUp / Step types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── public/
│   ├── logo.png                      # Brand logo
│   ├── favicon.png                   # Favicon
│   ├── main.png                      # Marketplace screenshot
│   ├── Screenshot_2026-05-10_04_00_12.png  # Architecture session
│   ├── Screenshot_2026-05-10_04_00_38.png  # Execution terminal
│   └── Screenshot_2026-05-10_04_01_38.png  # Cooking session
├── logo.png                          # Source logo
├── index.html
├── tailwind.config.js
├── vite.config.ts
├── package.json
└── README.md
```

---

## AI Agents

| Agent | ID | Specialty | Input | Output | Price |
|-------|----|-----------|-------|--------|-------|
| **Heimdall** | `heimdall` | System architecture & coding | Text prompt | Validated JSON + Mermaid diagram + follow-up chat | 0.5 SOL |
| **Odin** | `odin` | Studying & comprehension | PDF upload | Conversational study assistance | 0.3 SOL |
| **Idunn** | `idunn` | Cooking & recipes | Dish name | Structured recipe JSON with guided step-by-step workflow | 0.2 SOL |

Each agent has a tailored system prompt shaping output format, expertise level, and response structure. Streaming responses are accumulated on the frontend and parsed on completion.

### Heimdall (Coding/Architecture)
- Initial request: outputs a structured JSON blueprint with `project_name`, `description`, `tech_stack`, `architecture`, and `diagram` (Mermaid)
- Follow-up chat: conversational plain-text, no JSON wrapping
- Python agent uses post-hoc `extract_json()` to ensure valid output (bypasses Groq JSON mode issues with Mermaid newlines)

<div align="center">
  <img src="public/Screenshot_2026-05-10_04_00_12.png" alt="Heimdall Architecture Session" width="800" />
  <br />
  <em>Heimdall architecture blueprint with Mermaid diagram and follow-up chat</em>
</div>

### Odin (Studying)
- PDF upload → text extraction → study comprehension
- Conversational chat interface via `AgentChatUI`

### Idunn (Cooking)
- Recipe JSON schema: title, description, servings, prep/cook time, ingredients, step-by-step instructions, tips
- `CookingSession` component renders: recipe header, ingredient checklist, step navigation with timer, progress tracker, follow-up cards with gradient-glow input

---

## Smart Contract

### Program ID
```
C7kCbU8cVWmt7hqBjm3fGmHah2JuexFRijb63Vf97eq9
```
Deployed on **Solana Devnet**.

### Account Structure

#### JobAccount (PDA)
| Field | Type | Description |
|-------|------|-------------|
| `employer` | `Pubkey` | Job creator's wallet |
| `agent` | `Pubkey` | Designated AI agent's pubkey |
| `amount` | `u64` | SOL locked in escrow (lamports) |
| `status` | `JobStatus` | Created / Completed / Cancelled |
| `task_hash` | `String(64)` | SHA-256 hash of the task prompt |
| `result_hash` | `String(64)` | SHA-256 hash of the AI result |
| `created_at` | `i64` | Unix timestamp of creation |
| `timeout` | `i64` | Unix timestamp for cancel deadline |
| `bump` | `u8` | PDA bump seed |

**PDA Seeds:** `["job", employer_pubkey, job_id]`
**Vault Seeds:** `["vault", job_pda]`

### Instructions

#### `initialize_job(amount, task_hash, agent, timeout_seconds, job_id)`
- Employer creates a job and transfers SOL to a PDA vault
- Validates: amount > 0, task_hash <= 64 chars
- Status set to `Created`

#### `complete_job(result_hash, job_id)`
- **Restricted** to the designated agent's keypair
- Validates: job is `Created`, result_hash <= 64 chars
- Transfers SOL from vault to agent wallet via PDA signing
- Status set to `Completed`

#### `cancel_job(job_id)`
- **Restricted** to the employer
- Validates: job is `Created`, current time > timeout
- Transfers SOL from vault back to employer via PDA signing
- Status set to `Cancelled`

---

## Rust Backend

### Overview

Built with **Axum** and **Tokio**. Serves as the "Agent Executioner":

1. Holds the AI agent's private keypair securely
2. Proxies streaming LLM requests to the Python microservice
3. Generates SHA-256 proof-of-work hashes
4. Signs and submits `complete_job` transactions to Solana

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check with agent pubkey |
| `GET` | `/api/agent/info` | Agent metadata and supported types |
| `POST` | `/api/job/execute` | Execute AI task (SSE stream to frontend) |
| `POST` | `/api/job/chat` | Follow-up chat with agent (SSE stream) |
| `POST` | `/api/job/complete` | Sign `complete_job` on Solana |

The backend runs on `http://localhost:3001` and proxies AI requests to the Python service at `http://localhost:8000`.

---

## Python Microservice

### Overview

Built with **FastAPI**. Each agent type has a dedicated handler in `python_service/agents/`:

- **Heimdall**: Streams validated JSON architecture blueprints with Mermaid diagrams; separate chat handler for conversational follow-ups
- **Odin**: PDF text extraction + study comprehension via Groq
- **Idunn**: Structured recipe JSON generation with Groq `response_format: json_object`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/chat/completions` | SSE stream from Groq LLM |

The service uses `llama-3.3-70b-versatile` via Groq for all agents.

---

## Frontend

### Design System

The frontend uses a cyberpunk aesthetic inspired by Tron and Blade Runner:

- **Void Black** (`hsl(230 15% 5%)`) — Primary background
- **Neon Cyan** (`hsl(185 100% 50%)`) — Primary accent, glows, borders
- **Neon Green** (`hsl(165 100% 45%)`) — Success states, status indicators
- **JetBrains Mono** — Monospace font for data and terminal views
- **Inter** — Sans-serif font for body text

### Key Components

| Component | Purpose |
|-----------|---------|
| `TaskPromptForm` | Per-category input: cooking (dish name text), studying (PDF dropzone), coding (system description) |
| `ExecutionTerminal` | Routes to correct UI: Odin → `AgentChatUI`, Idunn → `CookingSession`, Heimdall → `ArchitectureSession` |
| `ArchitectureSession` | Heimdall blueprint + card-styled chat + Mermaid rendering via `mermaid.render()` with unique IDs and error fallback |
| `CookingSession` | Guided recipe: header, ingredient checklist, step nav, timer, progress tracker, follow-up cards with gradient-glow input |
| `AgentChatUI` | Reusable chat interface for Odin with message bubbles |
| `MermaidChart` | Renders Mermaid diagrams with `securityLevel: 'loose'` and dark theme |

### Streaming Architecture

1. Frontend calls `chatWithAgentFull()` in `agentService.ts`
2. XHR request sent to Rust backend (`/api/job/execute` or `/api/job/chat`)
3. Rust proxies to Python FastAPI with `is_chat` parameter
4. Python streams LLM tokens via SSE (`{"data": chunk}` )
5. Rust re-wraps as `Event::default().data(...)` 
6. Frontend accumulates chunks, parses on completion (JSON for Heimdall/Idunn, text for Odin)

### State Management

Job state is managed via React Context (`JobContext`):
- `jobs` — Array of all jobs created in the session
- `activeJob` — Currently executing/viewing job
- `executionSteps` — Real-time progress steps
- `isExecuting` — Loading state flag

<div align="center">
  <img src="public/Screenshot_2026-05-10_04_00_38.png" alt="Execution Terminal" width="800" />
  <br />
  <em>Real-time execution terminal with SSE streaming progress</em>
</div>

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **Rust** 1.75+ and **Cargo**
- **Python** 3.10+ and **pip**
- **Solana CLI** (optional, for keypair generation)
- A Solana wallet (Phantom, Solflare, or Backpack)

### 1. Clone and Install Frontend

```bash
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 2. Setup Python Microservice

```bash
cd python_service
pip install -r requirements.txt
python main.py
```

Python service runs at `http://localhost:8000`.

### 3. Setup Rust Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your keys
cargo run
```

Backend runs at `http://localhost:3001`.

### 4. Fund Your Wallet (Devnet)

```bash
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

### 5. Connect and Test

1. Open `http://localhost:5173`
2. Connect your Phantom wallet (switch to Devnet)
3. Browse agents and click one
4. Enter input and click "Hire Agent"
5. Watch the streaming execution terminal process the task

<div align="center">
  <img src="public/Screenshot_2026-05-10_04_01_38.png" alt="Cooking Session" width="800" />
  <br />
  <em>Idunn guided cooking workflow with step-by-step recipe navigation</em>
</div>

---

## API Reference

### POST /api/job/execute

Execute an AI task off-chain with SSE streaming.

**Request:**
```json
{
  "job_id": "heimdall_abc123",
  "agent_id": "heimdall",
  "prompt": "Design a microservices architecture for a video platform",
  "employer": "9PJ8I...3555",
  "amount": 0.5
}
```

**Response:** SSE stream of text/event-stream chunks.

### POST /api/job/chat

Follow-up chat with an agent (Heimdall only).

**Request:**
```json
{
  "job_id": "heimdall_abc123",
  "agent_id": "heimdall",
  "prompt": "Explain the database choice",
  "employer": "9PJ8I...3555",
  "amount": 0.0
}
```

### POST /api/job/complete

Sign and submit `complete_job` on Solana.

**Request:**
```json
{
  "job_id": "heimdall_abc123",
  "employer": "9PJ8I...3555",
  "result_hash": "0x3a7f2b1c..."
}
```

**Response:**
```json
{
  "success": true,
  "signature": "5KtP...7xYZ",
  "job_id": "heimdall_abc123",
  "result_hash": "0x3a7f2b1c..."
}
```

---

## Security Model

### Escrow Guarantees

1. **Employer Protection** — SOL is locked in a PDA vault controlled by the program (not the agent). If the agent doesn't respond, the employer can cancel after the timeout period.

2. **Agent Protection** — Once the agent submits a valid result hash, the SOL transfer is atomic and unstoppable.

3. **Proof Immutability** — Both `task_hash` and `result_hash` are recorded on-chain in the `JobAccount`.

4. **Access Control** — `complete_job` requires the agent's signature. `cancel_job` requires the employer's signature AND timeout expiration.

### Backend Security

- Agent keypair is stored as an environment variable, never exposed to the frontend
- All Solana transactions are signed server-side
- AI API keys are kept on the backend only
- CORS is configured to restrict origins in production

---

## Deployment

### Frontend (Vercel/Netlify)

```bash
npm run build
# Output in dist/ — deploy to any static host
```

### Backend (Docker)

```bash
cd backend
docker build -t aigent-backend .
docker run -p 3001:3001 --env-file .env aigent-backend
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">
  <img src="logo.png" alt="Asgard Agents Logo" width="80" />
  <br /><br />
  <strong>Built on Solana. Powered by DeAI.</strong>
  <br />
  <em>Asgard Agents — Where AI meets trustless execution.</em>
</div>
