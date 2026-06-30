import { supabase } from '../lib/supabase'
import type {
  BillOCRData, ReceiptOCRData, ValidationResult,
  UtilityAccount, POPStreak,
} from '../types/pop'

const OLLAMA_URL = (import.meta.env.VITE_OLLAMA_URL as string) || 'http://localhost:11434'
const OLLAMA_MODEL = (import.meta.env.VITE_OLLAMA_MODEL as string) || 'llava'

const BILL_PROMPT = `Extract the following fields from this Philippine utility bill image and return ONLY a JSON object with no explanation:
{
  "account_name": "",
  "account_number": "",
  "billing_period": "MM/YYYY",
  "amount_due": 0,
  "due_date": "YYYY-MM-DD",
  "biller_name": "",
  "service_address": ""
}
If a field cannot be read clearly, set it to null. Do not guess.`

const RECEIPT_PROMPT = `Extract the following fields from this GCash or Maya payment receipt image and return ONLY a JSON object with no explanation:
{
  "mobile_number": "",
  "biller_name": "",
  "subscriber_account_number": "",
  "amount_paid": 0,
  "transaction_date": "YYYY-MM-DD",
  "reference_number": "",
  "transaction_status": "",
  "transaction_type": ""
}
If a field cannot be read clearly, set it to null. Do not guess.`

export async function uploadDocuments(
  billFile: File,
  receiptFile: File,
  userId: string,
): Promise<{ billUrl: string; receiptUrl: string }> {
  const ts = Date.now()

  const billPath = `${userId}/bill_${ts}_${billFile.name}`
  const { error: billError } = await supabase.storage
    .from('bankero-pop-documents')
    .upload(billPath, billFile, { upsert: false })
  if (billError) throw new Error(`Hindi ma-upload ang bill: ${billError.message}`)

  const receiptPath = `${userId}/receipt_${ts}_${receiptFile.name}`
  const { error: receiptError } = await supabase.storage
    .from('bankero-pop-documents')
    .upload(receiptPath, receiptFile, { upsert: false })
  if (receiptError) throw new Error(`Hindi ma-upload ang resibo: ${receiptError.message}`)

  const { data: billData } = supabase.storage.from('bankero-pop-documents').getPublicUrl(billPath)
  const { data: receiptData } = supabase.storage.from('bankero-pop-documents').getPublicUrl(receiptPath)

  return { billUrl: billData.publicUrl, receiptUrl: receiptData.publicUrl }
}

async function imageUrlToBase64(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error('Hindi ma-load ang larawan.')
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
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      images: [base64],
      stream: false,
    }),
  })
  if (!res.ok) throw new Error('Hindi matawagan ang Ollama. Tiyaking naka-install at nakabukas ito.')
  const data = await res.json() as { response: string }
  const match = data.response.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Hindi nabasa ng AI ang dokumento. Subukan muli.')
  return match[0]
}

export async function extractBillData(imageUrl: string): Promise<BillOCRData> {
  const raw = await callOllamaVision(imageUrl, BILL_PROMPT)
  return JSON.parse(raw) as BillOCRData
}

export async function extractReceiptData(imageUrl: string): Promise<ReceiptOCRData> {
  const raw = await callOllamaVision(imageUrl, RECEIPT_PROMPT)
  return JSON.parse(raw) as ReceiptOCRData
}

