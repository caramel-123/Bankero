// Bankero — real testnet activity generator
//
// Generates 50 real Stellar TESTNET keypairs, funds each via Friendbot, has
// every one of them make 1-3 real Savings Bank deposits, then runs a subset
// of 10 through a full real loan lifecycle (apply -> approve -> disburse ->
// repay) against a single dedicated lender wallet. Everything here is a real
// signed transaction submitted to Stellar's public testnet RPC — nothing is
// simulated or faked, and this script never touches Bankero's Supabase
// database (no network calls to supabase.co anywhere in this file).
//
// TESTNET ONLY. Do not point NETWORK/RPC_URL at mainnet.
//
// Usage:
//   cd scripts/testnet-activity
//   npm install
//   npm start
//
// Output: wallets.json (all 50 keypairs — includes SECRET KEYS, testnet-only
// funny-money, but still don't commit or share this file) and a
// results.json summary with every tx hash for verification on
// https://stellar.expert/explorer/testnet

import {
  Keypair, TransactionBuilder, Networks, Operation, Address,
  nativeToScVal, xdr, BASE_FEE, rpc, scValToNative,
} from '@stellar/stellar-sdk'
import { writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

// ── Config — current live testnet deployment (README.md) ──────────────────
const NETWORK = Networks.TESTNET
const RPC_URL = 'https://soroban-testnet.stellar.org'
const FRIENDBOT_URL = 'https://friendbot.stellar.org'

const CONTRACT_IDS = {
  creditScore:  'CDB7SJ7TPDJXH7HQ4MXOTN7OTXKLIHOQKPADKDPEM24MUFCKTOKEL4C7',
  loanRegistry: 'CDMPFBKSCVZZ4VMEME4BZMYVLHCZQF33JEOKRT5K7TDUMT6NY6Z7FM2B',
  vouching:     'CB2EDYM6VJCW3PSUWULY3H7JBQHCSNDOK74WARSVB5PYOVSPUWRT5MO4',
  savingsBank:  'CBGPC7M6E35LWREUMJK2S5HCBJVZGRTHMRG33D6LW55RQ52B5L253EPJ',
}

const TOTAL_WALLETS = 50
const LOAN_SUBSET_SIZE = 10
const DEPOSIT_MIN_XLM = 1
const DEPOSIT_MAX_XLM = 5
const LOAN_AMOUNT_XLM = 2
const LOAN_TERM_DAYS = 7
const CONCURRENCY = 4 // parallel wallets at a time — keep modest, public RPC is shared

const NAMES = [
  'Maria Santos', 'Jose Reyes', 'Ana Cruz', 'Carlo Bautista', 'Liza Garcia',
  'Miguel Torres', 'Rosa Flores', 'Antonio Ramos', 'Carmen Villanueva', 'Pedro Mendoza',
  'Elena Aquino', 'Ramon Castillo', 'Sofia Del Rosario', 'Gabriel Manalo', 'Teresa Navarro',
  'Francisco Domingo', 'Isabel Pascual', 'Rafael Salazar', 'Luz Fernandez', 'Andres Marquez',
  'Cristina Ocampo', 'Eduardo Tolentino', 'Beatriz Rivera', 'Manuel Espiritu', 'Victoria Lopez',
  'Fernando Gonzales', 'Angelica Ramirez', 'Roberto Dizon', 'Patricia Valdez', 'Ricardo Custodio',
  'Gloria Morales', 'Alfredo Aguilar', 'Josefina Herrera', 'Danilo Perez', 'Remedios Santiago',
  'Arturo Panganiban', 'Corazon Rosales', 'Ernesto Villareal', 'Milagros Cabrera', 'Salvador Ignacio',
  'Divina Baltazar', 'Leonardo Guevarra', 'Adoracion Lim', 'Bienvenido Castro', 'Purificacion Uy',
  'Wilfredo Sarmiento', 'Concepcion Molina', 'Nestor Abad', 'Perla Batungbakal', 'Renato Cortez',
]

const server = new rpc.Server(RPC_URL, { allowHttp: false })

// ── Helpers ─────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function xlmToStroops(xlm) { return Math.round(xlm * 10_000_000) }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

async function withRetry(label, fn, attempts = 4) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try { return await fn() } catch (err) {
      lastErr = err
      const wait = 1500 * 2 ** i
      console.warn(`  [retry ${i + 1}/${attempts}] ${label}: ${err.message || err} — waiting ${wait}ms`)
      await sleep(wait)
    }
  }
  throw lastErr
}

