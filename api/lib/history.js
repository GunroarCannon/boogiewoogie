/**
 * Snapshot & History Management
 * Keeps last 30 snapshots of each list in a separate basket
 */

import { getBasket, putBasket } from './storage.js';

const MAX_SNAPSHOTS = 30;

export async function saveSnapshot(listId, listData) {
  const historyBasketName = `hist_${listId}`;
  try {
    let history = await getBasket(historyBasketName);
    if (!history || !Array.isArray(history.snapshots)) {
      history = { listId, snapshots: [] };
    }

    const items = listData.items || [];
    const activeItems = items.filter(i => !i.deleted);
    const todoItems = activeItems.filter(i => i.type === 'todo');

    const newSnapshot = {
      timestamp: Date.now(),
      version: listData.version || 1,
      title: listData.title,
      itemCount: activeItems.length,
      doneCount: todoItems.filter(i => i.done).length,
      totalTodos: todoItems.length,
      data: {
        title: listData.title,
        items: listData.items
      }
    };

    // Keep only last MAX_SNAPSHOTS
    history.snapshots.unshift(newSnapshot);
    if (history.snapshots.length > MAX_SNAPSHOTS) {
      history.snapshots = history.snapshots.slice(0, MAX_SNAPSHOTS);
    }

    await putBasket(historyBasketName, history);
    return true;
  } catch (err) {
    console.error(`Failed to save snapshot for ${listId}:`, err);
    return false;
  }
}

export async function getSnapshots(listId) {
  const historyBasketName = `hist_${listId}`;
  const history = await getBasket(historyBasketName);
  if (!history || !Array.isArray(history.snapshots)) {
    return [];
  }
  return history.snapshots;
}