export async function validateSubmission(
  billData: BillOCRData,
  receiptData: ReceiptOCRData,
  account: UtilityAccount,
  userFullName: string,
  lastVerifiedPeriod: string | null,
): Promise<ValidationResult> {
  const errors: string[] = []

  // Rule 1: account name matches registered user
  if (!billData.account_name || billData.account_name.toLowerCase().trim() !== userFullName.toLowerCase().trim()) {
    errors.push('Ang pangalan sa bill ay hindi tugma sa iyong registered na pangalan.')
  }

  // Rule 2: account number on bill matches registered
  if (!billData.account_number || billData.account_number.trim() !== account.account_number.trim()) {
    errors.push('Ang account number sa bill ay hindi tugma sa iyong registered na account.')
  }

  // Rule 3: receipt subscriber account matches registered
  if (!receiptData.subscriber_account_number || receiptData.subscriber_account_number.trim() !== account.account_number.trim()) {
    errors.push('Ang account number sa resibo ay hindi tugma sa iyong registered na account.')
  }

  // Rule 4: mobile number on receipt matches registered GCash number
  const normalizePhone = (p: string) => p.replace(/\D/g, '').slice(-10)
  if (!receiptData.mobile_number || normalizePhone(receiptData.mobile_number) !== normalizePhone(account.gcash_number)) {
    errors.push('Ang GCash number sa resibo ay hindi tugma sa iyong registered na GCash number.')
  }

  // Rule 5: biller name matches on both
  if (
    !billData.biller_name || !receiptData.biller_name ||
    billData.biller_name.toLowerCase().trim() !== receiptData.biller_name.toLowerCase().trim()
  ) {
    errors.push('Ang biller sa bill at resibo ay hindi magkatugma.')
  }

  // Rule 6: amount paid within 5% of amount due
  if (billData.amount_due != null && receiptData.amount_paid != null) {
    const tolerance = billData.amount_due * 0.05
    if (Math.abs(receiptData.amount_paid - billData.amount_due) > tolerance) {
      errors.push(`Ang halagang binayad (₱${receiptData.amount_paid}) ay hindi tugma sa halagang dapat bayaran (₱${billData.amount_due}).`)
    }
  } else {
    errors.push('Hindi mabasa ang halaga sa bill o resibo.')
  }

  // Rule 7: transaction date on or before due date
  if (billData.due_date && receiptData.transaction_date) {
    if (new Date(receiptData.transaction_date) > new Date(billData.due_date)) {
      errors.push('Ang petsa ng bayad ay lagpas na sa due date ng bill.')
    }
  }

  // Rule 8: reference number not reused
  if (receiptData.reference_number) {
    const { data: existing } = await supabase
      .from('pop_submissions')
      .select('id')
      .eq('reference_number', receiptData.reference_number)
      .maybeSingle()
    if (existing) {
      errors.push('Ang reference number na ito ay nagamit na. Huwag mag-submit ng parehong resibo.')
    }
  } else {
    errors.push('Walang reference number na nakita sa resibo.')
  }

  // Rule 9: billing period is sequential
  if (billData.billing_period && lastVerifiedPeriod) {
    const [lastM, lastY] = lastVerifiedPeriod.split('/').map(Number)
    const [newM, newY] = billData.billing_period.split('/').map(Number)
    const lastDate = new Date(lastY, lastM - 1)
    const expectedDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1)
    const newDate = new Date(newY, newM - 1)
    if (newDate.getTime() !== expectedDate.getTime()) {
      errors.push(`Ang billing period ay dapat sunod-sunod. Inaasahan: ${String(expectedDate.getMonth() + 1).padStart(2,'0')}/${expectedDate.getFullYear()}`)
    }
  }

  // Rule 10: transaction status must be successful
  if (receiptData.transaction_status) {
    const status = receiptData.transaction_status.toLowerCase()
    if (!status.includes('success') && !status.includes('completed') && !status.includes('matagumpay')) {
      errors.push('Ang transaksyon ay hindi successful. Tiyakin na matagumpay ang bayad.')
    }
  } else {
    errors.push('Hindi mabasa ang status ng transaksyon sa resibo.')
  }

  return { passed: errors.length === 0, errors, billData, receiptData }
}

export async function recordVerifiedPayment(
  userId: string,
  accountId: string,
  billerName: string,
  billUrl: string,
  receiptUrl: string,
  validation: ValidationResult,
): Promise<void> {
  const { billData, receiptData } = validation

  const { error: insertError } = await supabase.from('pop_submissions').insert({
    user_id: userId,
    utility_account_id: accountId,
    billing_period: billData.billing_period,
    amount_due: billData.amount_due,
    amount_paid: receiptData.amount_paid,
    transaction_date: receiptData.transaction_date,
    reference_number: receiptData.reference_number,
    biller_name: billerName,
    bill_image_url: billUrl,
    receipt_image_url: receiptUrl,
    ocr_bill_data: billData,
    ocr_receipt_data: receiptData,
    validation_status: validation.passed ? 'passed' : 'failed',
    validation_errors: validation.errors.length > 0 ? validation.errors : null,
    score_applied: false,
  })
  if (insertError) throw new Error(`Hindi ma-save ang submission: ${insertError.message}`)

  if (!validation.passed) return

  // Update streak
  const { data: existingStreak } = await supabase
    .from('pop_streaks')
    .select('*')
    .eq('user_id', userId)
    .eq('utility_account_id', accountId)
    .maybeSingle() as { data: POPStreak | null }

  const newMonths = (existingStreak?.consecutive_months ?? 0) + 1

  let bonusDelta = 0
  if (newMonths >= 12 && (existingStreak?.total_score_bonus ?? 0) < 20) bonusDelta = 20 - (existingStreak?.total_score_bonus ?? 0)
  else if (newMonths >= 6 && (existingStreak?.total_score_bonus ?? 0) < 10) bonusDelta = 10 - (existingStreak?.total_score_bonus ?? 0)
  else if (newMonths >= 3 && (existingStreak?.total_score_bonus ?? 0) < 5) bonusDelta = 5 - (existingStreak?.total_score_bonus ?? 0)

  await supabase.from('pop_streaks').upsert({
    user_id: userId,
    utility_account_id: accountId,
    consecutive_months: newMonths,
    last_verified_period: billData.billing_period,
    total_score_bonus: (existingStreak?.total_score_bonus ?? 0) + bonusDelta,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,utility_account_id' })

  if (bonusDelta > 0) {
    await supabase.from('score_cache').upsert({
      wallet_address: userId,
      repayment_score: bonusDelta,
    }, { onConflict: 'wallet_address' })

    await supabase
      .from('pop_submissions')
      .update({ score_applied: true })
      .eq('user_id', userId)
      .eq('reference_number', receiptData.reference_number)
  }
}
