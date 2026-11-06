import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { serializeTodoList, parseTodoList } from '../lib/parser.js';
import {
  ClipboardIcon,
  DownloadIcon,
  UploadIcon,
  CheckIcon,
  XIcon
} from './Icons.jsx';

export function RawView({ list, role, onApplyOps }) {
  const isViewOnly = role === 'view';
  const [rawText, setRawText] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState('merge'); // 'merge' or 'replace'
  const [copied, setCopied] = useState(false);

  // References to preserve state across unmount/view switches
  const rawTextRef = useRef(rawText);
  rawTextRef.current = rawText;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const listRef = useRef(list);
  listRef.current = list;
  const onApplyOpsRef = useRef(onApplyOps);
  onApplyOpsRef.current = onApplyOps;

  // Sync rawText with incoming list if not actively typing
  useEffect(() => {
    if (!isDirty && list) {
      setRawText(serializeTodoList(list));
    }
  }, [list, isDirty]);

  // AUTO-SAVE ON UNMOUNT (switching to Paper or Graph or Home never wipes edits)
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && !isViewOnly && rawTextRef.current) {
        try {
          const parsed = parseTodoList(rawTextRef.current, listRef.current);
          onApplyOpsRef.current([
            {
              op: 'replace_all',
              title: parsed.title,
              items: parsed.items,
              updatedAt: Date.now()
            }
          ]);
        } catch (e) {
          console.warn('Auto-save on unmount failed:', e);
        }
      }
    };
  }, []);

  // Debounced auto-save (1200ms after last keystroke)
  useEffect(() => {
    if (!isDirty || isViewOnly) return;
    const timer = setTimeout(() => {
      handleSaveRaw();
    }, 1200);
    return () => clearTimeout(timer);
  }, [rawText, isDirty]);

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
      const existingTexts = new Set((list.items || []).map(i => i.text.toLowerCase().trim()));
      const newItemsToAdd = parsed.items.filter(i => !existingTexts.has(i.text.toLowerCase().trim()));
      const ops = newItemsToAdd.map(item => ({
        op: 'add',
        item: { ...item, updatedAt: Date.now() }
      }));
      if (ops.length > 0) {
        onApplyOps(ops);
      }
    }

    setShowImportModal(false);
    setImportText('');
    setIsDirty(false);
  };

  const lineCount = (rawText.split('\n') || []).length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 15) }, (_, i) => i + 1);

  return (
    <div style={{ width: '100%', maxWidth: '880px', margin: '0 auto', position: 'relative' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Prominent, Obvious Save Button */}
          {!isViewOnly && (
            <button
              class="action-pill-btn"
              style={{
                backgroundColor: isDirty ? 'var(--accent-blue)' : '#10b981',
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: 600,
                padding: '8px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isDirty ? '0 0 14px rgba(59, 130, 246, 0.55)' : 'none',
                transform: isDirty ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.2s ease',
                cursor: isDirty ? 'pointer' : 'default'
              }}
              onClick={isDirty ? handleSaveRaw : undefined}
              title={isDirty ? 'Click to save immediately (also auto-saves in 1s)' : 'All edits are saved and synced'}
            >
              <CheckIcon size={18} />
              {isDirty ? 'Save Raw Changes (Unsaved)' : 'All Changes Saved'}
            </button>
          )}

          <button class="action-pill-btn" onClick={handleCopy} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {copied ? <><CheckIcon size={16} /> Copied!</> : <><ClipboardIcon size={16} /> Copy Text</>}
          </button>
          <button class="action-pill-btn" onClick={handleDownloadTxt} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <DownloadIcon size={16} /> Download .txt
          </button>
          <button class="action-pill-btn" onClick={handleDownloadJson} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <DownloadIcon size={16} /> JSON Backup
          </button>
          {!isViewOnly && (
            <button class="action-pill-btn" onClick={() => setShowImportModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <UploadIcon size={16} /> Import
            </button>
          )}
        </div>
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
        border: isDirty ? '2px solid var(--accent-blue)' : '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        boxShadow: 'var(--paper-shadow)',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease'
      }}>
        {/* Line numbers gutter */}
        <div style={{
          padding: '16px 10px',
          backgroundColor: 'rgba(0, 0, 0, 0.03)',
          borderRight: '1px solid rgba(0, 0, 0, 0.08)',
          fontFamily: 'var(--mono-font)',
          fontSize: '0.88rem',
          lineHeight: '26px',
          color: 'var(--text-muted)',
          textAlign: 'right',
          userSelect: 'none',
          minWidth: '40px'
        }}>
          {lineNumbers.map(n => (
            <div key={n}>{n}</div>
          ))}
        </div>

        {/* Text area */}
        <textarea
          value={rawText}
          onInput={handleTextChange}
          readOnly={isViewOnly}
          style={{
            flex: 1,
            padding: '16px 14px',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            fontFamily: 'var(--mono-font)',
            fontSize: '0.94rem',
            lineHeight: '26px',
            resize: 'vertical',
            minHeight: '420px',
            tabSize: 2
          }}
          placeholder="TODO: Title&#10;+ Category&#10;- [ ] Task name&#10;- [x] Completed task&#10;# Pinned note"
        />
      </div>

      {/* Floating Save Reminder banner when dirty */}
      {!isViewOnly && isDirty && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: '#1e293b',
          color: '#f8fafc',
          padding: '10px 20px',
          borderRadius: '50px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
            Unsaved edits in Raw text (auto-saving in 1s…)
          </span>
          <button
            class="action-pill-btn"
            style={{
              backgroundColor: 'var(--accent-blue)',
              color: 'white',
              fontWeight: 600,
              padding: '6px 14px',
              fontSize: '0.86rem'
            }}
            onClick={handleSaveRaw}
          >
            Save Now
          </button>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div class="modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div class="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--title-font)', fontSize: '1.8rem' }}>Import Text List</h3>
              <button class="icon-btn" onClick={() => setShowImportModal(false)}><XIcon size={18} /></button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '12px' }}>
              Paste raw markdown text below to import into this list.
            </p>

            <textarea
              value={importText}
              onInput={e => setImportText(e.target.value)}
              style={{
                width: '100%',
                height: '180px',
                padding: '12px',
                fontFamily: 'var(--mono-font)',
                fontSize: '0.88rem',
                backgroundColor: 'var(--paper-bg)',
                color: 'var(--text-primary)',
                border: '1px solid rgba(0, 0, 0, 0.15)',
                borderRadius: '8px',
                marginBottom: '16px'
              }}
              placeholder="Paste raw todo text here..."
            />

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                />
                <span>Merge with existing</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                <span>Replace entire list</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button class="action-pill-btn" onClick={() => setShowImportModal(false)}>Cancel</button>
              <button
                class="action-pill-btn"
                style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}
                onClick={handleExecuteImport}
              >
                Apply Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