async function fundWithFriendbot(publicKey) {
  return withRetry(`friendbot fund ${publicKey.slice(0, 8)}`, async () => {
    const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      // Already-funded accounts 400 with a specific message — treat as success.
      if (body.includes('createAccountAlreadyExist')) return
      throw new Error(`friendbot HTTP ${res.status}: ${body.slice(0, 200)}`)
    }
  })
}

function backingTypeArg(kind) {
  const variant = kind === 'none' ? 'None' : kind === 'vouch' ? 'Vouch' : 'Savings'
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant)])
}

/** Build, sign (local Keypair — no Freighter, this is a headless script), submit, and poll a Soroban write call. */
async function invoke(contractId, functionName, args, signerKeypair) {
  return withRetry(`${functionName} (${signerKeypair.publicKey().slice(0, 8)})`, async () => {
    const account = await server.getAccount(signerKeypair.publicKey())
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.invokeContractFunction({ contract: contractId, function: functionName, args }))
      .setTimeout(60)
      .build()

    const prepared = await server.prepareTransaction(tx)
    prepared.sign(signerKeypair)

    const sendResult = await server.sendTransaction(prepared)
    if (sendResult.status === 'ERROR' || sendResult.status === 'DUPLICATE') {
      throw new Error(`send ${sendResult.status}: ${JSON.stringify(sendResult.errorResult ?? '')}`)
    }

    for (let attempt = 0; attempt < 20; attempt++) {
      await sleep(1500)
      const result = await server.getTransaction(sendResult.hash)
      if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return { hash: sendResult.hash, returnValue: result.returnValue ? scValToNative(result.returnValue) : undefined }
      }
      if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`tx failed on-chain: ${sendResult.hash}`)
      }
    }
    throw new Error(`timed out waiting for confirmation: ${sendResult.hash}`)
  })
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length)
  let next = 0
  async function runner() {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runner))
  return results
}

// ── Step 1: generate + fund wallets ────────────────────────────────────
async function generateAndFundWallets() {
  const walletsPath = new URL('./wallets.json', import.meta.url)
  if (existsSync(walletsPath)) {
    console.log('wallets.json already exists — reusing existing wallets instead of generating new ones.')
    return JSON.parse(await readFile(walletsPath, 'utf8'))
  }

  console.log(`Generating ${TOTAL_WALLETS} testnet keypairs + 1 dedicated lender wallet...`)
  const borrowers = NAMES.slice(0, TOTAL_WALLETS).map(label => {
    const kp = Keypair.random()
    return { label, publicKey: kp.publicKey(), secret: kp.secret() }
  })
  const lenderKp = Keypair.random()
  const lender = { label: 'Bankero Test Lender', publicKey: lenderKp.publicKey(), secret: lenderKp.secret() }

  const all = [...borrowers, lender]
  console.log('Funding all wallets via Friendbot (this takes a few minutes)...')
  let funded = 0
  await runPool(all, CONCURRENCY, async (w) => {
    await fundWithFriendbot(w.publicKey)
    funded++
    console.log(`  funded ${funded}/${all.length}: ${w.label} (${w.publicKey.slice(0, 8)}...)`)
    await sleep(300)
  })

  const data = { borrowers, lender }
  await writeFile(walletsPath, JSON.stringify(data, null, 2))
  console.log(`Wrote ${walletsPath.pathname}`)
  return data
}

// ── Step 2: real Savings Bank deposits for all 50 ──────────────────────
async function runSavingsDeposits(borrowers, results) {
  console.log(`\nRunning 1-3 real Savings Bank deposits per wallet (${borrowers.length} wallets)...`)
  await runPool(borrowers, CONCURRENCY, async (w) => {
    const kp = Keypair.fromSecret(w.secret)
    const depositCount = randInt(1, 3)
    results.deposits[w.publicKey] = []
    for (let i = 0; i < depositCount; i++) {
      const amountXlm = randInt(DEPOSIT_MIN_XLM, DEPOSIT_MAX_XLM)
      try {
        const { hash } = await invoke(
          CONTRACT_IDS.savingsBank, 'deposit',
          [new Address(w.publicKey).toScVal(), nativeToScVal(xlmToStroops(amountXlm), { type: 'i128' })],
          kp,
        )
        results.deposits[w.publicKey].push({ amountXlm, hash })
        console.log(`  [deposit] ${w.label}: ${amountXlm} XLM — ${hash}`)
      } catch (err) {
        console.error(`  [deposit FAILED] ${w.label}: ${err.message}`)
        results.deposits[w.publicKey].push({ amountXlm, error: String(err.message || err) })
      }
    }
  })
}

