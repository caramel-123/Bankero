import { rpc, Address, scValToNative, nativeToScVal, xdr } from '@stellar/stellar-sdk'
import { signTransaction } from '@stellar/freighter-api'
import { CONTRACT_IDS, RPC_URL, NETWORK } from './stellar'

// ── Soroban RPC server ────────────────────────────────────
function getServer() {
  return new rpc.Server(RPC_URL, { allowHttp: false })
}

// ── credit_score ABI (only what we need) ─────────────────
// Functions we call:
//   get_score(borrower: Address) -> BorrowerRecord
//   compute_score(borrower: Address) -> u32

export interface BorrowerRecord {
  address: string
  score: number
  tx_score: number
  repayment_score: number
  vouch_score: number
  anchor_score: number
  last_updated: number
  total_loans: number
  loans_repaid: number
  loans_defaulted: number
}

/** Fetch on-chain score for a wallet address. Returns null if not yet registered. */
export async function fetchOnChainScore(walletAddress: string): Promise<BorrowerRecord | null> {
  try {
    const server = getServer()
    const contractId = CONTRACT_IDS.creditScore

    if (!contractId) {
      console.warn('Credit score contract ID not set')
      return null
    }

    // Build the get_score invocation using the low-level SimulateTransaction


    // Simulate get_score
    const result = await server.simulateTransaction(
      await buildGetScoreTx(walletAddress, contractId)
    )

    if (rpc.Api.isSimulationError(result)) {
      // Borrower not found — return default 300 score
      console.info('get_score simulation error (likely new wallet):', (result as any).error)
      return {
        address: walletAddress,
        score: 300,
        tx_score: 0,
        repayment_score: 0,
        vouch_score: 0,
        anchor_score: 0,
        last_updated: 0,
        total_loans: 0,
        loans_repaid: 0,
        loans_defaulted: 0,
      }
    }

    if (!rpc.Api.isSimulationSuccess(result) || !result.result) {
      return null
    }

    // Parse the returned ScVal map into BorrowerRecord
    const raw = result.result.retval
    const native = scValToNative(raw)

    // native is a Map or object from the Soroban contract return
    if (typeof native === 'object' && native !== null) {
      return {
        address: walletAddress,
        score:            Number(native.score ?? 300),
        tx_score:         Number(native.tx_score ?? 0),
        repayment_score:  Number(native.repayment_score ?? 0),
        vouch_score:      Number(native.vouch_score ?? 0),
        anchor_score:     Number(native.anchor_score ?? 0),
        last_updated:     Number(native.last_updated ?? 0),
        total_loans:      Number(native.total_loans ?? 0),
        loans_repaid:     Number(native.loans_repaid ?? 0),
        loans_defaulted:  Number(native.loans_defaulted ?? 0),
      }
    }

    return null
  } catch (err) {
    console.warn('fetchOnChainScore error:', err)
    return null
  }
}

async function buildGetScoreTx(walletAddress: string, contractId: string) {
  const { TransactionBuilder, Account, Operation, BASE_FEE } = await import('@stellar/stellar-sdk')
  const server = getServer()

  let account: any
  try {
    account = await server.getAccount(walletAddress)
  } catch {
    // Use a dummy account for simulation — we just need the sim result
    account = new Account(walletAddress, '0')
  }


  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: 'get_score',
        args: [new Address(walletAddress).toScVal()],
      })
    )
    .setTimeout(30)
    .build()

  return tx
}

/** Fetch vouch score for a wallet from the vouching contract */
export async function fetchVouchScore(walletAddress: string): Promise<number> {
  try {
    const server = getServer()
    const contractId = CONTRACT_IDS.vouching
    if (!contractId) return 0

    const { TransactionBuilder, Account, Operation, BASE_FEE } = await import('@stellar/stellar-sdk')

    let account: any
    try {
      account = await server.getAccount(walletAddress)
    } catch {
      account = new Account(walletAddress, '0')
    }

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: contractId,
          function: 'get_vouch_score',
          args: [new Address(walletAddress).toScVal()],
        })
      )
      .setTimeout(30)
      .build()

    const result = await server.simulateTransaction(tx)
    if (!rpc.Api.isSimulationSuccess(result) || !result.result) return 0
    return Number(scValToNative(result.result.retval)) || 0
  } catch {
    return 0
  }
}

/** A single active vouch record, mirroring the vouching contract's `Vouch` struct. */
export interface OnChainVouch {
  voucher: string
  borrower: string
  stake_amount: number
  created_at: number
  is_active: boolean
}

/** Simulate a read-only call against a given contract with pre-built args. */
async function simulateRead(contractId: string, functionName: string, args: xdr.ScVal[], simSourceAddress: string): Promise<unknown> {
  const server = getServer()
  const { TransactionBuilder, Account, Operation, BASE_FEE } = await import('@stellar/stellar-sdk')

  let account: any
  try {
    account = await server.getAccount(simSourceAddress)
  } catch {
    account = new Account(simSourceAddress, '0')
  }

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: functionName,
        args,
      })
    )
    .setTimeout(30)
    .build()

  const result = await server.simulateTransaction(tx)
  if (!rpc.Api.isSimulationSuccess(result) || !result.result) return null
  return scValToNative(result.result.retval)
}

