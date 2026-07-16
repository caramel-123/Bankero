import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// ── Types ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  auth_user_id: string | null
  wallet_address: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  display_name: string | null
  phone_hash: string | null
  kyc_verified: boolean
  anchor_linked: boolean
  created_at: string
  updated_at: string
}

export interface Lender {
  id: string
  wallet_address: string
  auth_user_id: string | null
  display_name: string
  kyc_verified: boolean
  max_loan_xlm: number
  interest_rate: number
  min_credit_score: number
  contact_email: string | null
  bio: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SupabaseLoan {
  id: string
  borrower_wallet: string
  lender_wallet: string | null
  amount: number
  interest: number
  total: number
  purpose: string | null
  term: number
  notes: string | null
  status: 'Pending' | 'Approved' | 'Disbursed' | 'Repaid' | 'Defaulted' | 'Rejected'
  applied_at: string
  due_at: string | null
  approved_at: string | null
  disbursed_at: string | null
  repaid_at: string | null
  defaulted_at: string | null
  created_at: string
  updated_at: string
  backing_type: 'none' | 'vouch' | 'savings'
  backing_amount: number
  onchain_loan_id: number | null
}

export interface ScoreCache {
  wallet_address: string
  repayment_score: number
  total_loans: number
  loans_repaid: number
  loans_defaulted: number
  last_updated: string
}

export interface Notification {
  id: string
  wallet_address: string
  type: string
  message: string
  is_read: boolean
  created_at: string
}

// ── Borrower / User ────────────────────────────────────────────────────────────

export async function upsertUser(walletAddress: string, displayName?: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      { wallet_address: walletAddress, display_name: displayName ?? null },
      { onConflict: 'wallet_address' }
    )
    .select()
    .single()
  if (error) throw error
  return data as User
}

export async function getUser(walletAddress: string): Promise<User | null> {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle()
  return data as User | null
}

/** Bulk name lookup for a list of wallets (lender loan lists) — wallet_address → display name. */
export async function getBorrowerNames(walletAddresses: string[]): Promise<Record<string, string>> {
  const wallets = [...new Set(walletAddresses)].filter(Boolean)
  if (wallets.length === 0) return {}

  const { data } = await supabase
    .from('users')
    .select('wallet_address, display_name, first_name, last_name')
    .in('wallet_address', wallets)

  const names: Record<string, string> = {}
  for (const row of data ?? []) {
    if (!row.wallet_address) continue
    const name = row.display_name || [row.first_name, row.last_name].filter(Boolean).join(' ')
    if (name) names[row.wallet_address] = name
  }
  return names
}

/**
 * A single person can hold both a `users` (borrower) row and a `lenders` row
 * under the same `auth_user_id`, created independently by different entry
 * points (email/password signup, Google auto-create, lender auto-create on
 * first login). Look up whichever of the two already has a name so the
 * other role can reuse it instead of deriving its own — keeps "name as
 * borrower" and "name as lender" identical for the same person.
 */
async function getExistingCrossRoleName(authUserId: string): Promise<{
  display_name: string | null
  first_name: string | null
  last_name: string | null
} | null> {
  const [{ data: borrowerRow }, { data: lenderRow }] = await Promise.all([
    supabase.from('users').select('display_name, first_name, last_name').eq('auth_user_id', authUserId).maybeSingle(),
    supabase.from('lenders').select('display_name, first_name, last_name').eq('auth_user_id', authUserId).maybeSingle(),
  ])
  const row = borrowerRow ?? lenderRow
  if (!row?.display_name) return null
  return row
}

// ── Borrower Auth ──────────────────────────────────────────────────────────────
// Identity now exists independently of a wallet — a `users` row is created at
// signup (email/password or Google) and a wallet is linked to it later, once
// connected (see useWallet.ts `connect()`).

export async function signInBorrower(email: string, password: string): Promise<User> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) throw new Error(authError.message)

  const userId = authData.user?.id
  if (!userId) throw new Error('Authentication failed')

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (userError) throw new Error(userError.message)
  if (!userData) throw new Error('No account found for this login.')

  return userData as User
}