// ── Step 3: full on-chain loan lifecycle for a subset ──────────────────
async function runLoanLifecycle(borrower, lenderKp, results) {
  const borrowerKp = Keypair.fromSecret(borrower.secret)
  const entry = { steps: {} }
  results.loans[borrower.publicKey] = entry
  try {
    const apply = await invoke(
      CONTRACT_IDS.loanRegistry, 'apply_loan',
      [
        new Address(borrower.publicKey).toScVal(),
        new Address(lenderKp.publicKey()).toScVal(),
        nativeToScVal(xlmToStroops(LOAN_AMOUNT_XLM), { type: 'i128' }),
        nativeToScVal(LOAN_TERM_DAYS, { type: 'u32' }),
        backingTypeArg('none'),
        nativeToScVal(0, { type: 'i128' }),
      ],
      borrowerKp,
    )
    const loanId = Number(apply.returnValue)
    entry.loanId = loanId
    entry.steps.apply = apply.hash
    console.log(`  [apply] ${borrower.label}: loan #${loanId} — ${apply.hash}`)

    const approve = await invoke(
      CONTRACT_IDS.loanRegistry, 'approve_loan',
      [new Address(lenderKp.publicKey()).toScVal(), nativeToScVal(loanId, { type: 'u64' })],
      lenderKp,
    )
    entry.steps.approve = approve.hash
    console.log(`  [approve] loan #${loanId} — ${approve.hash}`)

    const disburse = await invoke(
      CONTRACT_IDS.loanRegistry, 'disburse_loan',
      [new Address(lenderKp.publicKey()).toScVal(), nativeToScVal(loanId, { type: 'u64' })],
      lenderKp,
    )
    entry.steps.disburse = disburse.hash
    console.log(`  [disburse] loan #${loanId} — ${disburse.hash}`)

    // small delay to make sure the disbursement has fully landed before repay
    await sleep(2000)

    const repay = await invoke(
      CONTRACT_IDS.loanRegistry, 'repay_loan',
      [new Address(borrower.publicKey).toScVal(), nativeToScVal(loanId, { type: 'u64' })],
      borrowerKp,
    )
    entry.steps.repay = repay.hash
    console.log(`  [repay] loan #${loanId} — ${repay.hash}`)
    entry.status = 'repaid'
  } catch (err) {
    console.error(`  [loan lifecycle FAILED] ${borrower.label}: ${err.message}`)
    entry.status = 'failed'
    entry.error = String(err.message || err)
  }
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const { borrowers, lender } = await generateAndFundWallets()
  const lenderKp = Keypair.fromSecret(lender.secret)

  const results = { deposits: {}, loans: {}, startedAt: new Date().toISOString() }

  await runSavingsDeposits(borrowers, results)

  const subset = borrowers.slice(0, LOAN_SUBSET_SIZE)
  console.log(`\nRunning full on-chain loan lifecycle for ${subset.length} wallets (apply -> approve -> disburse -> repay)...`)
  // Loan lifecycle touches a shared lender account sequence number across
  // approve/disburse — run this part sequentially per-wallet to avoid
  // sequence-number races on the lender's account.
  for (const b of subset) {
    await runLoanLifecycle(b, lenderKp, results)
  }

  results.finishedAt = new Date().toISOString()
  const resultsPath = new URL('./results.json', import.meta.url)
  await writeFile(resultsPath, JSON.stringify(results, null, 2))

  console.log(`\nDone. Wrote ${resultsPath.pathname}`)
  console.log(`Explorer: https://stellar.expert/explorer/testnet/contract/${CONTRACT_IDS.savingsBank}`)
  console.log(`Lender wallet: https://stellar.expert/explorer/testnet/account/${lenderKp.publicKey()}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
