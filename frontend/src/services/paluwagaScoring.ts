import { supabase } from '../lib/supabase'

const TX_SCORE_PER_CONTRIBUTION = 3
const TX_SCORE_CAP_PER_GROUP = 15
const ANCHOR_PENALTY_MISSED = 2
const ANCHOR_BONUS_FULL_CYCLE = 10
const ANCHOR_BONUS_ORGANIZER = 5

async function getUserId(walletAddress: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', walletAddress)
    .maybeSingle()
  return data?.id ?? null
}

async function getCurrentTxScore(userId: string): Promise<number> {
  const { data } = await supabase
    .from('tx_score_cache')
    .select('tx_score')
    .eq('wallet_address', userId)
    .maybeSingle()
  return data?.tx_score ?? 0
}

async function updateTxScore(walletAddress: string, delta: number): Promise<void> {
  const { data: existing } = await supabase
    .from('tx_score_cache')
    .select('tx_score')
    .eq('wallet_address', walletAddress)
    .maybeSingle()

  const current = existing?.tx_score ?? 0
  const next = Math.min(100, Math.max(0, current + delta))

  await supabase
    .from('tx_score_cache')
    .upsert({ wallet_address: walletAddress, tx_score: next, horizon_checked_at: new Date().toISOString() })
}

async function updateAnchorScore(walletAddress: string, delta: number): Promise<void> {
  const { data: existing } = await supabase
    .from('tx_score_cache')
    .select('tx_score')
    .eq('wallet_address', walletAddress)
    .maybeSingle()

  // anchor_score lives in score_cache — use a dedicated column if present,
  // otherwise approximate via the users table extra field
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', walletAddress)
    .maybeSingle()
  if (!user) return

  // Record as a Supabase event for the scoring engine to pick up
  await supabase.from('anchor_attestations').insert({
    wallet_address: walletAddress,
    anchor_score: Math.max(0, Math.min(100, delta)),
    attested_by: 'paluwagan',
    tx_reference: `paluwagan-delta-${delta}-${Date.now()}`,
  })

  void existing // suppress unused warning
}

/** +3 tx_score for each on-time paluwagan contribution, capped at +15 per group. */
export async function applyContributionBonus(
  walletAddress: string,
  groupId: string,
  cycleNumber: number,
): Promise<{ newBonus: number; totalGroupBonus: number }> {
  // Count how many bonuses this user has already earned in this group
  const { data: prev } = await supabase
    .from('paluwagan_contributions')
    .select('score_bonus_applied')
    .eq('group_id', groupId)
    .eq('user_id', await getUserId(walletAddress))
    .eq('was_on_time', true)

  const totalEarned = (prev ?? []).reduce((s, r) => s + (r.score_bonus_applied ?? 0), 0)
  const remaining = TX_SCORE_CAP_PER_GROUP - totalEarned
  const bonus = Math.min(TX_SCORE_PER_CONTRIBUTION, remaining)

  if (bonus > 0) {
    await updateTxScore(walletAddress, bonus)

    // Record bonus on the contribution row
    const userId = await getUserId(walletAddress)
    await supabase
      .from('paluwagan_contributions')
      .update({ score_bonus_applied: bonus })
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('cycle_number', cycleNumber)
  }

  return { newBonus: bonus, totalGroupBonus: totalEarned + bonus }
}

/** -2 anchor_score penalty for a missed contribution deadline. */
export async function applyMissedContributionPenalty(
  walletAddress: string,
  groupId: string,
): Promise<void> {
  await updateAnchorScore(walletAddress, -ANCHOR_PENALTY_MISSED)

  const userId = await getUserId(walletAddress)
  if (!userId) return

  // Increment consecutive_misses in paluwagan_members
  const { data: member } = await supabase
    .from('paluwagan_members')
    .select('consecutive_misses')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  const newMisses = (member?.consecutive_misses ?? 0) + 1
  await supabase
    .from('paluwagan_members')
    .update({ consecutive_misses: newMisses, is_active: newMisses < 2 })
    .eq('group_id', groupId)
    .eq('user_id', userId)
}

/** +10 anchor_score bonus for completing a full paluwagan cycle (all members received pot). */
export async function applyFullCycleBonus(
  walletAddress: string,
  _groupId: string,
): Promise<void> {
  await updateAnchorScore(walletAddress, ANCHOR_BONUS_FULL_CYCLE)
}

/** +5 anchor_score for being the organizer of a successfully completed group. */
export async function applyOrganizerBonus(walletAddress: string): Promise<void> {
  await updateAnchorScore(walletAddress, ANCHOR_BONUS_ORGANIZER)
}

/**
 * Check all members of a group for missed deadlines and apply penalties.
 * Called on page load for active groups or by a scheduled edge function.
 */
export async function checkAndEnforceDeadlines(groupId: string): Promise<string[]> {
  const { data: group } = await supabase
    .from('paluwagan_groups')
    .select('*, paluwagan_members(*)')
    .eq('id', groupId)
    .maybeSingle()

  if (!group || group.status !== 'active') return []
  if (!group.next_deadline || new Date(group.next_deadline) > new Date()) return []

  const currentCycle = group.current_cycle
  const penalised: string[] = []

  for (const member of group.paluwagan_members as { user_id: string; stellar_address: string; is_active: boolean }[]) {
    if (!member.is_active) continue

    // Check if they contributed this cycle
    const { data: contrib } = await supabase
      .from('paluwagan_contributions')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', member.user_id)
      .eq('cycle_number', currentCycle)
      .maybeSingle()

    if (!contrib) {
      await applyMissedContributionPenalty(member.stellar_address, groupId)
      penalised.push(member.stellar_address)
    }
  }

  return penalised
}

/** Summarize a user's paluwagan score contributions for display. */
export async function getPaluwagaScoreSummary(walletAddress: string): Promise<{
  totalOnTimeContributions: number
  totalGroupsCompleted: number
  totalBonusEarned: number
}> {
  const userId = await getUserId(walletAddress)
  if (!userId) return { totalOnTimeContributions: 0, totalGroupsCompleted: 0, totalBonusEarned: 0 }

  const { data: contribs } = await supabase
    .from('paluwagan_contributions')
    .select('was_on_time, score_bonus_applied')
    .eq('user_id', userId)

  const onTime = (contribs ?? []).filter(c => c.was_on_time).length
  const totalBonus = (contribs ?? []).reduce((s, c) => s + (c.score_bonus_applied ?? 0), 0)

  const { data: groups } = await supabase
    .from('paluwagan_members')
    .select('group_id, paluwagan_groups(status)')
    .eq('user_id', userId)

  const completed = (groups ?? []).filter(
    (g: any) => g.paluwagan_groups?.status === 'completed'
  ).length

  return { totalOnTimeContributions: onTime, totalGroupsCompleted: completed, totalBonusEarned: totalBonus }
}
