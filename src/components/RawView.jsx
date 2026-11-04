import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { serializeTodoList, parseTodoList } from '../lib/parser.js';

export function RawView({ list, role, onApplyOps }) {
  const isViewOnly = role === 'view';
  const [rawText, setRawText] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState('merge'); // 'merge' or 'replace'
  const [copied, setCopied] = useState(false);

  // Sync rawText with incoming list if not currently actively editing
  useEffect(() => {
    if (!isDirty && list) {
      setRawText(serializeTodoList(list));
    }
  }, [list, isDirty]);

  const handleTextChange = (e) => {
    if (isViewOnly) return;
    const val = e.target.value;
    setRawText(val);
    setIsDirty(true);

    const parsed = parseTodoList(val, list);
    setWarnings(parsed.warnings || []);
  };

  const handleSaveRaw = () => {
    if (isViewOnly) return;
    const parsed = parseTodoList(rawText, list);

    onApplyOps([
      {
        op: 'replace_all',
        title: parsed.title,
        items: parsed.items,
        updatedAt: Date.now()
      }
    ]);
    setIsDirty(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert('Failed to copy to clipboard');
    }
  };

  const handleDownloadTxt = () => {
    const filename = `${(list.title || 'todo').toLowerCase().replace(/\s+/g, '-')}.txt`;
    const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const filename = `${(list.title || 'todo').toLowerCase().replace(/\s+/g, '-')}-backup.json`;
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteImport = () => {
    if (!importText.trim() || isViewOnly) return;
    const parsed = parseTodoList(importText, importMode === 'merge' ? list : null);

    if (importMode === 'replace') {
      onApplyOps([
        {
          op: 'replace_all',
          title: parsed.title,
          items: parsed.items,
          updatedAt: Date.now()
        }
      ]);
    } else {
      // Merge mode: add new items
      const ops = [];
      if (parsed.title && parsed.title !== 'Untitled') {
        ops.push({ op: 'update_title', title: parsed.title, updatedAt: Date.now() });
      }
      for (const item of parsed.items) {
        ops.push({ op: 'add_item', item, updatedAt: Date.now() });
      }
      onApplyOps(ops);
    }

    setShowImportModal(false);
    setImportText('');
    setIsDirty(false);
  };

  const lineCount = (rawText.split('\n') || []).length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 15) }, (_, i) => i + 1);

  return (
    <div style={{ width: '100%', maxWidth: '880px', margin: '0 auto' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button class="action-pill-btn" onClick={handleCopy}>
            {copied ? '✅ Copied!' : '📋 Copy Text'}
          </button>
          <button class="action-pill-btn" onClick={handleDownloadTxt}>
            📥 Download .txt
          </button>
          <button class="action-pill-btn" onClick={handleDownloadJson}>
            💾 Full JSON Backup
          </button>
          {!isViewOnly && (
            <button class="action-pill-btn" onClick={() => setShowImportModal(true)}>
              📤 Import
            </button>
          )}
        </div>

        {!isViewOnly && isDirty && (
          <button
            class="action-pill-btn"
            style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}
            onClick={handleSaveRaw}
          >
            💾 Apply & Save Changes
          </button>
        )}
      </div>

      {/* Warnings bar if parser encountered unstandard lines */}
      {warnings.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          borderLeft: '4px solid var(--accent-amber)',
          color: 'var(--text-primary)',
          padding: '10px 14px',
          borderRadius: '4px',
          marginBottom: '12px',
          fontSize: '0.88rem'
        }}>
          <strong>Notice:</strong> Some lines lack standard prefixes (+, -, #) and are interpreted as notes.
        </div>
      )}

      {/* Editor with line numbers */}
      <div style={{
        display: 'flex',
        backgroundColor: 'var(--paper-bg)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        boxShadow: 'var(--paper-shadow)',
        overflow: 'hidden'
      }}>
        {/* Line Numbers */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          color: 'var(--text-muted)',
          fontFamily: 'var(--mono-font)',
          fontSize: '0.92rem',
          lineHeight: '26px',
          padding: '16px 12px',
          textAlign: 'right',
          userSelect: 'none',
          borderRight: '1px solid rgba(0, 0, 0, 0.08)'
        }}>
          {lineNumbers.map(n => <div key={n}>{n}</div>)}
        </div>

        {/* Text Area */}
        <textarea
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--mono-font)',
            fontSize: '0.92rem',
            lineHeight: '26px',
            padding: '16px 16px',
            outline: 'none',
            resize: 'vertical',
            minHeight: '480px',
            whiteSpace: 'pre'
          }}
          value={rawText}
          disabled={isViewOnly}
          onChange={handleTextChange}
          placeholder="TODO: Title&#10;# Note&#10;+ Category&#10;- [ ] Task"
        />
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div class="modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div class="modal-card" onClick={e => e.stopPropagation()}>
            <div class="modal-header">
              <h2 class="modal-title">Import Todo Text</h2>
              <button class="icon-btn" onClick={() => setShowImportModal(false)}>✕</button>
            </div>

            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
              Paste your raw todo list syntax below, or choose a file:
            </p>

            <input
              type="file"
              accept=".txt,.json,.md"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setImportText(event.target.result);
                  };
                  reader.readAsText(file);
                }
              }}
            />

            <textarea
              style={{
                width: '100%',
                height: '180px',
                fontFamily: 'var(--mono-font)',
                fontSize: '0.88rem',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--text-muted)',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)'
              }}
              placeholder="Paste raw text here..."
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                />
                <span>Merge into current list</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                <span>Replace entire list</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button class="action-pill-btn" onClick={() => setShowImportModal(false)}>
                Cancel
              </button>
              <button
                class="action-pill-btn"
                style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}
                onClick={handleExecuteImport}
              >
                Execute Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
