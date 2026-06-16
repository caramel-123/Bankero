// Local anchor/payment account store
// Linking = initial score boost + ongoing transaction tracking

export interface LinkedAccount {
  id: string
  name: string
  accountRef: string
  linkedAt: string
  scoreBoost: number    // base pts for linking
  txCount: number       // total synced transactions
  lastSynced: string | null
}

const KEY = 'bankero_anchors'
const TX_KEY = 'bankero_anchor_txs'

// ── Account CRUD ───────────────────────────────────────────

export function getLinkedAccounts(wallet: string): LinkedAccount[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return (all[wallet] ?? []).map((a: LinkedAccount) => ({
      ...a,
      txCount: a.txCount ?? 0,
      lastSynced: a.lastSynced ?? null,
    }))
  } catch { return [] }
}

export function linkAccount(wallet: string, account: LinkedAccount): void {
  const all = JSON.parse(localStorage.getItem(KEY) ?? '{}')
  const existing: LinkedAccount[] = all[wallet] ?? []
  const idx = existing.findIndex(a => a.id === account.id)
  if (idx >= 0) existing[idx] = account
  else existing.push(account)
  all[wallet] = existing
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function unlinkAccount(wallet: string, providerId: string): void {
  const all = JSON.parse(localStorage.getItem(KEY) ?? '{}')
  all[wallet] = (all[wallet] ?? []).filter((a: LinkedAccount) => a.id !== providerId)
  localStorage.setItem(KEY, JSON.stringify(all))
}

// ── Transaction sync ───────────────────────────────────────
// Each sync "fetches" 3–8 recent transactions from the linked account.
// Each transaction adds 2 pts to anchor_score (capped per account at 30 bonus pts = 15 txns).
// This simulates: every purchase/payment via GCash/Maya = real data footprint.

export interface AnchorTx {
  id: string
  provider: string    // provider id
  amount: number      // ₱ amount
  merchant: string
  type: 'purchase' | 'send' | 'receive' | 'bills'
  date: string        // ISO
}

const MERCHANTS = [
  { name: 'Jollibee', type: 'purchase' as const },
  { name: 'SM Supermarket', type: 'purchase' as const },
  { name: 'Lazada', type: 'purchase' as const },
  { name: 'Shopee', type: 'purchase' as const },
  { name: 'Meralco Bill', type: 'bills' as const },
  { name: 'PLDT Home', type: 'bills' as const },
  { name: 'Mercury Drug', type: 'purchase' as const },
  { name: 'Grab Food', type: 'purchase' as const },
  { name: 'Palengke', type: 'purchase' as const },
  { name: 'Load / Airtime', type: 'purchase' as const },
  { name: 'Family Padala', type: 'send' as const },
  { name: 'Water Bill', type: 'bills' as const },
]

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function syncTransactions(wallet: string, providerId: string): AnchorTx[] {
  const all = JSON.parse(localStorage.getItem(KEY) ?? '{}')
  const accounts: LinkedAccount[] = all[wallet] ?? []
  const acc = accounts.find(a => a.id === providerId)
  if (!acc) return []

  // Generate 3–8 new transactions
  const count = randomBetween(3, 8)
  const newTxs: AnchorTx[] = Array.from({ length: count }, (_, i) => {
    const m = MERCHANTS[randomBetween(0, MERCHANTS.length - 1)]
    const daysAgo = randomBetween(0, 30)
    const d = new Date()
    d.setDate(d.getDate() - daysAgo - i)
    return {
      id: crypto.randomUUID(),
      provider: providerId,
      amount: randomBetween(50, 2500),
      merchant: m.name,
      type: m.type,
      date: d.toISOString(),
    }
  })

  // Save txs
  const txAll = JSON.parse(localStorage.getItem(TX_KEY) ?? '{}')
  const prev: AnchorTx[] = txAll[wallet] ?? []
  txAll[wallet] = [...newTxs, ...prev].slice(0, 200) // cap at 200
  localStorage.setItem(TX_KEY, JSON.stringify(txAll))

  // Update account txCount + lastSynced
  acc.txCount = (acc.txCount ?? 0) + count
  acc.lastSynced = new Date().toISOString()
  all[wallet] = accounts
  localStorage.setItem(KEY, JSON.stringify(all))

  return newTxs
}

export function getAnchorTxs(wallet: string): AnchorTx[] {
  try {
    const all = JSON.parse(localStorage.getItem(TX_KEY) ?? '{}')
    return all[wallet] ?? []
  } catch { return [] }
}

// ── Score computation ──────────────────────────────────────
// anchor_score = linking bonus + transaction activity bonus (capped at 100)
// Linking a GCash: +30 pts base
// Every 2 transactions synced: +1 pt bonus (up to +30 bonus per account)
// So: linking + actively using it = up to 60 pts per account, but total capped at 100

export function computeAnchorScore(wallet: string): number {
  const accounts = getLinkedAccounts(wallet)
  const total = accounts.reduce((sum, a) => {
    const linkPts = a.scoreBoost
    const txBonus = Math.min(30, Math.floor((a.txCount ?? 0) / 2))
    return sum + linkPts + txBonus
  }, 0)
  return Math.min(100, total)
}

// Payment providers
export interface PaymentProvider {
  id: string
  name: string
  category: string
  color: string
  scoreBoost: number
  placeholder: string
}

export const PROVIDERS: PaymentProvider[] = [
  { id: 'gcash',     name: 'GCash',      category: 'E-Wallet',     color: '#007DFF', scoreBoost: 30, placeholder: '09XX XXX XXXX' },
  { id: 'maya',      name: 'Maya',        category: 'E-Wallet',     color: '#00BFA5', scoreBoost: 28, placeholder: '09XX XXX XXXX' },
  { id: 'shopepay',  name: 'ShopeePay',  category: 'E-Wallet',     color: '#EE4D2D', scoreBoost: 20, placeholder: '09XX XXX XXXX' },
  { id: 'coins',     name: 'Coins.ph',   category: 'Crypto+Fiat',  color: '#F0A500', scoreBoost: 22, placeholder: '09XX XXX XXXX' },
  { id: 'grabpay',   name: 'GrabPay',    category: 'E-Wallet',     color: '#00B14F', scoreBoost: 18, placeholder: '09XX XXX XXXX' },
  { id: 'instapay',  name: 'InstaPay',   category: 'Bank Transfer', color: '#1A237E', scoreBoost: 25, placeholder: 'Bank account no.' },
  { id: 'unionbank', name: 'UnionBank',  category: 'Bank',         color: '#E31837', scoreBoost: 20, placeholder: 'Account number' },
  { id: 'bdo',       name: 'BDO',        category: 'Bank',         color: '#003087', scoreBoost: 20, placeholder: 'Account number' },
]
