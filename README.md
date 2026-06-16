# 🏦 Bankero: Decentralized Credit Scoring and Micro-Lending on Stellar

> **"From invisible to investable."**
> Bankero gives unbanked Filipinos a verifiable credit score based on their real financial behavior — unlocking access to fair micro-loans without needing a bank account, collateral, or formal employment.

---

## 🌟 Project Overview

**Bankero** is a decentralized credit scoring and micro-lending platform built on **Stellar** and **Soroban smart contracts**. It targets the 50+ million unbanked and underbanked Filipinos who are excluded from formal financial systems — not because they are irresponsible, but because their financial lives happen in cash, in community, and outside the formal economy.

Maria sells fishballs in Quiapo. She earns ₱1,500 a day, pays her bills on time, and has never missed a paluwagan contribution. But banks reject her loan applications because she has no credit score. **Bankero fixes this.**

By aggregating real behavioral signals — Stellar wallet activity, loan repayment history, community vouching, and GCash payment history — into a transparent on-chain credit score (300–850), Bankero unlocks access to fair micro-loans for the people who need them most.

### How Bankero Connects to Stellar

| Bankero Concept | Stellar/Soroban Mechanism | Benefit |
| :--- | :--- | :--- |
| **Credit Score** | `credit_score` Soroban contract | Tamper-proof, deterministic, on-chain reputation |
| **Micro-Loans** | `loan_registry` Soroban contract | Full loan lifecycle managed on-chain |
| **Community Vouching** | `vouching` Soroban contract | XLM staked as social trust signal |
| **Fiat Bridge** | PDAX API + Stellar Anchors | PHP cash-in/cash-out for real users |
| **Wallet** | Freighter / LOBSTR | Stellar wallet integration |

---

## ✨ Features

### Main Features

#### 1. 📊 Bankero Credit Score (300–850)
Every user receives a credit score computed by the `credit_score` Soroban smart contract based on four weighted behavioral signals:

- **Transaction Activity (25%)** — Stellar wallet usage frequency and volume
- **Repayment History (40%)** — Most important signal; every on-time repayment increases this, every default penalizes it
- **Community Vouching (20%)** — Total XLM staked by trusted community members on behalf of the borrower
- **Anchor & GCash History (15%)** — Off-chain bill payments and GCash transaction history attested by an oracle

Scores start at **300** for new users and can reach **850** for users with excellent history. Scores decay after 90 days of inactivity.

#### 2. 💸 Tiered Micro-Loan System
The `loan_registry` Soroban contract manages the complete loan lifecycle on-chain:

| Credit Score | Max Loan |
| :--- | :--- |
| 300 – 499 | 500 XLM |
| 500 – 649 | 2,000 XLM |
| 650 – 799 | 5,000 XLM |
| 800 – 850 | 10,000 XLM |

- Flat **5% interest rate** — no compound interest, no hidden fees
- On-chain loan states: `Pending → Approved → Disbursed → Repaid / Defaulted`
- No backward state transitions — full audit trail on Stellar

#### 3. 🤝 Community Vouching with Stake Slashing
The most uniquely Filipino feature — **bayanihan on the blockchain.**

- A trusted community member stakes a minimum of **50 XLM** to vouch for a borrower
- Stake is locked in the `vouching` smart contract for the duration of the active loan
- **If borrower repays:** Voucher gets stake back + **1% reward**
- **If borrower defaults:** Stake is **slashed** and sent to the lender as compensation
- Anti-sybil rules: max 5 vouchers per borrower, self-vouch blocked, minimum voucher score of 500

#### 4. 🏦 Lender Dashboard with Borrower Intelligence
- View borrower credit score breakdown across all four components
- Filter loan applications by purpose, score range, and voucher count
- Real-time repayment countdowns and on-chain default notifications
- Full loan history and voucher details per borrower

#### 5. 🔍 Score Transparency and Simulator
- See exactly how your score is calculated with a component breakdown
- **"What if" simulator:** See how specific actions (repaying a loan, getting vouched, saving weekly) affect your score before taking action
- Transforms credit scoring from a black box into an understandable financial roadmap

---

### Side Features

