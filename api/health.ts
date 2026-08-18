import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getResolvedApiKey } from './search';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const key = getResolvedApiKey();

  return res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'production',
    youtubeApiConfigured: Boolean(key),
    keyLength: key ? key.length : 0,
    analyticsConfigured: true,
    timestamp: new Date().toISOString(),
  });
}