/** All active voucher addresses for a borrower, from the vouching contract's `get_vouchers`. */
export async function fetchVouchers(borrowerAddress: string): Promise<string[]> {
  try {
    const contractId = CONTRACT_IDS.vouching
    if (!contractId) return []
    const native = await simulateRead(
      contractId, 'get_vouchers',
      [new Address(borrowerAddress).toScVal()],
      borrowerAddress
    )
    if (!Array.isArray(native)) return []
    return native.map(a => String(a))
  } catch {
    return []
  }
}

/** The full Vouch record for a single (voucher, borrower) pair, or null if none/inactive. */
export async function fetchVouch(voucherAddress: string, borrowerAddress: string): Promise<OnChainVouch | null> {
  try {
    const contractId = CONTRACT_IDS.vouching
    if (!contractId) return null
    const native = await simulateRead(
      contractId, 'get_vouch',
      [new Address(voucherAddress).toScVal(), new Address(borrowerAddress).toScVal()],
      borrowerAddress
    )
    if (!native || typeof native !== 'object') return null
    const v = native as Record<string, unknown>
    return {
      voucher: String(v.voucher ?? voucherAddress),
      borrower: String(v.borrower ?? borrowerAddress),
      stake_amount: Number(v.stake_amount ?? 0),
      created_at: Number(v.created_at ?? 0),
      is_active: Boolean(v.is_active),
    }
  } catch {
    return null
  }
}

/** Convenience: resolve a borrower's full list of active vouchers with their stake amounts in one call. */
export async function fetchBorrowerVouchers(borrowerAddress: string): Promise<OnChainVouch[]> {
  const addrs = await fetchVouchers(borrowerAddress)
  const results = await Promise.all(addrs.map(a => fetchVouch(a, borrowerAddress)))
  return results.filter((v): v is OnChainVouch => v !== null && v.is_active)
}

// ── savings_bank ABI ───────────────────────────────────────
// Functions we call:
//   get_balance(user: Address) -> i128 (stroops)
//   get_tx_count(user: Address) -> u32

/**
 * Simulate a read-only savings_bank call that takes a single Address arg.
 * Returns `null` (not 0) when the call itself failed — no contract
 * configured, or the simulation errored (e.g. the deployed contract
 * predates this function and doesn't have it yet) — so callers can tell
 * "this feature isn't live on-chain yet" apart from a genuine 0 balance.
 */
async function fetchSavingsBankValueOrNull(walletAddress: string, functionName: string): Promise<number | null> {
  try {
    const server = getServer()
    const contractId = CONTRACT_IDS.savingsBank
    if (!contractId) return null

    const { TransactionBuilder, Account, Operation, BASE_FEE } = await import('@stellar/stellar-sdk')

    let account: any
    try {
      account = await server.getAccount(walletAddress)
    } catch {
      account = new Account(walletAddress, '0')
    }

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: contractId,
          function: functionName,
          args: [new Address(walletAddress).toScVal()],
        })
      )
      .setTimeout(30)
      .build()

    const result = await server.simulateTransaction(tx)
    if (!rpc.Api.isSimulationSuccess(result) || !result.result) return null
    return Number(scValToNative(result.result.retval)) || 0
  } catch {
    return null
  }
}

/** Same as fetchSavingsBankValueOrNull, but collapses a failed call to 0 — for the two functions (get_balance/get_tx_count) that have always existed on every deployed savings_bank contract, where a call failure realistically only means "never deposited" not "feature not live yet". */
async function fetchSavingsBankValue(walletAddress: string, functionName: string): Promise<number> {
  return (await fetchSavingsBankValueOrNull(walletAddress, functionName)) ?? 0
}

/** Fetch a user's saved balance from the savings_bank contract, in stroops. */
export async function fetchSavingsBankBalance(walletAddress: string): Promise<number> {
  return fetchSavingsBankValue(walletAddress, 'get_balance')
}

/** Fetch a user's deposit + withdrawal count from the savings_bank contract. */
export async function fetchSavingsBankTxCount(walletAddress: string): Promise<number> {
  return fetchSavingsBankValue(walletAddress, 'get_tx_count')
}

/**
 * Fetch a user's currently locked (loan collateral) amount, in stroops.
 * Returns `null` if the deployed savings_bank contract doesn't have
 * `get_locked` yet (i.e. the loan-backing redeploy hasn't happened) —
 * see docs/loan-backing-deployment.md.
 */
export async function fetchSavingsBankLocked(walletAddress: string): Promise<number | null> {
  return fetchSavingsBankValueOrNull(walletAddress, 'get_locked')
}

/**
 * Fetch a user's freely withdrawable balance (balance minus locked
 * collateral), in stroops. Returns `null` if the deployed savings_bank
 * contract doesn't have `get_available` yet — see the note on
 * fetchSavingsBankLocked above.
 */
