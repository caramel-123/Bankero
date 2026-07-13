import { supabase } from '../lib/supabase'
import { recordVerifiedScan } from '../lib/anchorStore'
import type { EpaymentOCRData, EpaymentValidationResult, EpaymentScan } from '../types/epaymentScan'

export async function uploadEpaymentImage(file: File, userId: string): Promise<string> {
  const path = `${userId}/scan_${Date.now()}_${file.name}`
  const { error } = await supabase.storage.from('bankero-epayment-scans').upload(path, file, { upsert: false })
  if (error) throw new Error(`Could not upload the image: ${error.message}`)
  const { data } = supabase.storage.from('bankero-epayment-scans').getPublicUrl(path)
  return data.publicUrl
}

/** OCR runs server-side (api/verify-epayment.ts) so the Anthropic API key never reaches the browser. */
export async function extractEpaymentData(imageUrl: string): Promise<EpaymentOCRData> {
  const res = await fetch('/api/verify-epayment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Could not verify this image. Try again.')
  return data as EpaymentOCRData
}

export async function validateEpaymentScan(data: EpaymentOCRData): Promise<EpaymentValidationResult> {
  const errors: string[] = []

  if (!data.amount || data.amount <= 0) {
    errors.push('Could not read a valid amount from this transaction.')
  }
  if (!data.reference_number) {
    errors.push('No reference number was found on this transaction.')
  } else {
    const { data: existing } = await supabase
      .from('epayment_scans')
      .select('id')
      .eq('extracted_reference', data.reference_number)
      .maybeSingle()
    if (existing) {
      errors.push('This transaction has already been scanned before.')
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

  return { passed: errors.length === 0, errors, data }
}

const MAX_SCAN_BONUS = 20
const BONUS_PER_SCAN = 2

/** Save the scan, and — if it passed — credit a small capped bonus to the anchor/remittance score. */
export async function recordEpaymentScan(
  userId: string,
  stellarAddress: string,
  imageUrl: string,
  validation: EpaymentValidationResult,
): Promise<EpaymentScan> {
  const bonus = validation.passed ? BONUS_PER_SCAN : 0

  const { data: saved, error } = await supabase.from('epayment_scans').insert({
    user_id: userId,
    stellar_address: stellarAddress,
    image_url: imageUrl,
    extracted_amount: validation.data.amount,
    extracted_reference: validation.data.reference_number,
    extracted_date: validation.data.transaction_date,
    extracted_status: validation.data.transaction_status,
    validation_status: validation.passed ? 'passed' : 'failed',
    validation_errors: validation.errors.length > 0 ? validation.errors : null,
    score_bonus_applied: bonus,
  }).select().single()
  if (error) throw new Error(`Could not save this scan: ${error.message}`)

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
