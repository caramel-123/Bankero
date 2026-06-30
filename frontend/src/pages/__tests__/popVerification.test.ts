import { describe, it, expect, vi } from 'vitest'
import { validateSubmission } from '../../services/popVerification'
import type { BillOCRData, ReceiptOCRData, UtilityAccount } from '../../types/pop'

// Mock supabase for duplicate-check in rule 8
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    }),
  },
}))

const mockAccount: UtilityAccount = {
  id: 'acc-1',
  user_id: 'user-1',
  biller_name: 'Meralco',
  account_number: '123-456-789',
  service_address: '123 Rizal St., Maynila',
  gcash_number: '09171234567',
  registered_at: '2026-01-01T00:00:00Z',
}

const validBill: BillOCRData = {
  account_name: 'Juan Dela Cruz',
  account_number: '123-456-789',
  billing_period: '06/2026',
  amount_due: 1500,
  due_date: '2026-07-10',
  biller_name: 'Meralco',
  service_address: '123 Rizal St., Maynila',
}

const validReceipt: ReceiptOCRData = {
  mobile_number: '09171234567',
  biller_name: 'Meralco',
  subscriber_account_number: '123-456-789',
  amount_paid: 1500,
  transaction_date: '2026-07-05',
  reference_number: 'REF-UNIQUE-001',
  transaction_status: 'Successful',
  transaction_type: 'Bills Payment',
}

describe('POP Validation — fraud rules', () => {
  it('passes when all fields are valid', async () => {
    const result = await validateSubmission(validBill, validReceipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('Rule 1: fails when account_name does not match user full name', async () => {
    const bill = { ...validBill, account_name: 'Maria Santos' }
    const result = await validateSubmission(bill, validReceipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('pangalan'))).toBe(true)
  })

  it('Rule 1: name match is case-insensitive', async () => {
    const bill = { ...validBill, account_name: 'juan dela cruz' }
    const result = await validateSubmission(bill, validReceipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(true)
  })

  it('Rule 2: fails when bill account_number does not match registered', async () => {
    const bill = { ...validBill, account_number: '999-999-999' }
    const result = await validateSubmission(bill, validReceipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('account number sa bill'))).toBe(true)
  })

  it('Rule 3: fails when receipt subscriber_account_number does not match', async () => {
    const receipt = { ...validReceipt, subscriber_account_number: '000-000-000' }
    const result = await validateSubmission(validBill, receipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('account number sa resibo'))).toBe(true)
  })

  it('Rule 4: fails when GCash number does not match', async () => {
    const receipt = { ...validReceipt, mobile_number: '09999999999' }
    const result = await validateSubmission(validBill, receipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('GCash number'))).toBe(true)
  })

  it('Rule 4: normalizes phone format differences (+63 prefix)', async () => {
    const receipt = { ...validReceipt, mobile_number: '+639171234567' }
    const result = await validateSubmission(validBill, receipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(true)
  })

  it('Rule 5: fails when biller names do not match', async () => {
    const receipt = { ...validReceipt, biller_name: 'Maynilad' }
    const result = await validateSubmission(validBill, receipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('biller'))).toBe(true)
  })

  it('Rule 6: passes when amount_paid is within 5% tolerance', async () => {
    const receipt = { ...validReceipt, amount_paid: 1574 } // 1574/1500 = +4.9%
    const result = await validateSubmission(validBill, receipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(true)
  })

  it('Rule 6: fails when amount_paid exceeds 5% tolerance', async () => {
    const receipt = { ...validReceipt, amount_paid: 1600 } // +6.7%
    const result = await validateSubmission(validBill, receipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('halaga'))).toBe(true)
  })

  it('Rule 7: fails when transaction_date is after due_date', async () => {
    const receipt = { ...validReceipt, transaction_date: '2026-07-15' }
    const result = await validateSubmission(validBill, receipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('due date'))).toBe(true)
  })

  it('Rule 7: passes when transaction_date equals due_date', async () => {
    const receipt = { ...validReceipt, transaction_date: '2026-07-10' }
    const result = await validateSubmission(validBill, receipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(true)
  })

  it('Rule 9: fails when billing_period is not sequential', async () => {
    const bill = { ...validBill, billing_period: '08/2026' }
    const result = await validateSubmission(bill, validReceipt, mockAccount, 'Juan Dela Cruz', '06/2026')
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('sunod-sunod'))).toBe(true)
  })

  it('Rule 9: passes when billing_period is exactly one month ahead', async () => {
    const bill = { ...validBill, billing_period: '07/2026' }
    const result = await validateSubmission(bill, validReceipt, mockAccount, 'Juan Dela Cruz', '06/2026')
    expect(result.passed).toBe(true)
  })

  it('Rule 10: fails when transaction_status is not successful', async () => {
    const receipt = { ...validReceipt, transaction_status: 'Failed' }
    const result = await validateSubmission(validBill, receipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('successful'))).toBe(true)
  })

  it('Rule 10: passes for "Completed" status', async () => {
    const receipt = { ...validReceipt, transaction_status: 'Completed' }
    const result = await validateSubmission(validBill, receipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.passed).toBe(true)
  })

  it('accumulates multiple errors', async () => {
    const bill = { ...validBill, account_name: 'Wrong Name', biller_name: 'Maynilad' }
    const result = await validateSubmission(bill, validReceipt, mockAccount, 'Juan Dela Cruz', null)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})