export async function signUpBorrower(email: string, password: string, displayName: string): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  if (error) throw new Error(error.message)

  const userId = data.user?.id
  if (!userId) return // email confirmation required — profile row is created on first sign-in after confirming

  const [firstName, ...rest] = displayName.trim().split(/\s+/)
  const { error: profileError } = await supabase.from('users').insert({
    auth_user_id: userId,
    email,
    display_name: displayName,
    first_name: firstName || null,
    last_name: rest.join(' ') || null,
  })
  if (profileError) throw new Error(profileError.message)
}

/** Ensure a `users` row exists for the current auth session (covers Google sign-in, which has no explicit signUp step). */
export async function ensureBorrowerProfile(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession()
  const authUser = session?.user
  if (!authUser) return null

  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()
  if (existing) return existing as User

  const crossRole = await getExistingCrossRoleName(authUser.id)
  const meta = authUser.user_metadata ?? {}
  const fullName: string = crossRole?.display_name ?? meta.full_name ?? meta.name ?? ''
  const [firstName, ...rest] = fullName.trim().split(/\s+/)

  const { data: created, error } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUser.id,
      email: authUser.email ?? null,
      display_name: fullName || authUser.email || null,
      first_name: crossRole?.first_name ?? (firstName || null),
      last_name: crossRole?.last_name ?? (rest.join(' ') || null),
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return created as User
}

export async function getCurrentBorrowerSession(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return null

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .maybeSingle()
  return data as User | null
}

export async function signOutBorrower(): Promise<void> {
  await supabase.auth.signOut()
}

/** Link a connected wallet to the currently logged-in borrower's profile row. */
export async function linkWalletToUser(walletAddress: string): Promise<User> {
  const { data: { session } } = await supabase.auth.getSession()
  const authUserId = session?.user?.id
  if (!authUserId) throw new Error('Not logged in')

  const { data, error } = await supabase
    .from('users')
    .update({ wallet_address: walletAddress })
    .eq('auth_user_id', authUserId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as User
}

// ── Lender Auth ────────────────────────────────────────────────────────────────

export async function signInLender(email: string, password: string): Promise<Lender> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) throw new Error(authError.message)

  const userId = authData.user?.id
  if (!userId) throw new Error('Authentication failed')

  // Fetch or create lender profile
  const { data: lenderData, error: lenderError } = await supabase
    .from('lenders')
    .select('*')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (lenderError) throw new Error(lenderError.message)

  if (!lenderData) {
    // First login — create lender profile
    const crossRole = await getExistingCrossRoleName(userId)
    const { data: newLender, error: createError } = await supabase
      .from('lenders')
      .insert({
        auth_user_id: userId,
        wallet_address: `lender_${userId.slice(0, 8)}`,
        display_name: crossRole?.display_name || email.split('@')[0],
        first_name: crossRole?.first_name ?? null,
        last_name: crossRole?.last_name ?? null,
        contact_email: email,
        max_loan_xlm: 200,
        interest_rate: 5,
        min_credit_score: 300,
        is_active: true,
      })
      .select()
      .single()
    if (createError) throw new Error(createError.message)
    return newLender as Lender
  }

  return lenderData as Lender
}

export async function signUpLender(email: string, password: string, displayName: string): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  if (error) throw new Error(error.message)
}

export async function signOutLender(): Promise<void> {
  await supabase.auth.signOut()
}

export async function getCurrentLenderSession(): Promise<Lender | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return null

  const { data } = await supabase
    .from('lenders')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .maybeSingle()
  return data as Lender | null
}

