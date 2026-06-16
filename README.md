# Bankero 💚

> **Decentralized Credit Scoring & Micro-Lending on Stellar**
> Giving unbanked Filipinos a verifiable, on-chain financial identity — based on actual behavior, not a bank account balance.

![CI](https://github.com/caramel-123/bankero/actions/workflows/ci.yml/badge.svg)

🌐 **Live App:** [https://bankero.vercel.app](https://bankero.vercel.app)
🎥 **Demo Video:** [Watch on YouTube](https://youtube.com/your-demo-link) ← *replace with your recording*

---

## Deployed Contract Addresses (Stellar Testnet)

| Contract | Address |
|----------|---------|
| `credit_score` | `CCXRTCZ2OKHYMRAHZHR4BSSBIWK6TXY25WFPUJLIJE4NHK6MPV4YQMQE` |
| `loan_registry` | `CCDH6T2RI3BBKXVN6RUILBFJBFUQRQKXUKI6WCGRB3GIFU2CQX3GDPTI` |
| `vouching` | `CAQG6H57IFKD642FRELBZNVKAWRLZYQMCIUHXQBFBIIXRMWHTJHFBQ4F` |

> Verify on Stellar Explorer:
> - [credit_score on stellar.expert](https://stellar.expert/explorer/testnet/contract/CCXRTCZ2OKHYMRAHZHR4BSSBIWK6TXY25WFPUJLIJE4NHK6MPV4YQMQE)
> - [loan_registry on stellar.expert](https://stellar.expert/explorer/testnet/contract/CCDH6T2RI3BBKXVN6RUILBFJBFUQRQKXUKI6WCGRB3GIFU2CQX3GDPTI)
> - [vouching on stellar.expert](https://stellar.expert/explorer/testnet/contract/CAQG6H57IFKD642FRELBZNVKAWRLZYQMCIUHXQBFBIIXRMWHTJHFBQ4F)

---

## What is Bankero?

Bankero is a decentralized credit scoring and micro-lending platform built on **Stellar** and **Soroban smart contracts**. It solves a real problem in the Philippines: millions of Filipinos are excluded from formal financial services because they have no credit history — not because they aren't creditworthy.

Bankero builds that credit history **on-chain**, using real behavioral signals:

| Signal | Weight | Source |
|--------|--------|--------|
| 🔁 Repayment history | 40% | Loan repayment records |
| 💳 Transaction activity | 25% | Stellar wallet activity |
| 👥 Community vouches | 20% | Peers staking XLM to vouch |
| 🏦 Anchor links | 15% | GCash / Maya / remittance accounts |

The result is a **300–850 credit score** stored transparently on the blockchain — verifiable by any lender, anywhere, without needing a bank statement.

---

## Features

### For Borrowers
- 🔐 **Connect with Freighter** — wallet-based identity, no username/password needed
- 📊 **Live credit score** — real-time 300–850 score with breakdown by factor
- 💸 **Apply for micro-loans** — loan limits unlock as your score grows (₱500 → ₱50,000)
- 🔗 **Link GCash / Maya / remittance** accounts to boost anchor score
- 🤝 **Community vouching** — ask trusted peers to stake XLM for you
- 📄 **Credit Certificate** — downloadable PDF proof of creditworthiness for banks
- 🔍 **Stellar Explorer** — one-click view of wallet on the blockchain

### For Lenders
- 🏦 **Email/password dashboard** (Supabase Auth)
- 📋 **Review borrower profiles** — full credit score, repayment history, tier
- ✅ **Approve / Reject / Disburse** loans with real XLM payments via Freighter
- ⚡ **Auto-default detection** — overdue loans flagged automatically, score adjusted
- 📈 **Portfolio analytics** — repayment rate, default rate, total disbursed

### Credit Score Tiers
| Score | Tier | Max Loan | Interest |
|-------|------|----------|----------|
| 300–449 | Starting Out | ₱500 | 8% |
| 450–549 | Fair | ₱1,500 | 7% |
| 550–649 | Developing | ₱3,000 | 6% |
| 650–749 | Good | ₱7,500 | 5% |
| 750–799 | Trusted | ₱15,000 | 4.5% |
| 800–849 | Excellent | ₱25,000 | 4% |
| 850 | Elite | ₱50,000 | 3.5% |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Stellar Testnet + Soroban Smart Contracts |
| Wallet | Freighter ([@stellar/freighter-api](https://www.npmjs.com/package/@stellar/freighter-api)) |
| Smart Contracts | Rust / Soroban (3 contracts) |
| Frontend | React + TypeScript + Vite |
| Database | Supabase (Postgres + Auth + RLS) |
| Payments | Stellar Horizon API (real XLM disbursement) |
| Deployment | Vercel |

---

## Smart Contracts (Soroban)

Three contracts deployed on **Stellar Testnet**:

| Contract | ID | Purpose |
|----------|-----|---------|
| `credit_score` | `CCXRTCZ2OKHYMRAHZHR4BSSBIWK6TXY25WFPUJLIJE4NHK6MPV4YQMQE` | Aggregate scores, store borrower records |
| `loan_registry` | `CCDH6T2RI3BBKXVN6RUILBFJBFUQRQKXUKI6WCGRB3GIFU2CQX3GDPTI` | Loan lifecycle management |
| `vouching` | `CAQG6H57IFKD642FRELBZNVKAWRLZYQMCIUHXQBFBIIXRMWHTJHFBQ4F` | Staked community vouches |

---

## CI/CD Pipeline

Every push to `main` automatically runs tests and builds via **GitHub Actions**.

### Pipeline steps:
1. Install dependencies (`npm ci`)
2. Run all unit tests (`npm test`)
3. Build production bundle (`npm run build`)
4. Upload build artifact

### Screenshot: CI passing
![CI pipeline passing on GitHub Actions](docs/screenshots/ci-passing.png)

---

## Test Suite

**38 tests — all passing** across 2 test files.

```
 RUN  v4.1.9

 Test Files  2 passed (2)
      Tests  38 passed (38)
   Duration  421ms
```

### What's tested:
| Test File | Coverage |
|-----------|----------|
| `stellar.test.ts` | `scoreTier()`, `scorePercent()`, `nextScoreTier()`, `SCORE_TIERS` array, `formatWallet()`, `formatPeso()`, `pesoToXlm()` |
| `loanStore.test.ts` | `computeLocalScore()`, Laplace smoothing formula, `daysUntil()`, `formatDate()` |

### Screenshot: Test output
![Vitest test output showing 38 passing tests](docs/screenshots/ci-passing.png)

### Run tests locally:
```bash
cd frontend
npm test
```

---

## Screenshots

### Landing Page
![Bankero landing page](docs/screenshots/landing-page.png)

### Borrower Dashboard
![Borrower dashboard with credit score](docs/screenshots/borrower-page.png)

### Loan Application
![Loan application form with dynamic limits based on credit score tier](docs/screenshots/borrower-loan-apply.png)

### Loan Tracking
![Borrower loan tracking page](docs/screenshots/loan-track.png)

### Lender Dashboard
![Lender dashboard showing pending applications with borrower credit profiles](docs/screenshots/lender-page.png)

### Successful XLM Disbursement
![Transaction result shown to lender with Stellar Explorer link](docs/screenshots/lender-successful-sent.png)

### Community Vouching
![Community vouching page](docs/screenshots/voucher.png)

### Credit Certificate (Downloadable PDF)
![Printable credit standing certificate with score, history, and Stellar verification](docs/screenshots/certificate.png)

---

## Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Freighter Wallet](https://freighter.app/) browser extension (for borrower/lender wallet)
- A funded Stellar **testnet** account (use [Stellar Friendbot](https://friendbot.stellar.org))

---

### 1. Clone the Repository

```bash
git clone https://github.com/caramel-123/bankero.git
cd bankero
```

---

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

### 3. Configure Environment Variables

Create `frontend/.env` from the example:

```bash
cp frontend/.env.example frontend/.env
```

Fill in your values:

```env
# Stellar
VITE_STELLAR_NETWORK=testnet
VITE_SOROBAN_RPC=https://soroban-testnet.stellar.org

# Deployed contract IDs (already on testnet — use these)
VITE_CREDIT_SCORE_CONTRACT_ID=CCXRTCZ2OKHYMRAHZHR4BSSBIWK6TXY25WFPUJLIJE4NHK6MPV4YQMQE
VITE_LOAN_REGISTRY_CONTRACT_ID=CCDH6T2RI3BBKXVN6RUILBFJBFUQRQKXUKI6WCGRB3GIFU2CQX3GDPTI
VITE_VOUCHING_CONTRACT_ID=CAQG6H57IFKD642FRELBZNVKAWRLZYQMCIUHXQBFBIIXRMWHTJHFBQ4F

# Supabase — create a free project at supabase.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> **Note:** The Supabase URL and anon key above are for the live deployment. For local dev, create your own free Supabase project at [supabase.com](https://supabase.com) and run the migration below.

---

### 4. Set Up Supabase Database

In your Supabase project, go to **SQL Editor** and run:

```sql
-- Users (borrower profiles)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT,
  kyc_verified BOOLEAN DEFAULT FALSE,
  anchor_linked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lenders (email/password auth)
CREATE TABLE public.lenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID,
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  contact_email TEXT,
  max_loan_xlm INTEGER DEFAULT 10000,
  interest_rate NUMERIC DEFAULT 5,
  min_credit_score INTEGER DEFAULT 300,
  bio TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loans
CREATE TABLE public.loans (
  id TEXT PRIMARY KEY,
  borrower_wallet TEXT NOT NULL,
  lender_wallet TEXT,
  amount INTEGER NOT NULL,
  interest INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  purpose TEXT,
  term INTEGER NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending','Approved','Disbursed','Repaid','Defaulted','Rejected')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  repaid_at TIMESTAMPTZ,
  defaulted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit score cache
CREATE TABLE public.score_cache (
  wallet_address TEXT PRIMARY KEY,
  repayment_score INTEGER DEFAULT 0,
  total_loans INTEGER DEFAULT 0,
  loans_repaid INTEGER DEFAULT 0,
  loans_defaulted INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "public read users"       ON public.users      FOR SELECT USING (true);
CREATE POLICY "public upsert users"     ON public.users      FOR INSERT WITH CHECK (true);
CREATE POLICY "anon read loans"         ON public.loans      FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert loans"       ON public.loans      FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update loans"       ON public.loans      FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth read loans"         ON public.loans      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth update loans"       ON public.loans      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public read lenders"     ON public.lenders    FOR SELECT USING (true);
CREATE POLICY "auth insert lenders"     ON public.lenders    FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "auth update lenders"     ON public.lenders    FOR UPDATE TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "public read score_cache" ON public.score_cache FOR SELECT USING (true);
CREATE POLICY "public upsert score_cache" ON public.score_cache FOR ALL USING (true) WITH CHECK (true);
```

---

### 5. Run Locally

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

### 6. Fund Your Testnet Wallet

1. Install [Freighter](https://freighter.app/) and switch to **Testnet**
2. Copy your wallet address
3. Visit [https://friendbot.stellar.org/?addr=YOUR_ADDRESS](https://friendbot.stellar.org/?addr=YOUR_ADDRESS) to get free testnet XLM

---

## How to Use

### As a Borrower
1. Go to [bankero.vercel.app](https://bankero.vercel.app) → click **Connect Freighter Wallet**
2. Your starting credit score is **300**
3. Explore your score breakdown in **My Score**
4. Link a GCash / Maya account to boost your anchor score
5. Ask a community member to vouch for you
6. Go to **Apply Loan** — loan limits unlock as your score grows
7. Track repayments in **My Loans**
8. Download your **Credit Certificate** once you have repayment history

### As a Lender
1. Go to [bankero.vercel.app/lender](https://bankero.vercel.app/lender)
2. Create an account with email + password
3. Connect your **Freighter wallet** (needed for disbursing XLM)
4. Review pending applications — view each borrower's full credit profile
5. Approve → Disburse (Freighter popup will confirm the XLM payment)
6. Mark loans as Defaulted if overdue → borrower's score is penalized

---

## Project Structure

```
bankero/
├── contracts/               # Soroban smart contracts (Rust)
│   ├── credit_score/        # Credit scoring logic
│   ├── loan_registry/       # Loan lifecycle management
│   └── vouching/            # Community stake & vouch
├── frontend/                # React + TypeScript app
│   ├── src/
│   │   ├── pages/           # All screens
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ScoreDetails.tsx
│   │   │   ├── LoanApply.tsx
│   │   │   ├── LoanTracking.tsx
│   │   │   ├── Vouch.tsx
│   │   │   ├── LenderDashboard.tsx
│   │   │   └── CreditCertificate.tsx
│   │   ├── lib/
│   │   │   ├── stellar.ts   # Stellar SDK + Freighter helpers + XLM payment
│   │   │   ├── supabase.ts  # Supabase client + auth + data layer
│   │   │   ├── loanStore.ts # Loan state + score updates
│   │   │   └── anchorStore.ts # GCash/Maya integration
│   │   └── hooks/
│   │       ├── useWallet.ts # Freighter wallet hook
│   │       └── useScore.ts  # Live credit score hook
│   └── .env.example
└── supabase/
    └── migrations/          # SQL schema migrations
```

---

## Transaction Hash (Contract Interaction)

Below is a real testnet transaction from a loan disbursement on Bankero — a lender sending XLM to a borrower's wallet via the platform:

| Field | Value |
|-------|-------|
| **Transaction Hash** | `4ed1ef6bb9ed2c3cf4738417a190fce61cce5cca5b1ed77cbacd35df48907369` |
| **Type** | XLM Payment — Loan Disbursement |
| **Network** | Stellar Testnet |
| **Amount** | 5 XLM (₱500 loan) |
| **Date** | 2026-06-16 10:56:18 UTC |
| **View on Explorer** | [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/4ed1ef6bb9ed2c3cf4738417a190fce61cce5cca5b1ed77cbacd35df48907369) |

---

## Testnet Transaction Demo

When a lender clicks **Disburse**, Bankero:
1. Connects to the lender's Freighter wallet
2. Builds a Stellar payment transaction (borrower receives real testnet XLM)
3. Opens Freighter for the lender to review and sign
4. Submits to Stellar Horizon (testnet)
5. Shows the transaction hash with a link to [stellar.expert](https://stellar.expert/explorer/testnet)

**Conversion rate (testnet):** ₱100 = 1 XLM

---

## Why Stellar?

- **Fast & cheap** — 5-second finality, near-zero fees (perfect for micro-transactions)
- **Soroban smart contracts** — Rust-based, auditable, on-chain logic
- **Anchor ecosystem** — built-in support for connecting real-world assets (GCash, remittances)
- **Freighter wallet** — easy browser extension for Filipino users, no seed phrase complexity
- **Transparent** — every loan, repayment, and vouch is visible on-chain

---

## Score Formula

```
final_score = 300 + (
  repayment_score × 40 +
  tx_score        × 25 +
  vouch_score     × 20 +
  anchor_score    × 15
) × 550 / 10000
```

**Repayment score** uses Laplace smoothing to prevent a single repayment from giving 100%:
```
repayment_score = (loans_repaid / (total_loans + 2)) × 100 − (defaults × 15)
```

---

## License

MIT © 2026 Mel Bernabe — Built for the Stellar White Belt Challenge
