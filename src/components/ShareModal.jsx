import { h } from 'preact';
import { useState } from 'preact/hooks';
import {
  XIcon,
  DownloadIcon,
  RefreshIcon,
  EyeIcon,
  EyeOffIcon,
  LinkIcon,
  CopyIcon,
  CheckIcon
} from './Icons.jsx';

export function ShareModal({
  isOpen,
  onClose,
  listTitle,
  activeKey,
  role,
  onRotateKey
}) {
  const [showEditKey, setShowEditKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const isEditor = role === 'edit';

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${currentOrigin}/#k=${encodeURIComponent(activeKey || '')}`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      alert('Failed to copy');
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(activeKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (e) {
      alert('Failed to copy');
    }
  };

  const downloadKeysTxt = () => {
    const content = `LINED PAPER TODO - ACCESS KEYS
List: ${listTitle}
Saved: ${new Date().toLocaleString()}

Current Key: ${activeKey}
Role: ${role}
Direct URL: ${shareUrl}

IMPORTANT: Keep this key safe. Anyone with the edit key can modify or delete your list.`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(listTitle || 'todo').toLowerCase().replace(/\s+/g, '-')}-keys.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRotate = async () => {
    if (!confirm('Rotating will generate a new key. The old key will immediately stop working. Continue?')) {
      return;
    }
    setIsRotating(true);
    try {
      const res = await fetch('/api/keys/rotate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-list-key': activeKey
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rotate');
      onRotateKey(data.newKey);
      alert(`Key rotated successfully! Your new key is:\n${data.newKey}`);
    } catch (e) {
      alert(e.message);
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div class="modal-backdrop" onClick={onClose}>
      <div class="modal-card" onClick={e => e.stopPropagation()}>
        <div class="modal-header">
          <h2 class="modal-title">Share & Access Keys</h2>
          <button class="icon-btn" onClick={onClose}><XIcon size={18} /></button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Access to this lined paper todo is protected by readable secret keys.
        </p>

        {/* Shareable Link Box */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid rgba(0, 0, 0, 0.08)'
        }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
            DIRECT SHARE LINK ({role.toUpperCase()})
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <input
              readOnly
              class="quick-add-input"
              style={{ fontSize: '0.85rem' }}
              value={shareUrl}
            />
            <button class="action-pill-btn" onClick={copyShareLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {copiedLink ? <><CheckIcon size={15} /> Copied!</> : <><LinkIcon size={15} /> Copy Link</>}
            </button>
          </div>
        </div>

        {/* Current Key Box */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
              CURRENT KEY ({role.toUpperCase()})
            </label>
            <button
              class="icon-btn"
              onClick={() => setShowEditKey(!showEditKey)}
              style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              {showEditKey ? <><EyeOffIcon size={14} /> Hide</> : <><EyeIcon size={14} /> Reveal</>}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <input
              readOnly
              type={showEditKey ? 'text' : 'password'}
              class="quick-add-input"
              style={{ fontFamily: 'var(--mono-font)', fontWeight: 'bold' }}
              value={activeKey}
            />
            <button class="action-pill-btn" onClick={copyKey} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {copiedKey ? <><CheckIcon size={15} /> Copied!</> : 'Copy'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          <button
            class="action-pill-btn"
            style={{ justifyContent: 'center', border: '1px solid var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            onClick={downloadKeysTxt}
          >
            <DownloadIcon size={16} /> Download Keys Backup (.txt)
          </button>

          {isEditor && (
            <button
              class="action-pill-btn"
              disabled={isRotating}
              onClick={handleRotate}
              style={{ justifyContent: 'center', color: 'var(--accent-amber)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshIcon size={16} /> Rotate Key (Invalidate Old Key)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
