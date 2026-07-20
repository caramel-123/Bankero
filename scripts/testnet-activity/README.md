# Bankero testnet activity generator

Local-only script for generating real on-chain Stellar **testnet** activity
against Bankero's actual deployed Soroban contracts — for your own testing,
not for submission "proof."

What it does, all for real, on-chain, on testnet:
1. Generates 50 fresh Stellar keypairs (labeled locally with placeholder
   names for your own reference — the names never touch the chain) plus one
   dedicated lender wallet, and funds all 51 via Friendbot.
2. Has every one of the 50 wallets make 1-3 real deposits into the live
   `savings_bank` contract.
3. Runs 10 of those 50 wallets through a full real loan lifecycle against
   `loan_registry`: `apply_loan` → the dedicated lender `approve_loan`s and
   `disburse_loan`s → the borrower `repay_loan`s.

It never touches Supabase — no `supabase.co` calls anywhere in `run.mjs`.
It only talks to `soroban-testnet.stellar.org` and `friendbot.stellar.org`.

## Run it

This sandbox has no outbound path to Stellar's network, so run this from
your own machine:

```
cd scripts/testnet-activity
npm install
npm start
```

Expect it to take a while — roughly 100-150 real submitted transactions,
each waiting for testnet ledger close (~5s) plus polling. Budget 20-40
minutes. It's safe to re-run: if `wallets.json` already exists it reuses
those wallets instead of generating new ones.

## Output

- `wallets.json` — all 51 keypairs, **including secret keys**. Testnet
  funny-money only, but still don't commit or share this file.
- `results.json` — every transaction hash for both the deposits and the
  loan lifecycle, so you can look each one up on
  [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet)
  as real, independently verifiable evidence.

Both output files are gitignored.
