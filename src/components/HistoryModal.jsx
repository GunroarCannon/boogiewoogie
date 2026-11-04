import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export function HistoryModal({
  isOpen,
  onClose,
  activeKey,
  onSnapshotRestored
}) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (isOpen && activeKey) {
      loadHistory();
    }
  }, [isOpen, activeKey]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history', {
        headers: { 'x-list-key': activeKey }
      });
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
      }
    } catch (e) {
      console.warn('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (snapshot) => {
    const formattedDate = new Date(snapshot.timestamp).toLocaleString();
    if (!confirm(`Are you sure you want to restore the snapshot from ${formattedDate}? Your current list will be replaced with this version.`)) {
      return;
    }

    setRestoring(true);
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-list-key': activeKey
        },
        body: JSON.stringify({ timestamp: snapshot.timestamp })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');

      onSnapshotRestored(data.list);
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div class="modal-backdrop" onClick={onClose}>
      <div class="modal-card" onClick={e => e.stopPropagation()}>
        <div class="modal-header">
          <h2 class="modal-title">Version History</h2>
          <button class="icon-btn" onClick={onClose}>✕</button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Up to 30 snapshots are automatically preserved. You can restore your list to any previous point in time.
        </p>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading history snapshots…
          </div>
        ) : snapshots.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No snapshots recorded yet. Snapshots are created as you work.
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '360px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {snapshots.map((s, idx) => (
              <div
                key={s.timestamp}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  border: '1px solid rgba(0, 0, 0, 0.06)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                    {idx === 0 ? 'Current / Recent' : `Version ${s.version}`}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {new Date(s.timestamp).toLocaleString()} • {s.itemCount} items ({s.doneCount} completed)
                  </div>
                </div>

                <button
                  class="action-pill-btn"
                  disabled={restoring}
                  onClick={() => handleRestore(s)}
                  style={{ fontSize: '0.82rem', padding: '4px 12px' }}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
