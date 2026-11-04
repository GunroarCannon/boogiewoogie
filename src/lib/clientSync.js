/**
 * Client Sync Engine
 * Handles optimistic updates, offline operation queue, 4-second adaptive polling,
 * and localStorage list registry.
 */

import { applyOpsToList } from '../../api/lib/ops.js';

const STORAGE_KEY_LISTS = 'lined_paper_my_lists';
const STORAGE_KEY_ACTIVE = 'lined_paper_active_key';

export class ClientSync {
  constructor(initialKey = null) {
    this.key = initialKey;
    this.role = 'edit';
    this.list = null;
    this.queue = [];
    this.syncStatus = 'synced'; // 'synced' | 'saving' | 'offline' | 'error'
    this.listeners = new Set();
    this.pollTimer = null;
    this.isPolling = false;
    this.lastSuccessfulSync = Date.now();
    this.historyStack = []; // For client-side undo
    
    // Load queue from localStorage if any
    this.loadOfflineQueue();

    // Listen to network changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener({
        list: this.list,
        role: this.role,
        syncStatus: this.syncStatus,
        key: this.key,
        queueLength: this.queue.length
      });
    }
  }

  setKey(key) {
    this.key = key;
    if (key) {
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE, key);
      } catch (e) {}
    }
    this.startPolling();
  }

  async loadInitial(key) {
    this.setKey(key);
    this.syncStatus = 'saving';
    this.notify();

    try {
      const res = await fetch(`/api/list?key=${encodeURIComponent(key)}`, {
        headers: { 'x-list-key': key }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        this.syncStatus = 'error';
        this.notify();
        throw new Error(errData.error || 'Failed to open list');
      }

      const data = await res.json();
      this.list = data;
      this.role = data.role || 'edit';
      this.syncStatus = 'synced';
      this.lastSuccessfulSync = Date.now();

      // Save to My Lists
      this.saveToMyLists({
        id: data.id,
        title: data.title,
        key: this.key,
        role: this.role,
        lastOpened: Date.now()
      });

      this.notify();
      // Flush any queued offline ops
      await this.flushQueue();
      return data;
    } catch (err) {
      if (!navigator.onLine) {
        this.syncStatus = 'offline';
      } else {
        this.syncStatus = 'error';
      }
      this.notify();
      throw err;
    }
  }

  /**
   * Apply operations optimistically and queue for server sync
   */
  async applyOps(ops) {
    if (!ops || ops.length === 0) return;
    if (this.role !== 'edit') {
      console.warn('Cannot apply ops in view-only mode');
      return;
    }

    // Push previous state for undo
    if (this.list) {
      this.historyStack.push(JSON.parse(JSON.stringify(this.list)));
      if (this.historyStack.length > 50) this.historyStack.shift();
    }

    // 1. Optimistic local update
    this.list = applyOpsToList(this.list, ops);
    this.syncStatus = 'saving';
    this.notify();

    // 2. Queue ops
    this.queue.push(...ops);
    this.saveOfflineQueue();

    // 3. Send to server
    await this.flushQueue();
  }

  undo() {
    if (this.historyStack.length === 0) return false;
    const previous = this.historyStack.pop();
    if (!previous) return false;

    // Send replace_all op
    this.applyOps([
      {
        op: 'replace_all',
        title: previous.title,
        items: previous.items,
        updatedAt: Date.now()
      }
    ]);
    return true;
  }

  async flushQueue() {
    if (this.queue.length === 0 || !this.key || this.role !== 'edit') {
      this.syncStatus = 'synced';
      this.notify();
      return;
    }

    if (!navigator.onLine) {
      this.syncStatus = 'offline';
      this.notify();
      return;
    }

    const opsToSend = [...this.queue];

    try {
      const res = await fetch('/api/list', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-list-key': this.key
        },
        body: JSON.stringify({ ops: opsToSend })
      });

      if (!res.ok) {
        if (res.status === 403) {
          this.role = 'view';
          this.queue = [];
          this.saveOfflineQueue();
          this.syncStatus = 'error';
          this.notify();
          return;
        }
        throw new Error('Sync failed with status ' + res.status);
      }

      const serverList = await res.json();
      // Remove sent ops from queue
      this.queue.splice(0, opsToSend.length);
      this.saveOfflineQueue();

      this.list = serverList;
      this.syncStatus = 'synced';
      this.lastSuccessfulSync = Date.now();
      this.notify();
    } catch (err) {
      console.warn('Flush queue error, will retry:', err);
      this.syncStatus = navigator.onLine ? 'error' : 'offline';
      this.notify();
    }
  }

  startPolling() {
    this.stopPolling();
    const poll = async () => {
      if (document.hidden) {
        // Tab hidden, backoff to 15s
        this.pollTimer = setTimeout(poll, 15000);
        return;
      }

      if (this.key && navigator.onLine && this.queue.length === 0) {
        try {
          const res = await fetch(`/api/list?key=${encodeURIComponent(this.key)}`, {
            headers: { 'x-list-key': this.key }
          });
          if (res.ok) {
            const serverData = await res.json();
            if (this.list && serverData.version > (this.list.version || 0)) {
              this.list = serverData;
              this.syncStatus = 'synced';
              this.lastSuccessfulSync = Date.now();
              this.notify();
            }
          }
        } catch (e) {
          // Poll failed silently, keep existing state
        }
      }

      this.pollTimer = setTimeout(poll, 4000);
    };

    this.pollTimer = setTimeout(poll, 4000);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  handleNetworkChange(online) {
    if (online) {
      this.flushQueue();
      this.startPolling();
    } else {
      this.syncStatus = 'offline';
      this.notify();
    }
  }

  handleVisibilityChange() {
    if (!document.hidden && this.key) {
      // Woke up, poll immediately
      this.startPolling();
    }
  }

  saveOfflineQueue() {
    try {
      localStorage.setItem(`lined_paper_queue_${this.key}`, JSON.stringify(this.queue));
    } catch (e) {}
  }

  loadOfflineQueue() {
    try {
      const saved = localStorage.getItem(`lined_paper_queue_${this.key}`);
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (e) {}
  }

  // --- Local Storage "My Lists" Registry ---
  getMyLists() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LISTS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  saveToMyLists(entry) {
    const lists = this.getMyLists();
    const index = lists.findIndex(l => l.key === entry.key || (entry.id && l.id === entry.id));
    if (index >= 0) {
      lists[index] = { ...lists[index], ...entry, lastOpened: Date.now() };
    } else {
      lists.unshift({ ...entry, lastOpened: Date.now() });
    }
    try {
      localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(lists.slice(0, 20)));
    } catch (e) {}
  }

  removeFromMyLists(key) {
    const lists = this.getMyLists().filter(l => l.key !== key);
    try {
      localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(lists));
    } catch (e) {}
  }
}
