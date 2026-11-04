/**
 * /api/keys/rotate
 * Rotates an existing key to a new readable key
 */

import { resolveKey, rotateKey, generateReadableKey } from '../lib/keys.js';

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

  const rawKey = req.headers['x-list-key'];
  if (!rawKey) {
    return res.status(401).json({ error: 'Missing list key' });
  }

  try {
    let newKey = (req.body?.newKey || '').trim();
    if (!newKey) {
      newKey = generateReadableKey();
    } else if (newKey.length < 8) {
      return res.status(400).json({ error: 'New key must be at least 8 characters long.' });
    }

    const rotated = await rotateKey(rawKey, newKey);
    return res.status(200).json({
      message: 'Key successfully rotated',
      role: rotated.role,
      newKey: rotated.newKey
    });
  } catch (err) {
    console.error('Error rotating key:', err);
    return res.status(500).json({ error: err.message });
  }
}
