import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = join(__dirname, '../public/bankero-logo.png')
const outDir = join(__dirname, '../public')

// Standard (icon sits on its own transparent/white background, safe area not required)
const standardSizes = [192, 512]
// Maskable (Android adaptive icons — content must fit inside a centered ~80% safe zone,
// background fills the full canvas since OSes clip to their own shape).
const maskableSizes = [192, 512]

async function run() {
  for (const size of standardSizes) {
    await sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(join(outDir, `pwa-${size}x${size}.png`))
    console.log(`wrote pwa-${size}x${size}.png`)
  }

  for (const size of maskableSizes) {
    const logoSize = Math.round(size * 0.7) // ~70% of canvas, leaving safe-zone padding
    const logo = await sharp(src).resize(logoSize, logoSize, { fit: 'contain' }).toBuffer()
    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(join(outDir, `pwa-maskable-${size}x${size}.png`))
    console.log(`wrote pwa-maskable-${size}x${size}.png`)
  }

  // Apple touch icon (iOS homescreen — no transparency, opaque background required)
  await sharp(src)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toFile(join(outDir, 'apple-touch-icon.png'))
  console.log('wrote apple-touch-icon.png')
}

run().catch(err => { console.error(err); process.exit(1) })