| Feature | Description |
| :--- | :--- |
| 🎯 **Loan Purpose Categories** | Borrowers select purpose (business, medical, education, housing, agriculture) — lenders can filter by cause |
| 🔔 **Repayment Reminders** | Automated notifications at 7 days, 3 days, and 1 day before due date |
| 🏅 **Score Badges & Milestones** | On-chain Stellar asset badges for milestones (First Loan Repaid, Score 700 Club, etc.) |
| 💰 **Savings Streak Bonus** | Consistent weekly XLM deposits earn +10 score bonus per 4-week streak (max +30) |
| ✅ **Business Verification Seal** | DTI/BIR registered MSMEs get a verified badge and +15 anchor score bonus |
| 🌪️ **Micro-Insurance for Typhoons** | Optional 1–2% premium; PAGASA oracle auto-grants grace period if typhoon Signal 3+ hits borrower's area |

---

## 💻 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Smart Contracts** | Rust + Soroban (Stellar) |
| **Frontend** | React + TypeScript + Vite |
| **Styling** | Tailwind CSS |
| **Database** | Supabase (off-chain metadata) |
| **Blockchain** | Stellar Testnet → Mainnet |
| **Wallet** | Freighter (dev) / LOBSTR (users) |
| **Fiat Bridge** | PDAX API (PHP on/off-ramp) |
| **SDK** | @stellar/stellar-sdk, @stellar/freighter-api |

---

## 💡 Why Stellar for Bankero?

| Stellar Feature | How Bankero Uses It |
| :--- | :--- |
| **Fast & Low-Cost (3–5s, fraction of a cent)** | Loan disbursement and repayment happen almost instantly |
| **Soroban Smart Contracts** | Credit scoring, loan registry, and vouching logic fully on-chain |
| **Financial Inclusion Mission** | Aligns perfectly with Bankero's target of unbanked Filipinos |
| **USDC on Stellar** | Stablecoin option for loans (future roadmap) |
| **Stellar Anchors (SEP-24)** | PHP fiat on/off-ramp pathway via PDAX |

---

## 🏗️ Smart Contract Architecture

Bankero runs on **3 Soroban smart contracts**:

```
credit_score.wasm
├── initialize()
├── update_score()
├── get_score()
├── compute_score()
└── decay_score()

loan_registry.wasm
├── initialize()
├── apply_loan()
├── approve_loan()
├── disburse_loan()
├── repay_loan()
├── mark_defaulted()
├── get_loan()
└── get_borrower_loans()

vouching.wasm
├── initialize()
├── vouch()
├── revoke_vouch()
├── slash_voucher()
├── get_vouch_score()
└── get_vouchers()
```

**Score Formula (integer arithmetic, no floats):**
```
score_raw = (tx_score × 25) + (repayment_score × 40) + (vouch_score × 20) + (anchor_score × 15)
final_score = 300 + (score_raw × 550 / 10000)
Range: 300 – 850
```

---

## 🛠️ Getting Started

### Prerequisites

1. **Install Rust + WASM target:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

2. **Install Stellar CLI:**
```bash
cargo install --locked stellar-cli --features opt
```

