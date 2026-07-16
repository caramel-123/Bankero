// Vercel serverless function — proxies e-payment screenshot OCR to
// Groq's hosted API (console.groq.com), authenticated with an API key
// created at console.groq.com/keys. Runs server-side so the key never
// reaches the browser. Free tier is rate-limited, not billed.

const PROMPT = `Extract the following fields from this e-wallet (GCash, Maya, ShopeePay, etc.) transaction screenshot and return ONLY a JSON object with no explanation:
{
  "provider": "",
  "amount": 0,
  "reference_number": "",
  "transaction_date": "YYYY-MM-DD",
  "transaction_status": ""
}
If a field cannot be read clearly, set it to null. Do not guess.`

// Groq's LPU hardware is fast, but leave headroom for cold starts / retries.
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

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'AI verification is not configured on the server yet.' })
    return
  }
  const model = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'

  try {
    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) {
      res.status(400).json({ error: 'Could not load the uploaded image.' })
      return
    }
    const mediaType = imageRes.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await imageRes.arrayBuffer())
    const base64 = buffer.toString('base64')

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
          ],
        }],
      }),
    })

    if (!groqRes.ok) {
      console.error('[verify-epayment] Groq API error:', groqRes.status, await groqRes.text())
      res.status(502).json({ error: 'The AI verifier could not process this image. Try again.' })
      return
    }

    const data = await groqRes.json() as { choices?: { message?: { content?: string } }[] }
    const text: string = data.choices?.[0]?.message?.content ?? ''
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
