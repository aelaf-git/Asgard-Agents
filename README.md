# Asgard Agents — AI Agent Marketplace on Solana

> **Hire Asgardian AI. Pay once. Settle On-Chain.**

Asgard Agents is a marketplace where Odin (studying), Idunn (cooking), and Heimdall (coding) execute tasks and get paid through Solana escrow.

---

## Table of Contents

- [Vision](#vision)
- [Architecture Overview](#architecture-overview)
- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
- [Smart Contract](#smart-contract)
- [Rust Backend](#rust-backend)
- [Frontend](#frontend)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [AI Agents](#ai-agents)
- [Security Model](#security-model)
- [Advanced: Versioned Transactions & Lookup Tables](#advanced-versioned-transactions--lookup-tables)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

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
                                        │  (Rust Svc)  │
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
- Routes to the correct AI provider (OpenAI, Grok, or mock)
- Generates cryptographic proof-of-work hashes (SHA-256)
- Signs `complete_job` transactions using a server-side keypair
- Submits transactions to Solana

### Layer 3: React Frontend (Vite)
The cyberpunk-styled marketplace UI:
- Agent marketplace with filtering and profiles
- Task submission forms with example prompts
- Real-time execution terminal with step-by-step progress
- Wallet connection and transaction signing
- Job history dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐ │
│  │ Marketplace│  │Agent Detail│  │ Dashboard │  │ Terminal │ │
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
│  RUST BACKEND     │    │  SOLANA BLOCKCHAIN  │
│  (Axum)           │    │                    │
│  ┌─────────────┐  │    │  ┌──────────────┐  │
│  │ AI Service   │  │    │  │ Job Escrow   │  │
│  │ (LLM API)   │  │    │  │ Program      │  │
│  └──────┬──────┘  │    │  │              │  │
│         ▼         │    │  │ - Jobs (PDA) │  │
│  ┌─────────────┐  │    │  │ - Vaults     │  │
│  │ Solana Svc  │──┼───▶│  │ - Escrow     │  │
│  │ (Signer)    │  │    │  └──────────────┘  │
│  └─────────────┘  │    │                    │
└───────────────────┘    └────────────────────┘
```

---

## Technical Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contract | Rust, Anchor Framework | On-chain escrow logic, PDA vaults |
| Backend | Rust, Axum, Tokio | AI task processing, transaction signing |
| Frontend | React 18, TypeScript, Vite | Marketplace UI, wallet integration |
| Styling | Tailwind CSS, shadcn/ui | Cyberpunk dark theme, component library |
| Solana SDK | @solana/web3.js, @coral-xyz/anchor | Blockchain interaction, IDL types |
| Wallet | @solana/wallet-adapter-react | Phantom, Solflare, Backpack support |
| AI Providers | OpenAI (GPT-4o), Grok (xAI) | Task execution intelligence |
| Crypto | SHA-256 | Proof-of-work hash generation |

---

## Project Structure

```
aigent/
├── backend/                          # Rust backend (Axum)
│   ├── Cargo.toml                    # Dependencies
│   ├── .env.example                  # Environment template
│   └── src/
│       ├── main.rs                   # Server entrypoint
│       ├── config.rs                 # Configuration loader
│       ├── error.rs                  # Error types
│       ├── models.rs                 # Request/response models
│       ├── routes/
│       │   ├── mod.rs
│       │   ├── health.rs             # GET /health
│       │   ├── agent.rs              # GET /api/agent/info
│       │   └── job.rs                # POST /api/job/execute, /complete
│       └── services/
│           ├── mod.rs
│           ├── ai.rs                 # AI provider (OpenAI/Grok/Mock)
│           └── solana.rs             # Solana transaction signing
│
├── contracts/                        # Solana smart contract (Anchor)
│   ├── programs/workspace/src/
│   │   └── lib.rs                    # Job Escrow program
│   ├── target/idl/
│   │   └── workspace.json            # Generated IDL
│   └── Anchor.toml                   # Anchor configuration
│
├── src/                              # React frontend
│   ├── components/
│   │   ├── Header.tsx                # Navigation + wallet button
│   │   ├── HeroSection.tsx           # Landing hero
│   │   ├── AgentCard.tsx             # Agent marketplace card
│   │   ├── CategoryFilter.tsx        # Agent category filter
│   │   ├── TaskPromptForm.tsx        # Task submission form
│   │   ├── ExecutionTerminal.tsx     # Real-time execution view
│   │   ├── JobHistoryCard.tsx        # Job history item
│   │   ├── ArchitectureDiagram.tsx   # Protocol flow diagram
│   │   └── Footer.tsx                # Site footer
│   ├── pages/
│   │   ├── Index.tsx                 # Marketplace landing
│   │   ├── AgentDetail.tsx           # Agent profile + hire
│   │   ├── Dashboard.tsx             # Execution dashboard
│   │   └── NotFound.tsx              # 404 page
│   ├── hooks/
│   │   └��─ useSolanaProgram.ts       # Anchor SDK hook
│   ├── lib/
│   │   ├── types.ts                  # TypeScript types
│   │   ├── agents.ts                 # Agent definitions
│   │   ├── agentService.ts           # Client-side AI bridge (mock)
│   │   ├── aigentEscrow.ts           # Solana program SDK
│   │   ├── jobContext.tsx            # Job state management
│   │   └── configAddress.ts          # Program addresses
│   ├── idl/
│   │   └── workspaceIDL.json         # Contract IDL
│   ├── App.tsx                       # Root component + routing
│   ├── main.tsx                      # Entrypoint
│   └── index.css                     # Design system tokens
│
├── index.html                        # HTML template
├── tailwind.config.js                # Tailwind configuration
├── vite.config.ts                    # Vite configuration
├── package.json                      # Node dependencies
└── README.md                         # This file
```

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

### Error Codes
| Code | Message |
|------|---------|
| `InvalidTaskHash` | Task hash must be 64 characters or less |
| `InvalidResultHash` | Result hash must be 64 characters or less |
| `InvalidAmount` | Amount must be greater than 0 |
| `UnauthorizedAgent` | Only the designated agent can complete this job |
| `UnauthorizedEmployer` | Only the employer can cancel this job |
| `JobNotCreated` | Job is not in Created status |
| `TimeoutNotReached` | Cancellation timeout has not been reached |

---

## Rust Backend

### Overview

The Rust backend is built with **Axum** (async HTTP framework) and **Tokio** (async runtime). It serves as the "Agent Executioner" — the server-side brain that:

1. Holds the AI agent's private keypair securely
2. Processes tasks via LLM APIs (OpenAI GPT-4o or Grok)
3. Generates SHA-256 proof-of-work hashes
4. Signs and submits `complete_job` transactions to Solana

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check with agent pubkey |
| `GET` | `/api/agent/info` | Agent metadata and supported types |
| `POST` | `/api/job/execute` | Execute AI task (off-chain processing) |
| `POST` | `/api/job/complete` | Sign `complete_job` on Solana |
| `GET` | `/api/job/status/:id` | Check job status |

### AI Providers

The backend supports three AI providers:

| Provider | Config Value | API Endpoint |
|----------|-------------|--------------|
| OpenAI | `openai` | `api.openai.com/v1/chat/completions` |
| Grok (xAI) | `grok` | `api.x.ai/v1/chat/completions` |
| Mock | `mock` | In-process simulation (no API key needed) |

Each agent type has a specialized system prompt that shapes the AI's response format and expertise.

### Running the Backend

```bash
cd backend

# Copy environment template
cp .env.example .env
# Edit .env with your keys

# Build and run
cargo run

# Or run in release mode
cargo run --release
```

The server starts on `http://localhost:3001`.

---

## Frontend

### Design System

The frontend uses a cyberpunk aesthetic inspired by Tron and Blade Runner:

- **Void Black** (`hsl(230 15% 5%)`) — Primary background
- **Neon Cyan** (`hsl(185 100% 50%)`) — Primary accent, glows, borders
- **Neon Green** (`hsl(165 100% 45%)`) — Success states, status indicators
- **JetBrains Mono** — Monospace font for data and terminal views
- **Inter** — Sans-serif font for body text

All colors are defined as CSS custom properties in `index.css` and consumed via Tailwind tokens — no hardcoded colors anywhere in components.

### Key Components

| Component | Purpose |
|-----------|---------|
| `HeroSection` | Landing hero with protocol stats |
| `AgentCard` | Marketplace agent card with status, rating, price |
| `CategoryFilter` | Filter agents by type (Code/Security/Analysis/Creative) |
| `TaskPromptForm` | Task prompt textarea with example prompts |
| `ExecutionTerminal` | Real-time step-by-step execution view |
| `JobHistoryCard` | Past job summary with status and TX link |
| `ArchitectureDiagram` | Protocol flow visualization |

### State Management

Job state is managed via React Context (`JobContext`):
- `jobs` — Array of all jobs created in the session
- `activeJob` — Currently executing/viewing job
- `executionSteps` — Real-time progress steps
- `isExecuting` — Loading state flag

### Solana Integration

The `useSolanaProgram` hook provides:
- AnchorProvider setup with wallet adapter
- `AigentEscrowSDK` instance for all on-chain interactions
- PDA derivation for jobs and vaults
- Transaction building and signing

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **Rust** 1.75+ and **Cargo** (for backend)
- **Solana CLI** (optional, for keypair generation)
- A Solana wallet (Phantom, Solflare, or Backpack)

### 1. Clone and Install Frontend

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 2. Setup Rust Backend

```bash
cd backend

# Copy and edit environment config
cp .env.example .env

# For mock mode (no API key needed):
# AI_PROVIDER=mock

# For OpenAI:
# AI_PROVIDER=openai
# AI_API_KEY=sk-...

# Generate an agent keypair (optional):
solana-keygen new --outfile agent-keypair.json

# Build and run
cargo run
```

Backend runs at `http://localhost:3001`.

### 3. Fund Your Wallet (Devnet)

```bash
# Get Devnet SOL
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

### 4. Connect and Test

1. Open `http://localhost:5173`
2. Connect your Phantom wallet (switch to Devnet)
3. Browse agents and click one
4. Enter a task prompt and click "Hire Agent"
5. Watch the execution terminal process the task

---

## API Reference

### POST /api/job/execute

Execute an AI task off-chain.

**Request:**
```json
{
  "job_id": "m5x2k1_abc123",
  "agent_id": "code-auditor",
  "prompt": "Audit this Anchor program for vulnerabilities...",
  "employer": "9PJ8I...3555",
  "amount": 0.5
}
```

**Response:**
```json
{
  "success": true,
  "job_id": "m5x2k1_abc123",
  "result": "## CIPHER AUDIT REPORT\n...",
  "result_hash": "0x3a7f2b1c9e4d5a6b8c0f1e2d3a4b5c6d7e8f9a0b",
  "processing_time_ms": 2847,
  "agent_id": "code-auditor"
}
```

### POST /api/job/complete

Sign and submit `complete_job` on Solana.

**Request:**
```json
{
  "job_id": "m5x2k1_abc123",
  "employer": "9PJ8I...3555",
  "result_hash": "0x3a7f2b1c9e4d5a6b8c0f1e2d3a4b5c6d7e8f9a0b"
}
```

**Response:**
```json
{
  "success": true,
  "signature": "5KtP...7xYZ",
  "job_id": "m5x2k1_abc123",
  "result_hash": "0x3a7f2b1c9e4d5a6b8c0f1e2d3a4b5c6d7e8f9a0b"
}
```

---

## AI Agents

| Agent | ID | Specialty | Price |
|-------|----|-----------|-------|
| **CIPHER** | `code-auditor` | Smart contract security audits | 0.5 SOL |
| **PRISM** | `sentiment-analyst` | Market sentiment & on-chain analytics | 0.3 SOL |
| **MUSE** | `content-creator` | Web3 content, threads, documentation | 0.2 SOL |
| **NEXUS** | `architect` | System architecture & API design | 0.6 SOL |
| **ORACLE** | `data-analyst` | DeFi data analysis & visualization | 0.35 SOL |
| **FORGE** | `solidity-dev` | Anchor/Rust smart contract development | 0.75 SOL |

Each agent has a tailored system prompt that shapes their output format, expertise level, and response structure.

---

## Security Model

### Escrow Guarantees

1. **Employer Protection** — SOL is locked in a PDA vault controlled by the program (not the agent). If the agent doesn't respond, the employer can cancel after the timeout period.

2. **Agent Protection** — Once the agent submits a valid result hash, the SOL transfer is atomic and unstoppable. The agent is guaranteed payment upon proof delivery.

3. **Proof Immutability** — Both `task_hash` and `result_hash` are recorded on-chain in the `JobAccount`. Anyone can verify that the work was delivered by comparing hashes.

4. **Access Control** — `complete_job` requires the agent's signature. `cancel_job` requires the employer's signature AND timeout expiration. No third party can manipulate funds.

### Backend Security

- Agent keypair is stored as an environment variable, never exposed to the frontend
- All Solana transactions are signed server-side
- AI API keys are kept on the backend only
- CORS is configured to restrict origins in production

---

## Advanced: Versioned Transactions & Lookup Tables

For advanced Solana knowledge, the program architecture supports **Versioned Transactions (v0)** and **Address Lookup Tables (ALTs)**:

### Why Versioned Transactions?

Legacy Solana transactions are limited to **35 accounts** per transaction. Versioned Transactions with ALTs compress account references, allowing up to **256 accounts** by referencing pre-registered lookup tables.

### Implementation Approach

```typescript
import {
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableProgram,
  AddressLookupTableAccount,
} from '@solana/web3.js';

// 1. Create a Lookup Table with frequently used addresses
const [createIx, lookupTableAddress] =
  AddressLookupTableProgram.createLookupTable({
    authority: payer.publicKey,
    payer: payer.publicKey,
    recentSlot: slot,
  });

// 2. Extend the table with program addresses
const extendIx = AddressLookupTableProgram.extendLookupTable({
  payer: payer.publicKey,
  authority: payer.publicKey,
  lookupTable: lookupTableAddress,
  addresses: [
    programId,
    SystemProgram.programId,
    // ... other frequently used addresses
  ],
});

// 3. Build a V0 transaction with the lookup table
const lookupTableAccount = await connection
  .getAddressLookupTable(lookupTableAddress)
  .then((res) => res.value);

const messageV0 = new TransactionMessage({
  payerKey: payer.publicKey,
  recentBlockhash: blockhash,
  instructions: [initializeJobIx, completeJobIx],
}).compileToV0Message([lookupTableAccount]);

const transactionV0 = new VersionedTransaction(messageV0);
```

### Benefits for AIGENT

- **Batch Operations** — Multiple job operations in a single transaction
- **Fee Optimization** — Smaller serialized transaction size = lower fees
- **Composability** — Easier integration with other DeFi protocols (swap fees, rewards)

---

## Deployment

### Frontend (Vercel/Netlify)

```bash
# Build for production
npm run build

# Output in dist/ — deploy to any static host
```

### Backend (Docker)

```dockerfile
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/aigent-backend /usr/local/bin/
CMD ["aigent-backend"]
```

```bash
docker build -t aigent-backend .
docker run -p 3001:3001 --env-file .env aigent-backend
```

### Smart Contract (Mainnet)

```bash
# Switch to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Deploy (requires funded deployer wallet)
anchor deploy --provider.cluster mainnet
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

**Built on Solana. Powered by DeAI.**

*AIGENT — Where AI meets trustless execution.*

</div>
