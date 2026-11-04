/**
 * Unified Storage Adapter
 * Supports:
 * 1. Vercel Blob (Fast, zero rate-limit, native Vercel integration)
 * 2. Upstash Redis REST API (Fast, 10k ops/day free tier)
 * 3. Pantry Cloud (Legacy fallback)
 * 4. Local filesystem (.data/baskets) for local dev & Vitest tests
 */

import fs from 'node:fs';
import path from 'node:path';

const IS_TEST = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const PANTRY_ID = process.env.PANTRY_ID;

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), '.data', 'baskets');

// Ensure local fallback directory exists
try {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
} catch (e) {
  // ignore
}

// Dynamically import @vercel/blob if token is available and not running local test
let vercelBlobModule = null;
async function getBlobModule() {
  if (!vercelBlobModule && BLOB_TOKEN && !IS_TEST) {
    try {
      vercelBlobModule = await import('@vercel/blob');
    } catch (e) {
      console.warn('Failed to load @vercel/blob module:', e.message);
    }
  }
  return vercelBlobModule;
}

// -------------------------------------------------------------
// VERCEL BLOB STORAGE
// -------------------------------------------------------------
async function getFromBlob(basketName) {
  const blob = await getBlobModule();
  if (!blob) return null;

  // 1. Try fast direct CDN fetch if BLOB_STORE_ID is set
  const storeSubdomain = (process.env.BLOB_STORE_ID || '').toLowerCase().replace('store_', '');
  if (storeSubdomain) {
    try {
      const directUrl = `https://${storeSubdomain}.public.blob.vercel-storage.com/baskets/${basketName}.json`;
      const res = await fetch(`${directUrl}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.status === 404) return null;
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fall through to head() lookup
    }
  }

  // 2. Fallback to head() lookup
  try {
    const meta = await blob.head(`baskets/${basketName}.json`);
    if (!meta || !meta.url) return null;
    const res = await fetch(`${meta.url}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (res.status === 404) return null;
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch (err) {
    if (err.message && (err.message.includes('does not exist') || err.message.includes('404'))) {
      return null;
    }
    console.error(`Blob head error for ${basketName}:`, err.message);
    return null;
  }
}

async function putToBlob(basketName, data) {
  const blob = await getBlobModule();
  if (!blob) throw new Error('Vercel Blob module not available');

  await blob.put(`baskets/${basketName}.json`, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  return true;
}

async function deleteFromBlob(basketName) {
  const blob = await getBlobModule();
  if (!blob) return true;

  try {
    await blob.del(`baskets/${basketName}.json`);
  } catch (err) {
    // ignore deletion errors if already missing
  }
  return true;
}

// -------------------------------------------------------------
// UPSTASH REDIS REST STORAGE
// -------------------------------------------------------------
async function getFromUpstash(basketName) {
  try {
    const url = `${UPSTASH_URL}/get/basket:${encodeURIComponent(basketName)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || json.result === null || json.result === undefined) return null;
    return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
  } catch (err) {
    console.error(`Upstash GET error for ${basketName}:`, err.message);
    return null;
  }
}

async function putToUpstash(basketName, data) {
  const url = `${UPSTASH_URL}/set/basket:${encodeURIComponent(basketName)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(typeof data === 'string' ? data : JSON.stringify(data))
  });
  if (!res.ok) {
    throw new Error(`Upstash SET failed (${res.status}): ${await res.text()}`);
  }
  return true;
}

async function deleteFromUpstash(basketName) {
  try {
    const url = `${UPSTASH_URL}/del/basket:${encodeURIComponent(basketName)}`;
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
  } catch (e) {
    // ignore
  }
  return true;
}

// -------------------------------------------------------------
// PANTRY STORAGE (Legacy Fallback)
// -------------------------------------------------------------
let lastPantryRequestTime = 0;
const MIN_PANTRY_INTERVAL_MS = 1000;

async function throttlePantry() {
  const now = Date.now();
  const elapsed = now - lastPantryRequestTime;
  if (elapsed < MIN_PANTRY_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_PANTRY_INTERVAL_MS - elapsed));
  }
  lastPantryRequestTime = Date.now();
}

async function fetchPantryWithRetry(url, options, maxRetries = 2) {
  let delay = 2000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await throttlePantry();
      const res = await fetch(url, options);
      if (res.status === 429 && attempt < maxRetries) {
        console.warn(`Pantry 429 rate limit hit, backing off ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

async function getFromPantry(basketName) {
  const url = `https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/${encodeURIComponent(basketName)}`;
  const res = await fetchPantryWithRetry(url, { method: 'GET' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Pantry GET failed (${res.status}): ${await res.text()}`);
  return await res.json();
}

async function putToPantry(basketName, data) {
  const url = `https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/${encodeURIComponent(basketName)}`;
  let res = await fetchPantryWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok && res.status !== 429) {
    res = await fetchPantryWithRetry(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
  if (!res.ok) throw new Error(`Pantry PUT failed (${res.status}): ${await res.text()}`);
  return true;
}

async function deleteFromPantry(basketName) {
  const url = `https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/${encodeURIComponent(basketName)}`;
  const res = await fetchPantryWithRetry(url, { method: 'DELETE' });
  if (res.status === 404) return true;
  if (!res.ok) throw new Error(`Pantry DELETE failed (${res.status}): ${await res.text()}`);
  return true;
}

// -------------------------------------------------------------
// LOCAL FILESYSTEM STORAGE (For Local Dev & Tests)
// -------------------------------------------------------------
function getFromLocal(basketName) {
  const filePath = path.join(LOCAL_STORAGE_DIR, `${basketName}.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      return null;
    }
  }
  return null;
}

function putToLocal(basketName, data) {
  const filePath = path.join(LOCAL_STORAGE_DIR, `${basketName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return true;
}

function deleteFromLocal(basketName) {
  const filePath = path.join(LOCAL_STORAGE_DIR, `${basketName}.json`);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      return false;
    }
  }
  return true;
}

// -------------------------------------------------------------
// PUBLIC STORAGE API
// -------------------------------------------------------------
export async function getBasket(basketName) {
  if (IS_TEST) {
    return getFromLocal(basketName);
  }
  if (BLOB_TOKEN) {
    return await getFromBlob(basketName);
  }
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    return await getFromUpstash(basketName);
  }
  if (PANTRY_ID) {
    return await getFromPantry(basketName);
  }
  return getFromLocal(basketName);
}

export async function putBasket(basketName, data) {
  if (IS_TEST) {
    return putToLocal(basketName, data);
  }
  if (BLOB_TOKEN) {
    return await putToBlob(basketName, data);
  }
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    return await putToUpstash(basketName, data);
  }
  if (PANTRY_ID) {
    return await putToPantry(basketName, data);
  }
  return putToLocal(basketName, data);
}

export async function deleteBasket(basketName) {
  if (IS_TEST) {
    return deleteFromLocal(basketName);
  }
  if (BLOB_TOKEN) {
    return await deleteFromBlob(basketName);
  }
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    return await deleteFromUpstash(basketName);
  }
  if (PANTRY_ID) {
    return await deleteFromPantry(basketName);
  }
  return deleteFromLocal(basketName);
}
