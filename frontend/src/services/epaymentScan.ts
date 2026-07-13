import { supabase } from '../lib/supabase'
import { recordVerifiedScan } from '../lib/anchorStore'
import type { EpaymentOCRData, EpaymentValidationResult, EpaymentScan } from '../types/epaymentScan'

/** SHA-256 of the raw image bytes — catches the exact same screenshot being resubmitted even if OCR reads a different (or no) reference number each time. */
export async function hashEpaymentImage(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Check for an exact re-upload before spending an OCR call or storage
 * write on it. Returns the original scan's extracted fields (read back
 * from what was saved the first time) so the UI can show the user
 * exactly which past submission they're duplicating.
 */
export async function findDuplicateImage(imageHash: string): Promise<EpaymentValidationResult | null> {
  const { data: existing } = await supabase
    .from('epayment_scans')
    .select('extracted_amount, extracted_reference, extracted_date, extracted_status')
    .eq('image_hash', imageHash)
    .maybeSingle()
  if (!existing) return null

  return {
    passed: false,
    errors: ['This exact receipt image has already been submitted.'],
    isDuplicate: true,
    data: {
      provider: null,
      amount: existing.extracted_amount,
      reference_number: existing.extracted_reference,
      transaction_date: existing.extracted_date,
      transaction_status: existing.extracted_status,
    },
  }
}

export async function uploadEpaymentImage(file: File, userId: string): Promise<string> {
  const path = `${userId}/scan_${Date.now()}_${file.name}`
  const { error } = await supabase.storage.from('bankero-epayment-scans').upload(path, file, { upsert: false })
  if (error) throw new Error(`Could not upload the image: ${error.message}`)
  const { data } = supabase.storage.from('bankero-epayment-scans').getPublicUrl(path)
  return data.publicUrl
}

/** OCR runs server-side (api/verify-epayment.ts) so the Ollama API key never reaches the browser. */
export async function extractEpaymentData(imageUrl: string): Promise<EpaymentOCRData> {
  const res = await fetch('/api/verify-epayment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  })
  let data: { error?: string } & Partial<EpaymentOCRData>
  try {
    data = await res.json()
  } catch {
    // Empty/non-JSON body — usually the AI verifier timed out server-side.
    throw new Error('Verification took too long and timed out. Please try again.')
  }
  if (!res.ok) throw new Error(data.error || 'Could not verify this image. Try again.')
  return data as EpaymentOCRData
}

export async function validateEpaymentScan(data: EpaymentOCRData, imageHash: string): Promise<EpaymentValidationResult> {
  const errors: string[] = []

  if (!data.amount || data.amount <= 0) {
    errors.push('Could not read a valid amount from this transaction.')
  }

  let isDuplicate = false

  const { data: sameImage } = await supabase
    .from('epayment_scans')
    .select('id')
    .eq('image_hash', imageHash)
    .maybeSingle()
  if (sameImage) {
    errors.push('This exact receipt image has already been submitted.')
    isDuplicate = true
  }

  if (!data.reference_number) {
    errors.push('No reference number was found on this transaction.')
  } else if (!sameImage) {
    const { data: existing } = await supabase
      .from('epayment_scans')
      .select('id')
      .eq('extracted_reference', data.reference_number)
      .maybeSingle()
    if (existing) {
      errors.push('This transaction has already been scanned before.')
      isDuplicate = true
    }
  }
  if (data.transaction_status) {
    const status = data.transaction_status.toLowerCase()
    if (!status.includes('success') && !status.includes('completed') && !status.includes('matagumpay')) {
      errors.push('This transaction does not appear to be successful.')
    }
  } else {
    errors.push('Could not read the transaction status.')
  }

  return { passed: errors.length === 0, errors, data, isDuplicate }
}

const MAX_SCAN_BONUS = 20
const BONUS_PER_SCAN = 2

/** Save the scan, and — if it passed — credit a small capped bonus to the anchor/remittance score. */
export async function recordEpaymentScan(
  userId: string,
  stellarAddress: string,
  imageUrl: string,
  imageHash: string,
  validation: EpaymentValidationResult,
): Promise<EpaymentScan> {
  const bonus = validation.passed ? BONUS_PER_SCAN : 0

  const { data: saved, error } = await supabase.from('epayment_scans').insert({
    user_id: userId,
    stellar_address: stellarAddress,
    image_url: imageUrl,
    image_hash: imageHash,
    extracted_amount: validation.data.amount,
    extracted_reference: validation.data.reference_number,
    extracted_date: validation.data.transaction_date,
    extracted_status: validation.data.transaction_status,
    validation_status: validation.passed ? 'passed' : 'failed',
    validation_errors: validation.errors.length > 0 ? validation.errors : null,
    score_bonus_applied: bonus,
  }).select().single()
  if (error) {
    // 23505 = unique_violation — the DB-level backstop for image_hash/
    // extracted_reference caught a duplicate that raced past the
    // check in validateEpaymentScan. Match on the message text too in
    // case a client/proxy layer doesn't surface `code` — never let the
    // raw Postgres constraint text reach the UI.
    if (error.code === '23505' || error.message.includes('duplicate key value')) {
      throw new Error('This receipt has already been submitted.')
    }
    throw new Error('Could not save this scan. Please try again.')
  }

  if (validation.passed) recordVerifiedScan(stellarAddress)

  return saved as EpaymentScan
}

export async function getEpaymentScans(userId: string, limit = 20): Promise<EpaymentScan[]> {
  const { data } = await supabase
    .from('epayment_scans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as EpaymentScan[]
}

export { MAX_SCAN_BONUS }
