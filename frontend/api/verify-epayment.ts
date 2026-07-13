// Vercel serverless function — proxies e-payment screenshot OCR to
// Ollama's hosted cloud API (ollama.com), authenticated with an API
// key created at ollama.com/settings/keys. Runs server-side so the
// key never reaches the browser. Uses a "-cloud" tagged vision model
// (see OLLAMA_MODEL below) since ollama.com only serves cloud-tagged
// models, not the plain local model names.

const PROMPT = `Extract the following fields from this e-wallet (GCash, Maya, ShopeePay, etc.) transaction screenshot and return ONLY a JSON object with no explanation:
{
  "provider": "",
  "amount": 0,
  "reference_number": "",
  "transaction_date": "YYYY-MM-DD",
  "transaction_status": ""
}
If a field cannot be read clearly, set it to null. Do not guess.`

// qwen3-vl:235b-cloud is a large model — vision inference regularly runs
// past Vercel's default function timeout, which comes back to the
// browser as an empty response body ("Unexpected end of JSON input").
// 300s requires Fluid Compute enabled on the Vercel project (Settings →
// Functions → Fluid Compute); without it, Hobby caps at 60s regardless
// of this value.
export const config = { maxDuration: 300 }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const imageUrl = req.body?.imageUrl
  if (!imageUrl || typeof imageUrl !== 'string') {
    res.status(400).json({ error: 'imageUrl is required' })
    return
  }

  const apiKey = process.env.OLLAMA_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'AI verification is not configured on the server yet.' })
    return
  }
  const model = process.env.OLLAMA_MODEL || 'qwen3-vl:235b-cloud'

  try {
    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) {
      res.status(400).json({ error: 'Could not load the uploaded image.' })
      return
    }
    const buffer = Buffer.from(await imageRes.arrayBuffer())
    const base64 = buffer.toString('base64')

    const ollamaRes = await fetch('https://ollama.com/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, prompt: PROMPT, images: [base64], stream: false }),
    })

    if (!ollamaRes.ok) {
      console.error('[verify-epayment] Ollama Cloud error:', ollamaRes.status, await ollamaRes.text())
      res.status(502).json({ error: 'The AI verifier could not process this image. Try again.' })
      return
    }

    const data = await ollamaRes.json()
    const text: string = data.response ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      res.status(422).json({ error: 'The AI could not read this image. Try a clearer screenshot.' })
      return
    }

    res.status(200).json(JSON.parse(match[0]))
  } catch (err) {
    console.error('[verify-epayment] Unexpected error:', err)
    res.status(500).json({ error: 'Something went wrong verifying this image.' })
  }
}
