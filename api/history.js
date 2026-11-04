/**
 * /api/history endpoint
 * Allows listing version snapshots and restoring a previous snapshot
 */

import { resolveKey } from './lib/keys.js';
import { getSnapshots } from './lib/history.js';
import { getBasket, putBasket } from './lib/storage.js';
import { applyOpsToList } from './lib/ops.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-list-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawKey = req.headers['x-list-key'];
  if (!rawKey) {
    return res.status(401).json({ error: 'Missing list key' });
  }

  const resolved = await resolveKey(rawKey);
  if (!resolved) {
    return res.status(404).json({ error: 'List not found for key' });
  }

  const { listId, role } = resolved;

  // GET: retrieve history snapshots
  if (req.method === 'GET') {
    try {
      const snapshots = await getSnapshots(listId);
      // Omit heavy full data in list response to keep payload light
      const summaries = snapshots.map(s => ({
        timestamp: s.timestamp,
        version: s.version,
        title: s.title,
        itemCount: s.itemCount,
        doneCount: s.doneCount,
        totalTodos: s.totalTodos
      }));

      return res.status(200).json({ snapshots: summaries });
    } catch (err) {
      console.error('Error fetching snapshots:', err);
      return res.status(500).json({ error: 'Failed to retrieve history' });
    }
  }

  // POST: restore a snapshot
  if (req.method === 'POST') {
    if (role !== 'edit') {
      return res.status(403).json({ error: 'Only editor can restore versions' });
    }

    try {
      const timestamp = req.body?.timestamp;
      if (!timestamp) {
        return res.status(400).json({ error: 'Missing snapshot timestamp' });
      }

      const snapshots = await getSnapshots(listId);
      const targetSnapshot = snapshots.find(s => s.timestamp === timestamp);
      if (!targetSnapshot || !targetSnapshot.data) {
        return res.status(404).json({ error: 'Snapshot not found' });
      }

      const basketName = `lst_${listId}`;
      const currentList = await getBasket(basketName);

      // Apply replace_all op to restore state
      const restored = applyOpsToList(currentList, [
        {
          op: 'replace_all',
          title: targetSnapshot.data.title,
          items: targetSnapshot.data.items,
          updatedAt: Date.now()
        }
      ]);

      await putBasket(basketName, restored);

      return res.status(200).json({
        message: 'Snapshot restored successfully',
        list: restored
      });
    } catch (err) {
      console.error('Error restoring snapshot:', err);
      return res.status(500).json({ error: 'Failed to restore snapshot: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
