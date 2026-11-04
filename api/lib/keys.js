/**
 * Key Management and Pointer System
 * Implements two-key pointer architecture:
 * - Hash(editKey) -> { listId, role: "edit" }
 * - Hash(viewKey) -> { listId, role: "view" }
 */

import crypto from 'node:crypto';
import { getBasket, putBasket, deleteBasket } from './storage.js';

const KEY_PEPPER = process.env.KEY_PEPPER || 'lined-paper-secret-pepper-2026';

const ADJECTIVES = [
  'plum', 'quiet', 'mossy', 'amber', 'swift', 'golden', 'frosty', 'rustic',
  'cedar', 'misty', 'silver', 'sunny', 'velvet', 'copper', 'wild', 'gentle',
  'paper', 'linen', 'crisp', 'vintage', 'breezy', 'silent', 'cozy', 'indigo'
];

const NOUNS = [
  'otter', 'lamp', 'heron', 'moss', 'sparrow', 'quill', 'meadow', 'river',
  'falcon', 'harbor', 'forest', 'pebble', 'badger', 'feather', 'willow', 'fox',
  'beacon', 'canyon', 'notebook', 'valley', 'ember', 'compass', 'acorn', 'robin'
];

/**
 * Generates a human-friendly key like "plum-otter-lamp-42"
 */
export function generateReadableKey() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun1 = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const noun2 = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}-${noun1}-${noun2}-${num}`;
}

/**
 * Hashes a key deterministically to create a safe basket pointer name.
 * Safe alphanumeric format: ptr_<32 hex chars>
 */
export function hashKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return null;
  const cleanKey = rawKey.trim().toLowerCase();
  if (cleanKey.length < 4) return null;
  
  const hash = crypto.createHash('sha256')
    .update(cleanKey + ':' + KEY_PEPPER)
    .digest('hex');
  return `ptr_${hash.substring(0, 32)}`;
}

/**
 * Resolves a key to its { listId, role, pointerName }
 */
export async function resolveKey(rawKey) {
  const ptrName = hashKey(rawKey);
  if (!ptrName) return null;

  try {
    const ptr = await getBasket(ptrName);
    if (!ptr || !ptr.listId || !ptr.role) {
      return null;
    }
    return {
      listId: ptr.listId,
      role: ptr.role, // 'edit' or 'view'
      pointerName: ptrName,
      createdAt: ptr.createdAt
    };
  } catch (err) {
    console.error('Error resolving key:', err);
    return null;
  }
}

/**
 * Creates pointer baskets for a newly created list
 */
export async function createListPointers(listId, editKey, viewKey) {
  const editPtrName = hashKey(editKey);
  const viewPtrName = hashKey(viewKey);

  await putBasket(editPtrName, {
    listId,
    role: 'edit',
    createdAt: Date.now()
  });

  if (viewKey) {
    await putBasket(viewPtrName, {
      listId,
      role: 'view',
      createdAt: Date.now()
    });
  }

  return { editPtrName, viewPtrName };
}

/**
 * Rotates a key (edit or view) to a new key
 */
export async function rotateKey(oldKey, newKey) {
  const resolution = await resolveKey(oldKey);
  if (!resolution) {
    throw new Error('Invalid existing key');
  }

  const newPtrName = hashKey(newKey);
  // Write new pointer
  await putBasket(newPtrName, {
    listId: resolution.listId,
    role: resolution.role,
    createdAt: Date.now()
  });

  // Delete old pointer
  await deleteBasket(resolution.pointerName);

  return { listId: resolution.listId, role: resolution.role, newKey };
}

/**
 * Disables / deletes the view key pointer
 */
export async function disableViewKey(viewKey) {
  const resolution = await resolveKey(viewKey);
  if (!resolution || resolution.role !== 'view') {
    throw new Error('Invalid view key');
  }
  await deleteBasket(resolution.pointerName);
  return true;
}
