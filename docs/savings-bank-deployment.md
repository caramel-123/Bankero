# Savings Bank — Deployment Fix Log

This documents the step-by-step process used to fix the "Savings bank contract is not configured yet." error and get real XLM deposits/withdrawals working.

## The problem

The Savings Bank page showed:

```
Savings bank contract is not configured yet.
```

Unlike `credit_score`, `loan_registry`, and `vouching` (already live on testnet), the `savings_bank` Soroban contract had only ever been **built and unit-tested locally** — it was never actually deployed to the Stellar network. Because of that, `VITE_SAVINGS_BANK_CONTRACT_ID` was empty, and the app correctly refused to try sending a deposit to a contract that doesn't exist:

```ts
// frontend/src/services/savingsBank.ts
if (!CONTRACT_IDS.savingsBank) throw new Error('Savings bank contract is not configured yet.')
```

Fixing this required actions outside the codebase: deploying a real contract on-chain, then wiring its address into the app.

## Step 1 — Locate the repo and confirm the contract package

```bash
cd ~/Desktop/Bankero   # wherever the repo was cloned
ls contracts/savings_bank/Cargo.toml
```

A common early mistake: running the deploy commands from an unrelated folder (no `Cargo.toml` found). Always `cd` into the actual Bankero repo first.

## Step 2 — Create and fund a deployer account

The Stellar CLI needs a funded testnet identity to pay for deployment.

```bash
stellar keys generate --global bankero-deployer --network testnet
```

This is supposed to auto-fund via Friendbot, but didn't take effect immediately in our case — the first deploy attempt failed with:

```
❌ error: Account not found: GAU6GTXZNK3VW5XDYDBUA5UPWXJPCM2QSIQBYXBYDRJLZUHHR5YATWIV
```

Fixed by funding explicitly:

```bash
stellar keys fund bankero-deployer --network testnet
# or, if that subcommand isn't available:
curl "https://friendbot.stellar.org/?addr=$(stellar keys address bankero-deployer)"
```

## Step 3 — Build and deploy the contract

```bash
stellar contract build --package savings_bank

stellar contract deploy \
  --wasm target/wasm32v1-none/release/savings_bank.wasm \
  --source bankero-deployer \
  --network testnet
```

Output (real deployment):

```
✅ Deployed!
CAOWTHTJRNWKRF6BLFWQKK3H5AGTZI6HGHRUGIY2R2MCS4RHH2FBTSKS
```

**Gotcha**: when substituting placeholder values from instructions (e.g. `<your-account>`), replace the *entire* bracketed placeholder with the real value — `<` and `>` are shell redirection operators, so pasting them literally causes a `parse error`.

## Step 4 — Look up the native XLM token contract ID

Soroban treats native XLM as a token contract; the savings_bank contract needs its address to move funds.

```bash
stellar contract id asset --asset native --network testnet
# → CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

## Step 5 — Initialize the deployed contract (one-time)

```bash
stellar contract invoke \
  --id CAOWTHTJRNWKRF6BLFWQKK3H5AGTZI6HGHRUGIY2R2MCS4RHH2FBTSKS \
  --source bankero-deployer \
  --network testnet \
  -- initialize \
     --admin $(stellar keys address bankero-deployer) \
     --xlm_token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

Success is confirmed by an `init` event in the response:

```json
{"symbol":"init"} = {"vec":[{"address":"GAU6GTXZNK3VW5XDYDBUA5UPWXJPCM2QSIQBYXBYDRJLZUHHR5YATWIV"}]}
```

## Step 6 — Ensure the Supabase transaction-log table exists

`savings_bank_transactions` (migration `005_savings_bank.sql`) logs deposit/withdraw history for the UI — the on-chain balance is the source of truth, but this table backs the "Recent Activity" list. It had never been run against the live database, which would have caused a **false failure**: the on-chain deposit would succeed, but the app would throw trying to log it to a table that didn't exist.

Ran in the Supabase SQL Editor:

```sql
create table if not exists savings_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  stellar_address text not null,
  type text not null check (type in ('deposit', 'withdraw')),
  amount_xlm numeric not null,
  tx_hash text not null,
  balance_after_xlm numeric not null,
  score_bonus_applied integer default 0,
  created_at timestamptz default now()
);

alter table savings_bank_transactions enable row level security;

drop policy if exists "anon read savings_bank_transactions" on savings_bank_transactions;
drop policy if exists "anon insert savings_bank_transactions" on savings_bank_transactions;
drop policy if exists "read savings_bank_transactions" on savings_bank_transactions;
drop policy if exists "insert savings_bank_transactions" on savings_bank_transactions;

create policy "read savings_bank_transactions" on savings_bank_transactions for select to anon, authenticated using (true);
create policy "insert savings_bank_transactions" on savings_bank_transactions for insert to anon, authenticated with check (true);

grant select, insert on savings_bank_transactions to anon, authenticated;
```

Policies cover both the `anon` and `authenticated` Postgres roles — the same anon-vs-authenticated RLS gap that previously broke borrower login, lender signup, and loan applications elsewhere in this project.

## Step 7 — Wire the deployed address into the app

Updated `README.md`'s contract address table:

```diff
- | `savings_bank` | _not yet deployed — see below_ |
+ | `savings_bank` | `CAOWTHTJRNWKRF6BLFWQKK3H5AGTZI6HGHRUGIY2R2MCS4RHH2FBTSKS` |
```

Set the environment variable in **Vercel → Project Settings → Environment Variables**:

```
VITE_SAVINGS_BANK_CONTRACT_ID = CAOWTHTJRNWKRF6BLFWQKK3H5AGTZI6HGHRUGIY2R2MCS4RHH2FBTSKS
```

## Step 8 — Redeploy and verify

Vercel doesn't pick up a new environment variable for an already-built deployment — a fresh deploy was required (triggered by pushing the README commit). After redeploying:

- The red "Savings bank contract is not configured yet." message no longer appears.
- A test deposit succeeds, updates the on-chain balance, and appears under Recent Activity.

## Summary checklist (for redeploying to a new environment, e.g. mainnet)

- [ ] `cd` into the actual repo, confirm `contracts/savings_bank/Cargo.toml` exists
- [ ] Create + fund a deployer account for the target network
- [ ] `stellar contract build --package savings_bank`
- [ ] `stellar contract deploy` → save the contract ID
- [ ] `stellar contract id asset --asset native` → save the token ID
- [ ] `stellar contract invoke ... -- initialize --admin ... --xlm_token ...`
- [ ] Run/verify `supabase/migrations/005_savings_bank.sql` against the target database, with `anon, authenticated` RLS
- [ ] Update `README.md`'s contract address table
- [ ] Set `VITE_SAVINGS_BANK_CONTRACT_ID` in the hosting provider's env vars
- [ ] Redeploy the frontend
- [ ] Test a real deposit end-to-end
