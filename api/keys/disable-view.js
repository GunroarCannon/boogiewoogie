/**
 * /api/keys/disable-view
 * Disables a view key pointer
 */

import { resolveKey, disableViewKey } from '../lib/keys.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-list-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawKey = req.headers['x-list-key'] || req.body?.viewKey;
  if (!rawKey) {
    return res.status(401).json({ error: 'Missing view key' });
  }

  try {
    await disableViewKey(rawKey);
    return res.status(200).json({ message: 'View key disabled successfully.' });
  } catch (err) {
    console.error('Error disabling view key:', err);
    return res.status(500).json({ error: err.message });
  }
}
