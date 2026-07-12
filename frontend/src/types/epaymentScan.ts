export interface EpaymentOCRData {
  provider: string | null
  amount: number | null
  reference_number: string | null
  transaction_date: string | null // YYYY-MM-DD
  transaction_status: string | null
}

export interface EpaymentValidationResult {
  passed: boolean
  errors: string[]
  data: EpaymentOCRData
}

export interface EpaymentScan {
  id: string
  user_id: string
  stellar_address: string
  image_url: string
  extracted_amount: number | null
  extracted_reference: string | null
  extracted_date: string | null
  extracted_status: string | null
  validation_status: 'pending' | 'passed' | 'failed'
  validation_errors: string[] | null
  score_bonus_applied: number
  created_at: string
}
