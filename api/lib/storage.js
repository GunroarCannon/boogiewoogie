/**
 * Storage Adapter for Pantry with local memory / file fallback.
 * Allows swapping backend (Pantry, Upstash, KV) by modifying this single file.
 */

import fs from 'node:fs';
import path from 'node:path';

const PANTRY_ID = process.env.PANTRY_ID;
const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), '.data', 'baskets');
const usePantry = PANTRY_ID && process.env.NODE_ENV !== 'test' && !process.env.VITEST;

// Ensure local fallback directory exists if needed
try {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
} catch (e) {
  // ignore
}

export async function getBasket(basketName) {
  if (usePantry) {
    const url = `https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/${encodeURIComponent(basketName)}`;
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`Pantry GET failed (${res.status}): ${await res.text()}`);
      }
      return await res.json();
    } catch (err) {
      console.error(`Pantry GET error for ${basketName}:`, err);
      throw err;
    }
  } else {
    // Local fallback
    const filePath = path.join(LOCAL_STORAGE_DIR, `${basketName}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      } catch (err) {
        console.error(`Local read error for ${basketName}:`, err);
        return null;
      }
    }
    return null;
  }
}

export async function putBasket(basketName, data) {
  if (usePantry) {
    const url = `https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/${encodeURIComponent(basketName)}`;
    try {
      // Try POST first (which creates or updates)
      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      // If POST returns an error or basket exists, try PUT to replace contents
      if (!res.ok) {
        res = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
      
      if (!res.ok) {
        throw new Error(`Pantry PUT failed (${res.status}): ${await res.text()}`);
      }
      return true;
    } catch (err) {
      console.error(`Pantry PUT error for ${basketName}:`, err);
      throw err;
    }
  } else {
    // Local fallback
    const filePath = path.join(LOCAL_STORAGE_DIR, `${basketName}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`Local write error for ${basketName}:`, err);
      throw err;
    }
  }
}

export async function deleteBasket(basketName) {
  if (usePantry) {
    const url = `https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/${encodeURIComponent(basketName)}`;
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (res.status === 404) return true;
      if (!res.ok) {
        throw new Error(`Pantry DELETE failed (${res.status}): ${await res.text()}`);
      }
      return true;
    } catch (err) {
      console.error(`Pantry DELETE error for ${basketName}:`, err);
      throw err;
    }
  } else {
    // Local fallback
    const filePath = path.join(LOCAL_STORAGE_DIR, `${basketName}.json`);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch (err) {
        console.error(`Local delete error for ${basketName}:`, err);
        return false;
      }
    }
    return true;
  }
}