3. **Install a Stellar Wallet:** [Freighter](https://freighter.app) browser extension

4. **Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/bankero.git
cd bankero
```

---

### Step 1 — Build Smart Contracts

```bash
# Free disk space first (important!)
rm -rf target/debug

# Build all 3 contracts
cargo build --target wasm32-unknown-unknown --release
```

---

### Step 2 — Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Paste and run the migration from `supabase/migrations/001_initial_schema.sql`
4. Copy your `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Project Settings

---

### Step 3 — Deploy to Stellar Testnet

**Generate and fund 4 testnet wallets:**
```bash
stellar keys generate --global admin --network testnet
stellar keys generate --global borrower-test --network testnet
stellar keys generate --global lender-test --network testnet
stellar keys generate --global voucher-test --network testnet

# Fund each via Friendbot
curl "https://friendbot.stellar.org?addr=$(stellar keys address admin --network testnet)"
curl "https://friendbot.stellar.org?addr=$(stellar keys address borrower-test --network testnet)"
curl "https://friendbot.stellar.org?addr=$(stellar keys address lender-test --network testnet)"
curl "https://friendbot.stellar.org?addr=$(stellar keys address voucher-test --network testnet)"
```

**Deploy contracts (in order — dependencies matter):**
```bash
# 1. Deploy credit_score first (no dependencies)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/credit_score.wasm \
  --source admin --network testnet
# Save output as CREDIT_SCORE_ID

# 2. Deploy vouching (depends on credit_score)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vouching.wasm \
  --source admin --network testnet
# Save output as VOUCHING_ID

# 3. Deploy loan_registry (depends on credit_score + vouching)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/loan_registry.wasm \
  --source admin --network testnet
# Save output as LOAN_REGISTRY_ID
```

**Initialize contracts:**
```bash
NATIVE_TOKEN=$(stellar contract id asset --asset native --network testnet)

# Initialize credit_score
stellar contract invoke --id $CREDIT_SCORE_ID --source admin --network testnet \
  -- initialize \
  --admin $(stellar keys address admin --network testnet) \
  --loan_contract $LOAN_REGISTRY_ID \
  --vouch_contract $VOUCHING_ID

# Initialize vouching (min_stake = 50 XLM)
stellar contract invoke --id $VOUCHING_ID --source admin --network testnet \
  -- initialize \
  --admin $(stellar keys address admin --network testnet) \
  --score_contract $CREDIT_SCORE_ID \
  --loan_contract $LOAN_REGISTRY_ID \
  --min_stake 500000000 \
  --xlm_token $NATIVE_TOKEN

# Initialize loan_registry (5% interest, min score 300)
stellar contract invoke --id $LOAN_REGISTRY_ID --source admin --network testnet \
  -- initialize \
  --admin $(stellar keys address admin --network testnet) \
  --score_contract $CREDIT_SCORE_ID \
  --vouch_contract $VOUCHING_ID \
  --xlm_token $NATIVE_TOKEN \
  --interest_bps 500 \
  --min_score 300
```

---

### Step 4 — Run the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Fill in your `.env`:
```env
VITE_STELLAR_NETWORK=testnet
VITE_SOROBAN_RPC=https://soroban-testnet.stellar.org
VITE_CREDIT_SCORE_CONTRACT_ID=<your CREDIT_SCORE_ID>
VITE_LOAN_REGISTRY_CONTRACT_ID=<your LOAN_REGISTRY_ID>
VITE_VOUCHING_CONTRACT_ID=<your VOUCHING_ID>
VITE_SUPABASE_URL=<your Supabase URL>
VITE_SUPABASE_ANON_KEY=<your Supabase anon key>
```

```bash
# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### Usage Steps

1. **Connect Wallet** — Click "Connect Wallet" and approve in Freighter
2. **View Your Score** — New users start at score 300 automatically
3. **Get Vouched** — Ask a trusted community member to stake XLM for you
4. **Apply for a Loan** — Select amount, term, and loan purpose
5. **Lenders Approve** — Lender reviews your score and approves/disburses
6. **Repay On Time** — Repay before due date to increase your score
7. **Grow Your Score** — Keep building your on-chain financial reputation

---

### Smoke Test (Verify Everything Works)

```bash
# Should return score = 300 for a fresh wallet
stellar contract invoke --id $CREDIT_SCORE_ID --source admin --network testnet \
  -- compute_score \
  --borrower $(stellar keys address borrower-test --network testnet)
```

---

## 📸 Screenshots

> Add your screenshots here after running the app:

| Screen | Screenshot |
| :--- | :--- |
| Wallet Connected + Score Display | `screenshots/01-wallet-connected.png` |
| XLM Balance Displayed | `screenshots/02-balance.png` |
| Loan Application Submitted | `screenshots/03-loan-application.png` |
| Testnet Transaction Result | `screenshots/04-transaction-result.png` |
| Community Vouching Screen | `screenshots/05-vouching.png` |
| Lender Dashboard | `screenshots/06-lender-dashboard.png` |

---

## 🗺️ Roadmap

```
Hackathon MVP (July 15, 2026)
✅ 3 Soroban contracts (credit_score, loan_registry, vouching)
✅ 21 contract tests passing
🔄 Supabase schema migration
🔄 React frontend (6 screens)
🔄 Testnet deployment
🔄 Full E2E smoke tests

Post-Hackathon
→ Stellar Mainnet deployment
→ GCash anchor automation (no manual attestation)
→ PDAX API integration for PHP cash-in/out
→ Mobile app (React Native)
→ B2B API for rural banks and NGOs
→ Stellar Community Fund (SCF) grant application
→ Expansion to Indonesia and Vietnam
```

---

## 👤 Team

**Mel Bernabe** — Founder, Full Stack & Blockchain Developer
- [GitHub](https://github.com/YOUR_GITHUB)
- Built on Stellar/Soroban experience from LINGAP and BalikBayan projects

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [Stellar Development Foundation (SDF)](https://stellar.org) for the Soroban smart contract platform
- [Rise In](https://risein.com) for organizing the APAC Hackathon PH 2026
- The Filipino MSME community — this is built for you

---

*APAC Stellar Hackathon PH 2026 | Track: Local Finance & Real-World Access | Submission Deadline: July 15, 2026*

> **Bankero** — *From invisible to investable.* 🏦
