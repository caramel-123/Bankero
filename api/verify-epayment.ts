// Vercel serverless function — proxies e-payment screenshot OCR to the
// Anthropic API. This exists purely so ANTHROPIC_API_KEY never reaches
// the browser: the old approach called a local-only Ollama instance
// directly from the frontend, which only ever worked in development
// and can't be replaced with a direct client-side call to a paid API
// without leaking the key to anyone who opens devtools.

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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'AI verification is not configured on the server yet.' })
    return
  }

  try {
    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) {
      res.status(400).json({ error: 'Could not load the uploaded image.' })
      return
    }
    const mediaType = imageRes.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await imageRes.arrayBuffer())
    const base64 = buffer.toString('base64')

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })

    if (!claudeRes.ok) {
      console.error('[verify-epayment] Anthropic API error:', claudeRes.status, await claudeRes.text())
      res.status(502).json({ error: 'The AI verifier could not process this image. Try again.' })
      return
    }

    const data = await claudeRes.json()
    const text: string = data.content?.[0]?.text ?? ''
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
