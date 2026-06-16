import { rpc, Address, scValToNative } from '@stellar/stellar-sdk'
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
