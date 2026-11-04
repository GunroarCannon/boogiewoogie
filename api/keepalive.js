/**
 * /api/keepalive endpoint
 * Pinged by Vercel cron to prevent long-idle Pantry baskets from purging
 */

import { getBasket, putBasket } from './lib/storage.js';

export default async function handler(req, res) {
  try {
    const keepaliveData = {
      lastTouch: Date.now(),
      status: 'active',
      date: new Date().toISOString()
    };
    await putBasket('lined_paper_keepalive', keepaliveData);
    return res.status(200).json({ success: true, timestamp: keepaliveData.lastTouch });
  } catch (err) {
    console.error('Keepalive error:', err);
    return res.status(500).json({ error: err.message });
  }
}
