// Vercel serverless function — proxies e-payment screenshot OCR to a
// self-hosted Ollama vision model. Runs server-side (not called
// directly from the browser) so the Ollama server's address doesn't
// need public CORS/CSP exceptions and so this can later be swapped
// for another backend without touching the frontend.
//
// Requires OLLAMA_URL to point at a publicly reachable Ollama
// instance — "localhost" only works if this function and Ollama run
// on the same machine, which isn't the case on Vercel. Optionally set
// OLLAMA_MODEL (defaults to "llava").

const PROMPT = `Extract the following fields from this e-wallet (GCash, Maya, ShopeePay, etc.) transaction screenshot and return ONLY a JSON object with no explanation:
{
  "provider": "",
  "amount": 0,
  "reference_number": "",
  "transaction_date": "YYYY-MM-DD",
  "transaction_status": ""
}
If a field cannot be read clearly, set it to null. Do not guess.`

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

  const ollamaUrl = process.env.OLLAMA_URL
  if (!ollamaUrl) {
    res.status(500).json({ error: 'AI verification is not configured on the server yet.' })
    return
  }
  const model = process.env.OLLAMA_MODEL || 'llava'

  try {
    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) {
      res.status(400).json({ error: 'Could not load the uploaded image.' })
      return
    }
    const buffer = Buffer.from(await imageRes.arrayBuffer())
    const base64 = buffer.toString('base64')

    const ollamaRes = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, prompt: PROMPT, images: [base64], stream: false }),
    })

    if (!ollamaRes.ok) {
      console.error('[verify-epayment] Ollama error:', ollamaRes.status, await ollamaRes.text())
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
