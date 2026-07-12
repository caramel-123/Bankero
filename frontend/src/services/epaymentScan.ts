import { supabase } from '../lib/supabase'
import { recordVerifiedScan } from '../lib/anchorStore'
import type { EpaymentOCRData, EpaymentValidationResult, EpaymentScan } from '../types/epaymentScan'

const OLLAMA_URL = (import.meta.env.VITE_OLLAMA_URL as string) || 'http://localhost:11434'
const OLLAMA_MODEL = (import.meta.env.VITE_OLLAMA_MODEL as string) || 'llava'

const EPAYMENT_PROMPT = `Extract the following fields from this e-wallet (GCash, Maya, ShopeePay, etc.) transaction screenshot and return ONLY a JSON object with no explanation:
{
  "provider": "",
  "amount": 0,
  "reference_number": "",
  "transaction_date": "YYYY-MM-DD",
  "transaction_status": ""
}
If a field cannot be read clearly, set it to null. Do not guess.`

async function imageUrlToBase64(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error('Could not load the image.')
  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

async function callOllamaVision(imageUrl: string, prompt: string): Promise<string> {
  const base64 = await imageUrlToBase64(imageUrl)
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt, images: [base64], stream: false }),
  })
  if (!res.ok) throw new Error('Could not reach the AI verifier. Make sure Ollama is installed and running.')
  const data = await res.json() as { response: string }
  const match = data.response.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('The AI could not read this image. Try a clearer screenshot.')
  return match[0]
}

export async function uploadEpaymentImage(file: File, userId: string): Promise<string> {
  const path = `${userId}/scan_${Date.now()}_${file.name}`
  const { error } = await supabase.storage.from('bankero-epayment-scans').upload(path, file, { upsert: false })
  if (error) throw new Error(`Could not upload the image: ${error.message}`)
  const { data } = supabase.storage.from('bankero-epayment-scans').getPublicUrl(path)
  return data.publicUrl
}

export async function extractEpaymentData(imageUrl: string): Promise<EpaymentOCRData> {
  const raw = await callOllamaVision(imageUrl, EPAYMENT_PROMPT)
  return JSON.parse(raw) as EpaymentOCRData
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
