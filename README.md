# Bankero 💚

> **Decentralized Credit Scoring & Micro-Lending on Stellar**
> Giving unbanked Filipinos a verifiable, on-chain financial identity — based on actual behavior, not a bank account balance.

![CI](https://github.com/caramel-123/bankero/actions/workflows/ci.yml/badge.svg)

🌐 **Live App:** [https://bankero.vercel.app](https://bankero.vercel.app)
🎥 **Demo Video:** [Watch on YouTube](https://youtu.be/xhMVzAy9vIE?feature=shared)
📊 **Pitch Deck:** [View on Canva](https://canva.link/bgjjy7fbpq9yswg)

---

## Deployed Contract Addresses (Stellar Testnet)

<img width="952" height="613" alt="Bankero contracts on Stellar Testnet" src="https://github.com/user-attachments/assets/3e851654-99bb-4971-9802-cd7b319d5ca5" />

| Contract | Address |
|----------|---------|
| `credit_score` | `CDB7SJ7TPDJXH7HQ4MXOTN7OTXKLIHOQKPADKDPEM24MUFCKTOKEL4C7` |
| `loan_registry` | `CDMPFBKSCVZZ4VMEME4BZMYVLHCZQF33JEOKRT5K7TDUMT6NY6Z7FM2B` |
| `vouching` | `CB2EDYM6VJCW3PSUWULY3H7JBQHCSNDOK74WARSVB5PYOVSPUWRT5MO4` |
| `savings_bank` | `CBGPC7M6E35LWREUMJK2S5HCBJVZGRTHMRG33D6LW55RQ52B5L253EPJ` |

> See [`docs/savings-bank-deployment.md`](docs/savings-bank-deployment.md) for the full step-by-step deployment log (useful as a runbook for redeploying to a new environment, e.g. mainnet).

> Verify on Stellar Explorer:
> - [credit_score on stellar.expert](https://stellar.expert/explorer/testnet/contract/CDB7SJ7TPDJXH7HQ4MXOTN7OTXKLIHOQKPADKDPEM24MUFCKTOKEL4C7)
> - [loan_registry on stellar.expert](https://stellar.expert/explorer/testnet/contract/CDMPFBKSCVZZ4VMEME4BZMYVLHCZQF33JEOKRT5K7TDUMT6NY6Z7FM2B)
> - [vouching on stellar.expert](https://stellar.expert/explorer/testnet/contract/CB2EDYM6VJCW3PSUWULY3H7JBQHCSNDOK74WARSVB5PYOVSPUWRT5MO4)
> - [savings_bank on stellar.expert](https://stellar.expert/explorer/testnet/contract/CBGPC7M6E35LWREUMJK2S5HCBJVZGRTHMRG33D6LW55RQ52B5L253EPJ)

---

## Project Description

Bankero is a decentralized credit scoring and micro-lending platform built on **Stellar** and **Soroban smart contracts**, designed to give unbanked Filipinos a verifiable, on-chain financial identity. By aggregating behavioral signals — loan repayments, wallet activity, community vouches, and anchor-linked remittances — into a transparent 300–850 credit score, Bankero enables peer-to-peer micro-loans without requiring a bank account, payslip, or credit card. The score lives on the blockchain, is owned by the borrower, and is verifiable by any lender, anywhere.

Bankero builds that credit history **on-chain**, using four behavioral signals:

| Signal | Weight | Source |
|--------|--------|--------|
| 🔁 Repayment history | 40% | Loan repayment records |
| 💳 Transaction activity | 25% | Stellar wallet activity |
| 👥 Community vouches | 20% | Peers staking XLM to vouch |
| 🏦 Anchor links | 15% | GCash / Maya / remittance accounts |

The result is a **300–850 credit score** stored transparently on the blockchain — verifiable by any lender, anywhere, without needing a bank statement.

---

## Project Vision

Most of the world's unbanked are not untrustworthy — they're just **invisible** to the formal financial system. Bankero's vision is to make financial reputation portable and self-sovereign: a score earned through real behavior, not institutional gatekeeping.

We believe that if someone has been repaying debts in their community for years, their neighbors know it — even if no bank does. Bankero turns that social trust into verifiable on-chain proof, starting in the Philippines and eventually expandable to any community where peer trust precedes institutional credit.

The long-term goal is a world where any person with a smartphone can walk up to a lender — whether that's a neighbor, an NGO, or a rural cooperative — and say: *"Here is my Bankero score. Here is my history. Verify it yourself on Stellar."*

---

## Features

### Main Features
- 💸 **Micro-loan applications** — borrow 10 to 1,000 XLM depending on your score tier, backed by Community Vouch, Savings Collateral, or neither
- 📷 **AI-verified e-payment scanning** — photograph a GCash/Maya receipt; AI reads and verifies it, boosting your Remittance score, with duplicate-receipt detection so you can't resubmit the same one
- 🏦 **Savings Bank** — deposit/withdraw real XLM on-chain, with a weekly Savings Streak bonus for consistent deposits
- 🐷 **Paluwagan (community savings circles)** — join or start a rotating-pot savings group with peers, with score bonuses for on-time participation
- 🤝 **Community vouching** — trusted peers stake XLM behind your loan application, boosting approval odds
- 📄 **Credit Certificate** — a downloadable, shareable proof-of-creditworthiness document, usable outside Bankero

### Platform
- 📱 **Installable PWA** — add Bankero to your phone's home screen like a native app (works on Android and iOS); the app shell loads instantly offline, while live data (score, balances, loans) always comes fresh from the network, never from cache, with a 5-tab bottom navigation (Home, Loan, Scan, Transaction, Profile)

### For Borrowers
- 🔐 **Login-first auth** — email/password or Google sign-in creates your identity before any wallet is connected; connect Freighter afterward as a secondary step
- 📊 **Live credit score** — real-time 300–850 score with breakdown by factor, collapsible per-factor explanations
- 💸 **Apply for micro-loans** — loan limits unlock as your score grows (10 → 1,000 XLM across 7 tiers)
- 📷 **AI-verified e-payment scanning** — snap a photo of a GCash/Maya/e-wallet receipt; an AI vision model (Groq) reads the transaction and boosts your Remittance score, with duplicate-receipt detection (image hashing + reference-number checks, enforced at the database level) so the same receipt can't be resubmitted for repeat bonuses
- 🏦 **Savings Bank** — deposit/withdraw real on-chain XLM via a dedicated Soroban contract; a weekly **Savings Streak** rewards consistent deposits with a capped score bonus
- 🐷 **Paluwagan (community savings circles)** — join or create a rotating-pot savings group with peers, contribution tracking, and score bonuses for on-time participation
- 🤝 **Community vouching** — ask trusted peers to stake XLM for you
- 🔔 **Action-needed notifications** — a red-dot indicator on the Transaction tab surfaces loans awaiting your attention (just approved, awaiting repayment) or with a new outcome to see (repaid, rejected, defaulted)
- 📄 **Credit Certificate** — downloadable, shareable (Messenger, etc.) proof of creditworthiness for banks
- 🔍 **Stellar Explorer** — one-click view of wallet on the blockchain

### For Lenders
- 🏦 **Email/password dashboard** (Supabase Auth)
- 📋 **Review borrower profiles** — full credit score, repayment history, tier
- ✅ **Approve / Disburse** with a confirmation modal showing the borrower's status and your projected XLM + peso gain before you commit, real XLM payments via Freighter
- 💰 **Interest-gain indicators** — see projected or earned interest (XLM and peso equivalent) on every loan, at every status
- ⚡ **Auto-default detection** — overdue loans flagged automatically, score adjusted
- 🔔 **Action-needed notifications** — a red-dot indicator on the Loans tab flags new pending applications or a borrower who just repaid
- 📈 **Portfolio analytics** — repayment rate, default rate, total disbursed

### Credit Score Tiers

Loan limits are denominated in XLM (converted from an earlier peso-based model); the peso-equivalent conversion is shown throughout the UI at the current market rate (~₱12.20/XLM).

| Score | Tier | Max Loan | Interest |
|-------|------|----------|----------|
| 300–449 | Starting Out | 10 XLM | 8% |
| 450–549 | Fair | 30 XLM | 7% |
| 550–649 | Developing | 60 XLM | 6% |
| 650–749 | Good | 150 XLM | 5% |
| 750–799 | Trusted | 300 XLM | 4.5% |
| 800–849 | Excellent | 500 XLM | 4% |
| 850 | Elite | 1,000 XLM | 3.5% |

---

## Loan Cycle Walkthrough

A complete end-to-end flow — from a borrower applying for a loan to earning a Credit Certificate after repayment.

### Step 1 — Borrower: Apply for a Loan

The borrower connects their Freighter wallet, checks their current credit score, and submits a loan application. Loan limits unlock automatically based on their score tier — no bank visit, no paperwork.

<img width="1074" height="719" alt="Borrower views credit score on dashboard" src="https://github.com/user-attachments/assets/e64f657d-2088-4ed1-9898-321d674e8525" />
<img width="1021" height="722" alt="Borrower fills out loan application with amount and term" src="https://github.com/user-attachments/assets/7d152986-63a3-4646-b8d3-0805eb71ff54" />
<img width="1024" height="725" alt="Loan submitted and awaiting lender review" src="https://github.com/user-attachments/assets/1d2be0ed-9eb1-4319-af57-8b4d43accdcf" />
<img width="1021" height="723" alt="Borrower loan tracking page showing pending status" src="https://github.com/user-attachments/assets/c5f9eaeb-b5d7-48f9-9c58-4cea2a2fef8e" />

---

### Step 2 — Lender: Review, Approve, and Disburse

The lender logs into the dashboard and reviews the borrower's full credit profile — score breakdown, repayment history, and community vouches. After approving, the lender disburses XLM directly to the borrower's wallet via Freighter. Every action is recorded on-chain.

<img width="1016" height="716" alt="Lender dashboard showing pending applications with borrower credit scores" src="https://github.com/user-attachments/assets/dfd70249-0d78-40e0-b6d6-f3434c8596db" />
<img width="1021" height="716" alt="Lender reviews borrower credit profile and approves loan" src="https://github.com/user-attachments/assets/1ec76fa6-0d18-4e27-b307-44f94d8ca481" />
<img width="1025" height="719" alt="Lender disburses XLM to borrower via Freighter — Stellar transaction confirmed" src="https://github.com/user-attachments/assets/34a4ac77-0ec5-4ee4-a2a4-f896231d7430" />

---

### Step 3 — Borrower: Repay and Earn a Credit Certificate

The borrower receives the XLM and repays through the platform before the due date. Each on-time repayment raises their credit score. Once they have repayment history, they can download a **Credit Certificate** — a verifiable, printable proof of creditworthiness backed by Stellar blockchain data.

<img width="1074" height="719" alt="Borrower receives XLM and views active loan details" src="https://github.com/user-attachments/assets/b9e97c6a-b518-440d-99bb-7cc70ab01f32" />
<img width="1022" height="717" alt="Borrower downloads verifiable Credit Certificate as PDF" src="https://github.com/user-attachments/assets/4542ec24-7584-42fc-a93c-16cd674ae0d0" />
<img width="1022" height="720" alt="Credit score increases after successful on-time repayment" src="https://github.com/user-attachments/assets/a1932a98-9381-46eb-84f8-4a7b6a88290c" />
<img width="1018" height="720" alt="Borrower repays loan before due date" src="https://github.com/user-attachments/assets/f99dbba9-4082-48f9-b767-2ebd76201411" />

---

### On-Chain Transaction Proof

10+ real contract invocations on Stellar Testnet — `update_score` called for multiple wallets, verifiable on Stellar Explorer.

<img width="714" height="635" alt="Stellar Explorer showing 10+ contract transactions on credit_score contract" src="https://github.com/user-attachments/assets/9e05e5fa-762c-4f2a-924e-f6c8b784d9f7" />

---

### Mobile Responsive Design

Bankero is fully responsive at 390px viewport — tested on iPhone-sized screens via the built-in Mobile View toggle.

<img width="264" height="509" alt="Bankero mobile view — borrower dashboard" src="https://github.com/user-attachments/assets/a2a68cf3-4b1d-444d-b7b4-06c041514759" />
<img width="265" height="514" alt="Bankero mobile view — loan application" src="https://github.com/user-attachments/assets/fb698962-eeb4-4008-9026-722428163ce6" />
<img width="260" height="511" alt="Bankero mobile view — lender dashboard" src="https://github.com/user-attachments/assets/43fa77db-6db8-4c1b-a003-8ec316f58cb9" />
<img width="253" height="501" alt="Bankero mobile view — credit certificate" src="https://github.com/user-attachments/assets/0cb59df3-021b-48a1-a5b5-dbd9ae548712" />

---

### Analytics & Monitoring

Live visitor tracking via Vercel Analytics — installed and active on [bankero.vercel.app](https://bankero.vercel.app).

<img width="624" height="655" alt="Vercel Analytics dashboard showing visitors and page views" src="https://github.com/user-attachments/assets/7b0e54ac-bce1-48ad-bb8b-9e61bb87dbab" />

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Stellar Testnet + Soroban Smart Contracts |
| Wallet | Freighter ([@stellar/freighter-api](https://www.npmjs.com/package/@stellar/freighter-api)) |
| Smart Contracts | Rust / Soroban (4 contracts) |
| Frontend | React + TypeScript + Vite |
| Database | Supabase (Postgres + Auth + RLS) |
| Payments | Stellar Horizon API (real XLM disbursement) |
| Deployment | Vercel |

---

## Smart Contracts (Soroban)

Four contracts deployed on **Stellar Testnet**:

| Contract | ID | Purpose |
|----------|-----|---------|
| `credit_score` | `CDB7SJ7TPDJXH7HQ4MXOTN7OTXKLIHOQKPADKDPEM24MUFCKTOKEL4C7` | Aggregate scores, store borrower records |
| `loan_registry` | `CDMPFBKSCVZZ4VMEME4BZMYVLHCZQF33JEOKRT5K7TDUMT6NY6Z7FM2B` | Loan lifecycle management |
| `vouching` | `CB2EDYM6VJCW3PSUWULY3H7JBQHCSNDOK74WARSVB5PYOVSPUWRT5MO4` | Staked community vouches |
| `savings_bank` | `CBGPC7M6E35LWREUMJK2S5HCBJVZGRTHMRG33D6LW55RQ52B5L253EPJ` | Real on-chain XLM deposit/withdraw balance |

`paluwagan` also exists as a contract crate in the workspace (`contracts/paluwagan`) but the shipped Paluwagan feature is currently Supabase-backed, not yet deployed on-chain.

---

## CI/CD Pipeline

Every push to `main` automatically runs tests and builds via **GitHub Actions**.

### Pipeline steps
1. Install dependencies (`npm ci`)
2. Run all unit tests (`npm test`)
3. Build production bundle (`npm run build`)
4. Upload build artifact

<img width="1866" height="1136" alt="GitHub Actions CI pipeline passing" src="https://github.com/user-attachments/assets/aa526a77-b4b4-44fb-b91f-be1118f7b1a3" />

---

## Test Suite

**50 tests — all passing** across 3 test files.

```
 RUN  v4.1.9

 Test Files  3 passed (3)
      Tests  50 passed (50)
   Duration  ~700ms
```

| Test File | Coverage |
|-----------|----------|
| `stellar.test.ts` | `scoreTier()`, `scorePercent()`, `nextScoreTier()`, `SCORE_TIERS` array, `formatWallet()`, `formatXlmAmount()`, `xlmToPesoEstimate()` |
| `loanStore.test.ts` | `computeLocalScore()`, Laplace smoothing formula, `daysUntil()`, `formatDate()` |
| `savingsTracker.test.ts` | `getCurrentWeekIdentifier()`, `getWeekBounds()` week-identifier logic |

Run tests locally:

```bash
cd frontend
npm test
```

---

## Transaction Hash (Contract Interaction)

A real testnet transaction from a loan disbursement — a lender sending XLM to a borrower's wallet via the platform:

| Field | Value |
|-------|-------|
| **Transaction Hash** | `4ed1ef6bb9ed2c3cf4738417a190fce61cce5cca5b1ed77cbacd35df48907369` |
| **Type** | XLM Payment — Loan Disbursement |
| **Network** | Stellar Testnet |
| **Amount** | 5 XLM (₱500 loan) |
| **Date** | 2026-06-16 10:56:18 UTC |
| **View on Explorer** | [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/4ed1ef6bb9ed2c3cf4738417a190fce61cce5cca5b1ed77cbacd35df48907369) |

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

## Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Freighter Wallet](https://freighter.app/) browser extension
- A funded Stellar **testnet** account (use [Stellar Friendbot](https://friendbot.stellar.org))

---

### 1. Clone the Repository

```bash
git clone https://github.com/caramel-123/bankero.git
cd bankero
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Configure Environment Variables

```bash
cp frontend/.env.example frontend/.env
```

Fill in your values:

```env
# Stellar
VITE_STELLAR_NETWORK=testnet
VITE_SOROBAN_RPC=https://soroban-testnet.stellar.org

# Deployed contract IDs (already on testnet — use these)
VITE_CREDIT_SCORE_CONTRACT_ID=CDB7SJ7TPDJXH7HQ4MXOTN7OTXKLIHOQKPADKDPEM24MUFCKTOKEL4C7
VITE_LOAN_REGISTRY_CONTRACT_ID=CDMPFBKSCVZZ4VMEME4BZMYVLHCZQF33JEOKRT5K7TDUMT6NY6Z7FM2B
VITE_VOUCHING_CONTRACT_ID=CB2EDYM6VJCW3PSUWULY3H7JBQHCSNDOK74WARSVB5PYOVSPUWRT5MO4
VITE_SAVINGS_BANK_CONTRACT_ID=CBGPC7M6E35LWREUMJK2S5HCBJVZGRTHMRG33D6LW55RQ52B5L253EPJ

# Supabase — create a free project at supabase.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> **Note:** For local development, create your own free Supabase project at [supabase.com](https://supabase.com) and run the migration below.

> **Scan E-Payment (AI receipt verification)** needs one more variable, set as a **server-side** environment variable in Vercel (not `VITE_`-prefixed, never exposed to the browser) — `GROQ_API_KEY`, a free key from [console.groq.com/keys](https://console.groq.com/keys). This powers `frontend/api/verify-epayment.ts`, the serverless function that runs the OCR call so the key never reaches the client.

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
CREATE POLICY "public read users"         ON public.users       FOR SELECT USING (true);
CREATE POLICY "public upsert users"       ON public.users       FOR INSERT WITH CHECK (true);
CREATE POLICY "anon read loans"           ON public.loans       FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert loans"         ON public.loans       FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update loans"         ON public.loans       FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth read loans"           ON public.loans       FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth update loans"         ON public.loans       FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public read lenders"       ON public.lenders     FOR SELECT USING (true);
CREATE POLICY "auth insert lenders"       ON public.lenders     FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "auth update lenders"       ON public.lenders     FOR UPDATE TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "public read score_cache"   ON public.score_cache FOR SELECT USING (true);
CREATE POLICY "public upsert score_cache" ON public.score_cache FOR ALL USING (true) WITH CHECK (true);
```

### 5. Run Locally

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

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
├── contracts/                 # Soroban smart contracts (Rust)
│   ├── credit_score/          # Credit scoring logic
│   ├── loan_registry/         # Loan lifecycle management
│   ├── vouching/               # Community stake & vouch
│   ├── savings_bank/           # On-chain XLM deposit/withdraw balance
│   └── paluwagan/               # Contract crate (not yet deployed — feature is Supabase-backed)
├── frontend/                  # React + TypeScript app
│   ├── api/
│   │   └── verify-epayment.ts  # Vercel serverless fn — AI OCR for Scan E-Payment (Groq), keeps the API key off the client
│   ├── src/
│   │   ├── pages/              # All screens
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Onboarding.tsx
│   │   │   ├── Home.tsx              # Borrower home (formerly Dashboard.tsx)
│   │   │   ├── LoanApply.tsx
│   │   │   ├── LoanTracking.tsx      # "My Loans" + score breakdown (merged ScoreDetails.tsx)
│   │   │   ├── ScanEpayment.tsx      # AI-verified e-payment receipt scanner + history
│   │   │   ├── Vouch.tsx
│   │   │   ├── SavingsBank.tsx       # Deposit/withdraw on-chain XLM
│   │   │   ├── SavingsTracker.tsx    # Weekly Savings Streak
│   │   │   ├── Paluwagan{List,Create,Contribute,Detail}.tsx
│   │   │   ├── MyAccount.tsx         # Borrower profile + Credit Certificate
│   │   │   ├── CreditCertificate.tsx
│   │   │   └── LenderDashboard.tsx
│   │   ├── components/
│   │   │   ├── BottomNav.tsx         # Shared 5-tab borrower navigation
│   │   │   └── ScoreInfoModal.tsx    # Shared score-factor explainer
│   │   ├── lib/
│   │   │   ├── stellar.ts      # Stellar SDK + Freighter helpers + XLM payment + SCORE_TIERS
│   │   │   ├── supabase.ts     # Supabase client + auth + data layer
│   │   │   ├── loanStore.ts    # Loan state + score updates
│   │   │   └── anchorStore.ts  # GCash/Maya integration
│   │   ├── services/
│   │   │   ├── epaymentScan.ts     # Upload, hash, OCR call, duplicate checks, save
│   │   │   ├── savingsBank.ts      # Deposit/withdraw contract calls
│   │   │   ├── savingsTracker.ts   # Weekly streak logic
│   │   │   └── paluwagaScoring.ts
│   │   └── hooks/
│   │       ├── useWallet.ts        # Freighter wallet hook
│   │       ├── useAuthUser.ts      # Supabase Auth session hook
│   │       ├── useScore.ts         # Live credit score hook
│   │       └── useLoanAlerts.ts    # Nav-bar red-dot alert logic (borrower + lender)
│   └── .env.example
└── supabase/
    └── migrations/             # SQL schema migrations (17 as of this writing)
```

---

## User Onboarding

We are collecting real user feedback to guide the next phase of Bankero's development.

**[Fill out the Bankero User Onboarding & Feedback Form →](https://docs.google.com/forms/d/e/1FAIpQLSf4d5o2ryMU9h1_ANlqES3Xr92xnU9Sq4AcS-QUDOZYlJCEiQ/viewform)**

The form collects:
- Full name and email
- Stellar wallet address
- Features used (Borrow / Lend / Vouch / Credit Certificate)
- Overall experience rating (1–5)
- What users liked most
- What users want improved

All responses are exported and maintained in **[`docs/bankero-user-feedback.xlsx`](docs/bankero-user-feedback.xlsx)** and serve as the primary record for product iteration decisions.

---

## Improvement Plan (Based on User Feedback)

The following improvements are planned for Phase 2, informed directly by user feedback:

### 1. Mobile App (React Native)
**Feedback signal:** Users on mobile report the web app is functional but a native app feel is missing.
**Plan:** Build a React Native wrapper using Lobstr wallet for users without desktop browsers. Priority feature for borrowers in rural areas.

### 2. GCash / Maya Anchor Automation
**Feedback signal:** Users want their GCash history to automatically update their score without waiting for admin verification.
**Plan:** Integrate Stellar SEP-6/24 anchor protocol to automate anchor score updates directly from GCash and Maya transaction history.

### 3. Simplified Onboarding for Non-Tech Users
**Feedback signal:** New users unfamiliar with Stellar wallets find the Freighter setup confusing.
**Plan:** Add a step-by-step in-app wallet setup guide with screenshots and an explainer video linked from the dashboard for first-time users.

### 4. Filipino Language Support
**Feedback signal:** Several users requested full Filipino (Tagalog / Cebuano) UI translation.
**Plan:** Add i18n support with Filipino as the default language option, English as secondary. All CTAs, error messages, and score explanations translated.

### 5. SMS / Push Repayment Reminders
**Feedback signal:** Borrowers want reminders before their loan due date to avoid accidental defaults.
**Plan:** Integrate Supabase Edge Functions with an SMS gateway (e.g. Semaphore PH) to send repayment reminders 3 days and 1 day before the due date.

### 6. Lender Marketplace
**Feedback signal:** Borrowers want to choose from multiple lenders and compare interest rates.
**Plan:** Build a lender discovery page where borrowers can browse verified lenders, their rates, and specializations before submitting a loan application.

---

## Future Scope

Bankero is currently an MVP targeting the Stellar testnet. The roadmap ahead:

### Near-Term (Post-Hackathon)
- **Mainnet deployment** — migrate all 4 contracts from testnet to Stellar mainnet with real XLM
- **GCash / Maya anchor integration** — automate anchor score updates via Stellar SEP-6/24 instead of manual admin attestation
- **Mobile app** — React Native wrapper using Lobstr wallet for users without desktop browsers
- **SMS / USSD fallback** — for users without smartphones, enable loan status checks via text

### Medium-Term
- **Lender marketplace** — multiple lenders compete for borrowers, driving interest rates down through transparency
- **Score decay automation** — scheduled Soroban invocations for inactive wallet score decay (currently admin-triggered)
- **Vouch rewards** — on-chain distribution of the 1% voucher incentive when a borrower repays
- **Group lending** — support for bayanihan-style group loans where repayment responsibility is shared

### Long-Term
- **Cross-border portability** — OFW (overseas Filipino worker) score contributions from remittance corridors
- **Institutional lender API** — let rural banks and MFIs (microfinance institutions) query Bankero scores via REST
- **Reputation export** — let borrowers export their score proof to other DeFi platforms on Stellar
- **DAO governance** — community-governed score weight parameters, replacing admin control with token-weighted voting

---

## License

MIT © 2026 Mel Bernabe — Built for the Stellar White Belt Challenge
