import { supabase } from '../lib/supabase'
import type { SavingsStreak, WeeklyDeposit, HorizonPayment, DepositCheckResult } from '../types/savings'

const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org'
const MIN_DEPOSIT_XLM = 1

export function getCurrentWeekIdentifier(date: Date = new Date()): string {
  // ISO week: Monday-based
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-${String(week).padStart(2, '0')}`
}

export function getWeekBounds(weekIdentifier: string): { start: Date; end: Date } {
  const [year, week] = weekIdentifier.split('-').map(Number)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1)
  const start = new Date(startOfWeek1)
  start.setUTCDate(startOfWeek1.getUTCDate() + (week - 1) * 7)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  end.setUTCHours(23, 59, 59, 999)
  return { start, end }
}

export async function fetchWalletDeposits(
  stellarAddress: string,
  since: Date,
): Promise<HorizonPayment[]> {
  const cursor = since.toISOString()
  const url = `${HORIZON_TESTNET}/accounts/${stellarAddress}/payments?order=desc&limit=50&cursor=`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Hindi ma-load ang Stellar transaction history.')
  const json = await res.json()
  const records: HorizonPayment[] = (json._embedded?.records ?? [])
    .filter((r: HorizonPayment) =>
      r.type === 'payment' &&
      r.to === stellarAddress &&
      parseFloat(r.amount) >= MIN_DEPOSIT_XLM &&
      (r.asset_type === 'native') &&
      new Date(r.created_at) >= new Date(cursor),
    )
  return records
}

export async function detectQualifyingDeposit(
  stellarAddress: string,
  weekIdentifier: string,
): Promise<DepositCheckResult> {
  const { start, end } = getWeekBounds(weekIdentifier)
  const payments = await fetchWalletDeposits(stellarAddress, start)
  const deposit = payments.find(p => {
    const ts = new Date(p.created_at)
    return ts >= start && ts <= end
  }) ?? null
  return { found: !!deposit, deposit, weekIdentifier }
}

export async function updateSavingsStreak(userId: string, stellarAddress: string): Promise<SavingsStreak> {
  const currentWeek = getCurrentWeekIdentifier()

  // Check if already recorded this week
  const { data: existingDeposit } = await supabase
    .from('weekly_deposits')
    .select('*')
    .eq('user_id', userId)
    .eq('week_identifier', currentWeek)
    .maybeSingle() as { data: WeeklyDeposit | null }

  const { data: streakRow } = await supabase
    .from('savings_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle() as { data: SavingsStreak | null }

  const result = await detectQualifyingDeposit(stellarAddress, currentWeek)

  if (!result.found || !result.deposit) {
    // Check if streak should break (last deposit was not last week)
    if (streakRow?.last_deposit_week) {
      const [ly, lw] = streakRow.last_deposit_week.split('-').map(Number)
      const [cy, cw] = currentWeek.split('-').map(Number)
      const weeksDiff = (cy - ly) * 52 + (cw - lw)
      if (weeksDiff > 1 && streakRow.current_streak > 0) {
        const { data: updated } = await supabase
          .from('savings_streaks')
          .upsert({ user_id: userId, stellar_address: stellarAddress, current_streak: 0, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
          .select()
          .single()
        return updated as SavingsStreak
      }
    }
    return streakRow ?? { user_id: userId, stellar_address: stellarAddress, current_streak: 0, longest_streak: 0, total_bonus_earned: 0 } as SavingsStreak
  }

  if (existingDeposit) return streakRow!

  const newStreak = (streakRow?.current_streak ?? 0) + 1
  const longestStreak = Math.max(newStreak, streakRow?.longest_streak ?? 0)
  const previousBonus = streakRow?.total_bonus_earned ?? 0

  // Award bonus every 4-week cycle, max +30 total
  let bonusDelta = 0
  if (newStreak % 4 === 0 && previousBonus < 30) {
    bonusDelta = Math.min(10, 30 - previousBonus)
  }

  const totalBonus = previousBonus + bonusDelta

  const { data: updated } = await supabase
    .from('savings_streaks')
    .upsert({
      user_id: userId,
      stellar_address: stellarAddress,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_deposit_week: currentWeek,
      last_deposit_amount: parseFloat(result.deposit.amount),
      last_deposit_tx_hash: result.deposit.transaction_hash,
      total_bonus_earned: totalBonus,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  await supabase.from('weekly_deposits').insert({
    user_id: userId,
    stellar_address: stellarAddress,
    week_identifier: currentWeek,
    deposit_amount: parseFloat(result.deposit.amount),
    tx_hash: result.deposit.transaction_hash,
    deposited_at: result.deposit.created_at,
    streak_count_at_deposit: newStreak,
    bonus_awarded: bonusDelta,
  })

  if (bonusDelta > 0) {
    await awardSavingsBonus(userId, bonusDelta)
  }

  return updated as SavingsStreak
}

export async function awardSavingsBonus(userId: string, bonusAmount: number): Promise<void> {
  const { data: cache } = await supabase
    .from('score_cache')
    .select('*')
    .eq('wallet_address', userId)
    .maybeSingle()

  await supabase.from('score_cache').upsert({
    wallet_address: userId,
    tx_score: Math.min(100, (cache?.tx_score ?? 0) + bonusAmount),
    last_updated: new Date().toISOString(),
  }, { onConflict: 'wallet_address' })
}

export async function getSavingsStreak(userId: string): Promise<SavingsStreak | null> {
  const { data } = await supabase
    .from('savings_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data as SavingsStreak | null
}

export async function getWeeklyDeposits(userId: string, limit = 12): Promise<WeeklyDeposit[]> {
  const { data } = await supabase
    .from('weekly_deposits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as WeeklyDeposit[]
}