export async function fetchSavingsBankAvailable(walletAddress: string): Promise<number | null> {
  return fetchSavingsBankValueOrNull(walletAddress, 'get_available')
}

// ── Generic write (state-changing) contract invocation ────
//
// Everything above only simulates reads. A write needs to be prepared
// (simulated + assembled with resource fees/footprint by the RPC server),
// signed by the caller's wallet, submitted, then polled for the result —
// nothing in this codebase did that yet before the savings_bank contract.

const TX_POLL_INTERVAL_MS = 1500
const TX_POLL_MAX_ATTEMPTS = 20

export class ContractWriteError extends Error {}

/**
 * Build, sign (via Freighter), submit, and poll a Soroban contract write
 * transaction. Returns the transaction hash and the contract's decoded
 * return value.
 */
export async function invokeContractWrite(
  contractId: string,
  functionName: string,
  args: xdr.ScVal[],
  sourceAddress: string
): Promise<{ hash: string; returnValue: unknown }> {
  const server = getServer()
  const { TransactionBuilder, Operation, BASE_FEE } = await import('@stellar/stellar-sdk')

  const account = await server.getAccount(sourceAddress)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: functionName,
        args,
      })
    )
    .setTimeout(60)
    .build()

  const prepared = await server.prepareTransaction(tx)

  const signResult = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK,
    address: sourceAddress,
  })
  if (signResult.error) {
    throw new ContractWriteError(
      typeof signResult.error === 'string' ? signResult.error : 'Signing rejected'
    )
  }
  if (!signResult.signedTxXdr) {
    throw new ContractWriteError('Signing cancelled')
  }

  const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK)
  const sendResult = await server.sendTransaction(signedTx)

  if (sendResult.status === 'ERROR' || sendResult.status === 'DUPLICATE') {
    throw new ContractWriteError(`Transaction ${sendResult.status.toLowerCase()}`)
  }

  for (let attempt = 0; attempt < TX_POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, TX_POLL_INTERVAL_MS))
    const result = await server.getTransaction(sendResult.hash)

    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return {
        hash: sendResult.hash,
        returnValue: result.returnValue ? scValToNative(result.returnValue) : undefined,
      }
    }
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new ContractWriteError('Transaction failed on-chain')
    }
    // NOT_FOUND — still pending, keep polling
  }

  throw new ContractWriteError('Timed out waiting for transaction confirmation')
}

/** Helper: build the ScVal args for a `(user: Address, amount: i128)` call. */
export function addressAmountArgs(userAddress: string, amountStroops: number | bigint): xdr.ScVal[] {
  return [
    new Address(userAddress).toScVal(),
    nativeToScVal(amountStroops, { type: 'i128' }),
  ]
}

/** Helper: build the ScVal args for a `(addr1: Address, addr2: Address, amount: i128)` call — e.g. vouching's `vouch(voucher, borrower, amount)`. */
export function twoAddressAmountArgs(addr1: string, addr2: string, amountStroops: number | bigint): xdr.ScVal[] {
  return [
    new Address(addr1).toScVal(),
    new Address(addr2).toScVal(),
    nativeToScVal(amountStroops, { type: 'i128' }),
  ]
}

/** Helper: build the ScVal args for an `(address: Address, loan_id: u64)` call — approve/disburse/repay/mark_defaulted. */
export function addressLoanIdArgs(address: string, loanId: number): xdr.ScVal[] {
  return [
    new Address(address).toScVal(),
    nativeToScVal(loanId, { type: 'u64' }),
  ]
}

/**
 * Encode a loan_registry `BackingType` unit enum (`None` | `Vouch` | `Savings`) as
 * an XDR ScVal. Soroban's #[contracttype] derive represents a fieldless enum
 * variant as a 1-element Vec containing the variant name Symbol — NOT a bare
 * Symbol — so this must be built directly with the xdr namespace rather than
 * `nativeToScVal`, which has no built-in mapping for custom contract enums.
 */
export function backingTypeArg(backingType: 'none' | 'vouch' | 'savings'): xdr.ScVal {
  const variant = backingType === 'none' ? 'None' : backingType === 'vouch' ? 'Vouch' : 'Savings'
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant)])
}

/** Build the ScVal args for loan_registry's `apply_loan(borrower, lender, amount, term_days, backing_type, backing_amount)`. */
export function applyLoanArgs(
  borrowerAddress: string,
  lenderAddress: string,
  amountStroops: number | bigint,
  termDays: number,
  backingType: 'none' | 'vouch' | 'savings',
  backingAmountStroops: number | bigint,
): xdr.ScVal[] {
  return [
    new Address(borrowerAddress).toScVal(),
    new Address(lenderAddress).toScVal(),
    nativeToScVal(amountStroops, { type: 'i128' }),
    nativeToScVal(termDays, { type: 'u32' }),
    backingTypeArg(backingType),
    nativeToScVal(backingAmountStroops, { type: 'i128' }),
  ]
}
