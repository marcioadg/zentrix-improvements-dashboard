module.exports = async function handler(req, res) {
  const origin = req.headers.origin
  // Allow localhost for development and any Vercel domain for preview/production
  if (origin && (origin.startsWith('http://localhost:') || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(200).end()
  }
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res.json({ ok: true, ts: new Date().toISOString() })
}
