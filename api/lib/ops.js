/**
 * Operations Engine
 * Applies incremental ops to a list with item-level last-write-wins conflict resolution
 * and tombstone-based deletion tracking.
 */

export function applyOpsToList(listData, ops = []) {
  if (!listData) {
    listData = {
      id: 'list_' + Math.random().toString(36).substring(2, 10),
      title: 'Untitled',
      version: 0,
      items: [],
      updatedAt: Date.now()
    };
  }

  const itemsMap = new Map();
  for (const item of (listData.items || [])) {
    itemsMap.set(item.id, { ...item });
  }

  let listTitle = listData.title || 'Untitled';
  let listUpdatedAt = listData.updatedAt || Date.now();

  for (const op of ops) {
    const now = op.updatedAt || Date.now();
    if (now > listUpdatedAt) listUpdatedAt = now;

    switch (op.op) {
      case 'update_title': {
        if (typeof op.title === 'string' && op.title.trim()) {
          listTitle = op.title.trim();
        }
        break;
      }

      case 'add_item':
      case 'add_category': {
        if (!op.item || !op.item.id) break;
        const existing = itemsMap.get(op.item.id);
        if (!existing || (op.item.updatedAt || now) >= (existing.updatedAt || 0)) {
          itemsMap.set(op.item.id, {
            ...op.item,
            updatedAt: op.item.updatedAt || now,
            createdAt: op.item.createdAt || now,
            deleted: false
          });
        }
        break;
      }

      case 'edit_item': {
        const item = itemsMap.get(op.id);
        if (item) {
          if (now >= (item.updatedAt || 0)) {
            item.text = op.text ?? item.text;
            item.updatedAt = now;
          }
        }
        break;
      }

      case 'check_item': {
        const item = itemsMap.get(op.id);
        if (item) {
          if (now >= (item.updatedAt || 0)) {
            const wasDone = item.done;
            item.done = !!op.done;
            item.updatedAt = now;
            if (item.done && !wasDone) {
              item.completedAt = op.completedAt || now;
            } else if (!item.done) {
              item.completedAt = null;
            }
          }
        }
        break;
      }

      case 'move_item': {
        const item = itemsMap.get(op.id);
        if (item) {
          if (now >= (item.updatedAt || 0)) {
            if (op.parentId !== undefined) item.parentId = op.parentId;
            if (op.order !== undefined) item.order = op.order;
            item.updatedAt = now;
          }
        }
        break;
      }

      case 'reorder_items': {
        if (op.orderMap && typeof op.orderMap === 'object') {
          for (const [id, order] of Object.entries(op.orderMap)) {
            const item = itemsMap.get(id);
            if (item) {
              item.order = order;
              item.updatedAt = now;
            }
          }
        }
        break;
      }

      case 'delete_item': {
        const item = itemsMap.get(op.id);
        if (item) {
          item.deleted = true;
          item.updatedAt = now;
        }
        break;
      }

      case 'replace_all': {
        if (op.title) listTitle = op.title;
        // Mark existing items not in new list as tombstones
        const newIds = new Set((op.items || []).map(i => i.id));
        for (const [id, item] of itemsMap.entries()) {
          if (!newIds.has(id)) {
            item.deleted = true;
            item.updatedAt = now;
          }
        }
        // Add or update all incoming items
        for (const incoming of (op.items || [])) {
          itemsMap.set(incoming.id, {
            ...incoming,
            deleted: false,
            updatedAt: incoming.updatedAt || now
          });
        }
        break;
      }
    }
  }

  // Convert map back to array
  const updatedItems = Array.from(itemsMap.values());

  return {
    ...listData,
    title: listTitle,
    version: (listData.version || 0) + 1,
    items: updatedItems,
    updatedAt: listUpdatedAt
  };
}
