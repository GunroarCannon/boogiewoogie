/**
 * /api/list endpoint
 * Handles Create (POST), Read (GET), Update ops (PATCH), and Delete (DELETE)
 */

import { generateReadableKey, resolveKey, createListPointers, hashKey } from './lib/keys.js';
import { getBasket, putBasket, deleteBasket } from './lib/storage.js';
import { applyOpsToList } from './lib/ops.js';
import { saveSnapshot } from './lib/history.js';
import { checkRateLimit, recordFailedAttempt, clearFailedAttempts } from './lib/rateLimit.js';
import { parseTodoList } from '../src/lib/parser.js';

export default async function handler(req, res) {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-list-key');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. CREATE LIST (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const title = (body.title || 'Untitled Todo List').trim();
      let editKey = (body.editKey || '').trim();
      let viewKey = (body.viewKey || '').trim();

      if (!editKey) {
        editKey = generateReadableKey();
      } else if (editKey.length < 8) {
        return res.status(400).json({ error: 'Edit key must be at least 8 characters long.' });
      }

      if (!viewKey) {
        viewKey = generateReadableKey();
      } else if (viewKey.length < 8) {
        return res.status(400).json({ error: 'View key must be at least 8 characters long.' });
      }

      const listId = 'list_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const basketName = `lst_${listId}`;

      // Parse initial text if provided
      let items = [];
      if (body.text) {
        const parsed = parseTodoList(body.text);
        items = parsed.items;
      }

      const listData = {
        id: listId,
        title,
        version: 1,
        items,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Save list data
      await putBasket(basketName, listData);

      // Create pointers for edit & view keys
      await createListPointers(listId, editKey, viewKey);

      // Save initial snapshot
      await saveSnapshot(listId, listData);

      return res.status(201).json({
        id: listId,
        title: listData.title,
        version: listData.version,
        items: listData.items,
        editKey,
        viewKey,
        role: 'edit',
        updatedAt: listData.updatedAt
      });
    } catch (err) {
      console.error('Error creating list:', err);
      return res.status(500).json({ error: 'Failed to create list: ' + err.message });
    }
  }

  // Get key from header or query param
  const rawKey = req.headers['x-list-key'] || req.query?.key;

  if (!rawKey) {
    return res.status(401).json({ error: 'Missing list key header (x-list-key)' });
  }

  // Check rate limit on failed lookups
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: rateLimit.error });
  }

  // Resolve key to listId and role
  const resolved = await resolveKey(rawKey);
  if (!resolved) {
    recordFailedAttempt(req);
    return res.status(404).json({ error: 'No list found for this key.' });
  }

  clearFailedAttempts(req);

  const { listId, role } = resolved;
  const basketName = `lst_${listId}`;

  // 2. READ LIST (GET)
  if (req.method === 'GET') {
    try {
      const listData = await getBasket(basketName);
      if (!listData) {
        return res.status(404).json({ error: 'List basket could not be found or has expired.' });
      }

      return res.status(200).json({
        id: listData.id,
        title: listData.title,
        version: listData.version,
        items: listData.items || [],
        role, // 'edit' or 'view'
        updatedAt: listData.updatedAt
      });
    } catch (err) {
      console.error('Error getting list:', err);
      return res.status(500).json({ error: 'Failed to retrieve list: ' + err.message });
    }
  }

  // 3. APPLY OPS (PATCH)
  if (req.method === 'PATCH') {
    if (role !== 'edit') {
      return res.status(403).json({ error: 'Read-only access: this key does not have permission to edit.' });
    }

    try {
      const ops = req.body?.ops || [];
      const currentData = await getBasket(basketName);
      if (!currentData) {
        return res.status(404).json({ error: 'List basket not found.' });
      }

      const updatedData = applyOpsToList(currentData, ops);
      await putBasket(basketName, updatedData);

      // Save snapshot if version increased by 5 or replace_all was performed
      const hasMajorOp = ops.some(o => o.op === 'replace_all');
      if (hasMajorOp || (updatedData.version % 5 === 0)) {
        await saveSnapshot(listId, updatedData);
      }

      return res.status(200).json({
        id: updatedData.id,
        title: updatedData.title,
        version: updatedData.version,
        items: updatedData.items,
        role: 'edit',
        updatedAt: updatedData.updatedAt
      });
    } catch (err) {
      console.error('Error updating list:', err);
      return res.status(500).json({ error: 'Failed to update list: ' + err.message });
    }
  }

  // 4. DELETE LIST (DELETE)
  if (req.method === 'DELETE') {
    if (role !== 'edit') {
      return res.status(403).json({ error: 'Read-only access: only the editor can delete this list.' });
    }

    try {
      const currentData = await getBasket(basketName);
      if (!currentData) {
        return res.status(404).json({ error: 'List not found.' });
      }

      const confirmTitle = (req.body?.confirmTitle || '').trim();
      if (confirmTitle !== currentData.title.trim()) {
        return res.status(400).json({ error: `Confirmation title does not match. Please type "${currentData.title}".` });
      }

      // Delete basket & history
      await deleteBasket(basketName);
      await deleteBasket(`hist_${listId}`);
      // Delete edit pointer
      await deleteBasket(resolved.pointerName);

      return res.status(200).json({ message: 'List deleted successfully.' });
    } catch (err) {
      console.error('Error deleting list:', err);
      return res.status(500).json({ error: 'Failed to delete list: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
