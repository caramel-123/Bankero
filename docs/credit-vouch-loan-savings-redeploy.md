# Redeploying credit_score, vouching, loan_registry, and savings_bank together

## Why all four at once

`loan_registry` was redeployed earlier (for the loan-backing feature) together with
`savings_bank`, so those two correctly reference each other. `credit_score` and
`vouching` were **not** part of that redeployment — they still have the *old*
`loan_registry` address on file, so calls from the current `loan_registry` to either
of them are rejected as unauthorized. That's why savings-backed loan repayment
fails at the `record_loan_event` step, and why vouch-backed repayment would fail
the same way.

None of the four contracts have a way to update a stored contract address after
`initialize()` (this redeploy adds `set_*_contract` admin setters so this never
happens again — but they don't help contracts that are already live). The only
fix is a synchronized redeploy of all four, each initialized with the other three's
**new** addresses.

**Cost:** every on-chain score record, every active vouch stake, and every
Savings Bank balance (including your currently-locked 1 XLM) resets to zero
on-chain. Local/Supabase data (what the app displays day to day) is unaffected.

## Step 0 — Make sure your local checkout is current

```bash
cd ~/Bankero
git status
git pull origin main
```

Confirm this pulls in the new `set_loan_contract` / `set_score_contract` /
`set_vouch_contract` functions before building.

## Step 1 — Build all four contracts

```bash
cd ~/Bankero
stellar contract build
```

Confirm the build output lists `set_loan_contract`, `set_vouch_contract`
(credit_score), and `set_score_contract`, `set_savings_contract` (loan_registry)
among the exported functions — that confirms you're building the updated source.

## Step 2 — Deploy all four fresh (no initialize yet)

```bash
cd ~/Bankero

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/credit_score.wasm \
  --source bankero-deployer --network testnet
# → CREDIT_SCORE_ID

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vouching.wasm \
  --source bankero-deployer --network testnet
# → VOUCHING_ID

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/loan_registry.wasm \
  --source bankero-deployer --network testnet
# → LOAN_REGISTRY_ID

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/savings_bank.wasm \
  --source bankero-deployer --network testnet
# → SAVINGS_BANK_ID
```

Save all four addresses — every command below needs them.

## Step 3 — Look up the native XLM token contract ID

```bash
stellar contract id asset --asset native --network testnet
# → XLM_TOKEN_ID (should match CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC, used by the existing deployment)
```

## Step 4 — Get your deployer address

```bash
stellar keys address bankero-deployer
# → ADMIN_ADDRESS
```

## Step 5 — Initialize all four, cross-referencing each other's new addresses

```bash
stellar contract invoke --id CREDIT_SCORE_ID --source bankero-deployer --network testnet -- \
  initialize --admin ADMIN_ADDRESS --loan_contract LOAN_REGISTRY_ID --vouch_contract VOUCHING_ID

stellar contract invoke --id VOUCHING_ID --source bankero-deployer --network testnet -- \
  initialize --admin ADMIN_ADDRESS --score_contract CREDIT_SCORE_ID --loan_contract LOAN_REGISTRY_ID \
  --min_stake 500000000 --xlm_token XLM_TOKEN_ID

stellar contract invoke --id SAVINGS_BANK_ID --source bankero-deployer --network testnet -- \
  initialize --admin ADMIN_ADDRESS --xlm_token XLM_TOKEN_ID --loan_contract LOAN_REGISTRY_ID

stellar contract invoke --id LOAN_REGISTRY_ID --source bankero-deployer --network testnet -- \
  initialize --admin ADMIN_ADDRESS --score_contract CREDIT_SCORE_ID --vouch_contract VOUCHING_ID \
  --savings_contract SAVINGS_BANK_ID --xlm_token XLM_TOKEN_ID --interest_bps 500 --min_score 300
```

(`min_stake 500000000` = 50 XLM in stroops, matching the app's documented "minimum
50 XLM per vouch". `interest_bps 500` = 5%, `min_score 300` — matching the values
the current live `loan_registry` already uses.)

## Step 6 — Update the frontend

In `frontend/.env` (and the matching Vercel project env vars):

```
VITE_CREDIT_SCORE_CONTRACT_ID=CREDIT_SCORE_ID
VITE_LOAN_REGISTRY_CONTRACT_ID=LOAN_REGISTRY_ID
VITE_VOUCHING_CONTRACT_ID=VOUCHING_ID
VITE_SAVINGS_BANK_CONTRACT_ID=SAVINGS_BANK_ID
```

## Step 7 — Update README's contract address table

Two tables (lines ~20-23 and ~195-198) plus the stellar.expert links just below
the first one, and the `.env` example near the bottom — all four IDs need
updating in each place.

## Verification checklist

- [ ] `stellar contract build` shows the new setter functions in the exported ABI
- [ ] All four `deploy` commands succeed, four new contract IDs saved
- [ ] All four `initialize` calls succeed (no `ALREADY_INITIALIZED` panics — if
      one does, it means that ID wasn't actually fresh, re-check the deploy step)
- [ ] Frontend `.env` and Vercel env vars updated with all four new IDs
- [ ] README updated in both tables + explorer links + `.env` example
- [ ] On the live site: apply for a new savings-backed loan, lock collateral,
      approve/disburse from the lender side, then repay — confirm it completes
      without the `record_loan_event` / `Error(Contract, #3)` failure
