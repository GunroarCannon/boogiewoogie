import { describe, it, expect } from 'vitest';
import { applyOpsToList } from '../../api/lib/ops.js';

describe('Operations Engine', () => {
  it('applies add, edit, check, and tombstone delete ops', () => {
    let list = {
      id: 'list_1',
      title: 'Initial',
      version: 1,
      items: [],
      updatedAt: 1000
    };

    // 1. Add category and todo
    list = applyOpsToList(list, [
      {
        op: 'add_category',
        item: { id: 'c1', type: 'category', text: 'Chores', order: 0 }
      },
      {
        op: 'add_item',
        item: { id: 't1', type: 'todo', text: 'Wash dishes', parentId: 'c1', done: false, order: 0 }
      }
    ]);

    expect(list.items).toHaveLength(2);
    expect(list.version).toBe(2);

    // 2. Edit item & check item
    list = applyOpsToList(list, [
      { op: 'edit_item', id: 't1', text: 'Wash all dishes' },
      { op: 'check_item', id: 't1', done: true, completedAt: 2000 }
    ]);

    const item = list.items.find(i => i.id === 't1');
    expect(item.text).toBe('Wash all dishes');
    expect(item.done).toBe(true);
    expect(item.completedAt).toBe(2000);

    // 3. Delete item (creates tombstone)
    list = applyOpsToList(list, [
      { op: 'delete_item', id: 't1' }
    ]);

    const deletedItem = list.items.find(i => i.id === 't1');
    expect(deletedItem.deleted).toBe(true);
  });

  it('respects last-write-wins by timestamp', () => {
    let list = {
      id: 'list_1',
      title: 'Initial',
      version: 1,
      items: [
        { id: 't1', type: 'todo', text: 'New text', updatedAt: 2000 }
      ],
      updatedAt: 2000
    };

    // Stale op from past
    list = applyOpsToList(list, [
      { op: 'edit_item', id: 't1', text: 'Old text', updatedAt: 1500 }
    ]);

    expect(list.items.find(i => i.id === 't1').text).toBe('New text');

    // Newer op
    list = applyOpsToList(list, [
      { op: 'edit_item', id: 't1', text: 'Freshest text', updatedAt: 2500 }
    ]);

    expect(list.items.find(i => i.id === 't1').text).toBe('Freshest text');
  });
});
