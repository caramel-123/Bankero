import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from '@stellar/freighter-api'
import {
  Networks,
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  Memo,
  BASE_FEE,
} from '@stellar/stellar-sdk'

export const NETWORK = import.meta.env.VITE_STELLAR_NETWORK === 'testnet' ? Networks.TESTNET : Networks.PUBLIC
export const RPC_URL = import.meta.env.VITE_SOROBAN_RPC as string

export const CONTRACT_IDS = {
  creditScore: import.meta.env.VITE_CREDIT_SCORE_CONTRACT_ID as string,
  loanRegistry: import.meta.env.VITE_LOAN_REGISTRY_CONTRACT_ID as string,
  vouching:     import.meta.env.VITE_VOUCHING_CONTRACT_ID as string,
}

// ── Freighter wallet helpers ───────────────────────────────

export async function checkFreighterInstalled(): Promise<boolean> {
  try {
    const result = await isConnected()
    return result.isConnected === true
  } catch {
    return false
  }
}

export async function connectWallet(): Promise<string> {
  // requestAccess() does everything: checks if installed, shows popup, returns address
  let result: { address: string; error?: { message?: string } | string }
  try {
    result = await requestAccess()
  } catch (e: any) {
    // Extension not installed — no API to respond
    throw new Error('FREIGHTER_NOT_INSTALLED')
  }

  if (result.error) {
    const msg = typeof result.error === 'string'
      ? result.error
      : (result.error as any).message ?? 'Connection rejected'
    if (msg.toLowerCase().includes('not installed') || msg.toLowerCase().includes('not found')) {
      throw new Error('FREIGHTER_NOT_INSTALLED')
    }
    throw new Error(msg)
  }

  if (!result.address) {
    throw new Error('FREIGHTER_NOT_INSTALLED')
  }

  return result.address
}

export async function getWalletPublicKey(): Promise<string | null> {
  try {
    const result = await getAddress()
    if (result.error || !result.address) return null
    return result.address
  } catch {
    return null
  }
}

// ── Score tier ladder (full progression) ─────────────────
export interface ScoreTierDef {
  min: number
  max: number
  label: string
  color: string
  loanMax: number       // max loan in ₱
  interest: number      // flat interest rate %
  desc: string
}

export const SCORE_TIERS: ScoreTierDef[] = [
  { min: 300, max: 449, label: 'Starting Out', color: '#DC2626', loanMax:   500, interest: 8,   desc: 'Build history by repaying your first small loan' },
  { min: 450, max: 549, label: 'Fair',          color: '#EA580C', loanMax:  1500, interest: 7,   desc: 'Consistent repayments push you here' },
  { min: 550, max: 649, label: 'Developing',    color: '#D97706', loanMax:  3000, interest: 6,   desc: 'Community vouches and linked accounts help' },
  { min: 650, max: 749, label: 'Good',          color: '#65A30D', loanMax:  7500, interest: 5,   desc: 'Strong repayment record, active wallet' },
  { min: 750, max: 799, label: 'Trusted',       color: '#16A34A', loanMax: 15000, interest: 4.5, desc: 'Multiple on-time repayments, vouches received' },
  { min: 800, max: 849, label: 'Excellent',     color: '#0D9488', loanMax: 25000, interest: 4,   desc: 'Sustained excellence in all score factors' },
  { min: 850, max: 850, label: 'Elite',         color: '#6366F1', loanMax: 50000, interest: 3.5, desc: 'Perfect score — maximum borrowing power' },
]

export function scoreTier(score: number): { label: string; color: string; max: number; interest: number } {
  const t = [...SCORE_TIERS].reverse().find(t => score >= t.min) ?? SCORE_TIERS[0]
  return { label: t.label, color: t.color, max: t.loanMax, interest: t.interest }
}

export function nextScoreTier(score: number): ScoreTierDef | null {
  return SCORE_TIERS.find(t => t.min > score) ?? null
}

export function scorePercent(score: number): number {
  return Math.round(((score - 300) / 550) * 100)
}

export function formatWallet(address: string): string {
  if (!address || address.length < 12) return address
  return address.slice(0, 6) + '…' + address.slice(-6)
}

export function formatXLM(stroops: number): string {
  return (stroops / 10_000_000).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' XLM'
}

export function formatPeso(amount: number): string {
  return '₱' + amount.toLocaleString('en-PH')
}

const NETWORK_SLUG = import.meta.env.VITE_STELLAR_NETWORK === 'testnet' ? 'testnet' : 'public'

export function stellarExplorerUrl(address: string, type: 'account' | 'contract' = 'account'): string {
  return `https://stellar.expert/explorer/${NETWORK_SLUG}/${type}/${address}`
}

// ── XLM / Peso conversion (testnet: 1 XLM = ₱100) ────────
export const XLM_PER_PESO = 0.01       // 1 ₱ = 0.01 XLM  →  ₱500 = 5 XLM
export function pesoToXlm(peso: number): string {
  return (peso * XLM_PER_PESO).toFixed(7)
}

const HORIZON_URL = import.meta.env.VITE_STELLAR_NETWORK === 'testnet'
  ? 'https://horizon-testnet.stellar.org'
  : 'https://horizon.stellar.org'

/**
 * Send XLM from lender (Freighter) to borrower as loan disbursement.
 * Returns the transaction hash on success.
 */
export async function disburseXlmPayment(opts: {
  lenderAddress: string
  borrowerAddress: string
  pesoAmount: number
  loanId: string
}): Promise<string> {
  const { lenderAddress, borrowerAddress, pesoAmount, loanId } = opts
  const xlmAmount = pesoToXlm(pesoAmount)
  const server = new Horizon.Server(HORIZON_URL)

  // Load lender's account sequence number
  const account = await server.loadAccount(lenderAddress)

  // Build the payment transaction
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(Operation.payment({
      destination: borrowerAddress,
      asset: Asset.native(),
      amount: xlmAmount,
    }))
    .addMemo(Memo.text(`BNK:${loanId.slice(0, 23)}`))
    .setTimeout(300)
    .build()

  // Ask Freighter to sign
  const xdr = tx.toXDR()
  const signResult = await signTransaction(xdr, {
    networkPassphrase: NETWORK,
    address: lenderAddress,
  })

  if (signResult.error) {
    throw new Error(typeof signResult.error === 'string' ? signResult.error : 'Signing rejected')
  }
  if (!signResult.signedTxXdr) {
    throw new Error('Signing cancelled')
  }

  // Submit to Horizon
  const { TransactionBuilder: TB } = await import('@stellar/stellar-sdk')
  const signedTx = TB.fromXDR(signResult.signedTxXdr, NETWORK)
  const result = await server.submitTransaction(signedTx)
  return result.hash
}