/** Ensure a `lenders` row exists for the current auth session (covers Google sign-in, which has no explicit signUp step). */
export async function ensureLenderProfile(): Promise<Lender | null> {
  const { data: { session } } = await supabase.auth.getSession()
  const authUser = session?.user
  if (!authUser) return null

  const { data: existing } = await supabase
    .from('lenders')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()
  if (existing) return existing as Lender

  const crossRole = await getExistingCrossRoleName(authUser.id)
  const meta = authUser.user_metadata ?? {}
  const fullName: string = crossRole?.display_name ?? meta.full_name ?? meta.name ?? ''

  const { data: created, error } = await supabase
    .from('lenders')
    .insert({
      auth_user_id: authUser.id,
      wallet_address: `lender_${authUser.id.slice(0, 8)}`,
      display_name: fullName || authUser.email?.split('@')[0] || 'Lender',
      first_name: crossRole?.first_name ?? null,
      last_name: crossRole?.last_name ?? null,
      contact_email: authUser.email ?? null,
      max_loan_xlm: 200,
      interest_rate: 5,
      min_credit_score: 300,
      is_active: true,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return created as Lender
}

export async function updateLenderSettings(
  authUserId: string,
  settings: { max_loan_xlm?: number; interest_rate?: number; min_credit_score?: number; display_name?: string; bio?: string }
): Promise<Lender> {
  const { data, error } = await supabase
    .from('lenders')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('auth_user_id', authUserId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Lender
}

// ── Loans ──────────────────────────────────────────────────────────────────────

export async function saveLoanToSupabase(loan: {
  id: string
  borrower_wallet: string
  amount: number
  interest: number
  total: number
  purpose: string
  term: number
  notes: string
  status: SupabaseLoan['status']
  applied_at: string
  backing_type: SupabaseLoan['backing_type']
  backing_amount: number
}): Promise<SupabaseLoan> {
  const { data, error } = await supabase
    .from('loans')
    .upsert(loan, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as SupabaseLoan
}

/** Record the on-chain loan_registry loan_id once a savings-backed loan's real apply_loan call succeeds. */
export async function setOnchainLoanId(id: string, onchainLoanId: number): Promise<void> {
  const { error } = await supabase
    .from('loans')
    .update({ onchain_loan_id: onchainLoanId })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateLoanStatusInSupabase(
  id: string,
  status: SupabaseLoan['status'],
  extra?: { lender_wallet?: string; due_at?: string }
): Promise<void> {
  const now = new Date().toISOString()
  const timestamps: Record<string, string> = {}
  if (status === 'Approved')  timestamps.approved_at  = now
  if (status === 'Disbursed') { timestamps.disbursed_at = now }
  if (status === 'Repaid')    timestamps.repaid_at    = now
  if (status === 'Defaulted') timestamps.defaulted_at  = now

  const { error } = await supabase
    .from('loans')
    .update({ status, ...timestamps, ...(extra ?? {}), updated_at: now })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getLoansFromSupabase(borrowerWallet: string): Promise<SupabaseLoan[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('borrower_wallet', borrowerWallet)
    .order('applied_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as SupabaseLoan[]
}

/** Cancel/remove a loan the borrower no longer wants — DB policy only allows this while Pending/Approved (not yet disbursed). */
export async function deleteLoanFromSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('loans').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getAllLoansFromSupabase(): Promise<SupabaseLoan[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('applied_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as SupabaseLoan[]
}

// ── Score Cache ────────────────────────────────────────────────────────────────

export async function upsertScoreCache(cache: ScoreCache): Promise<void> {
  const { error } = await supabase
    .from('score_cache')
    .upsert(cache, { onConflict: 'wallet_address' })
  if (error) console.warn('score_cache upsert failed:', error.message)
}

export async function getScoreCacheFromSupabase(wallet: string): Promise<ScoreCache | null> {
  const { data } = await supabase
    .from('score_cache')
    .select('*')
    .eq('wallet_address', wallet)
    .maybeSingle()
  return data as ScoreCache | null
}

// ── Notifications ──────────────────────────────────────────────────────────────

export async function getNotifications(walletAddress: string): Promise<Notification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    .limit(20)
  return (data ?? []) as Notification[]
}

export async function createNotification(
  walletAddress: string,
  type: Notification['type'],
  message: string
): Promise<void> {
  await supabase.from('notifications').insert({ wallet_address: walletAddress, type, message })
}

// ── Lenders list ───────────────────────────────────────────────────────────────

export async function getLenders(): Promise<Lender[]> {
  const { data } = await supabase
    .from('lenders')
    .select('*')
    .eq('is_active', true)
    .order('display_name')
  return (data ?? []) as Lender[]
}
