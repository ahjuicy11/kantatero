import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'production',
    youtubeApiConfigured: Boolean(process.env.YOUTUBE_API_KEY),
    analyticsConfigured: true,
    timestamp: new Date().toISOString(),
  });
}
