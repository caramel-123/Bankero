export type BillerName = 'Meralco' | 'Maynilad' | 'Manila Water' | 'PLDT' | 'Globe'

export interface UtilityAccount {
  id: string
  user_id: string
  biller_name: BillerName
  account_number: string
  service_address: string | null
  gcash_number: string
  registered_at: string
}

export interface BillOCRData {
  account_name: string | null
  account_number: string | null
  billing_period: string | null // MM/YYYY
  amount_due: number | null
  due_date: string | null // YYYY-MM-DD
  biller_name: string | null
  service_address: string | null
}

export interface ReceiptOCRData {
  mobile_number: string | null
  biller_name: string | null
  subscriber_account_number: string | null
  amount_paid: number | null
  transaction_date: string | null // YYYY-MM-DD
  reference_number: string | null
  transaction_status: string | null
  transaction_type: string | null
}

export type ValidationStatus = 'pending' | 'passed' | 'failed'

export interface POPSubmission {
  id: string
  user_id: string
  utility_account_id: string
  billing_period: string
  amount_due: number
  amount_paid: number
  transaction_date: string
  reference_number: string
  biller_name: string
  bill_image_url: string
  receipt_image_url: string
  ocr_bill_data: BillOCRData | null
  ocr_receipt_data: ReceiptOCRData | null
  validation_status: ValidationStatus
  validation_errors: string[] | null
  score_applied: boolean
  created_at: string
}

export interface POPStreak {
  id: string
  user_id: string
  utility_account_id: string
  consecutive_months: number
  last_verified_period: string | null
  total_score_bonus: number
  updated_at: string
}

export interface ValidationResult {
  passed: boolean
  errors: string[]
  billData: BillOCRData
  receiptData: ReceiptOCRData
}
