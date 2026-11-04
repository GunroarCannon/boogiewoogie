import { h } from 'preact';
import { useState } from 'preact/hooks';

export function HomeScreen({
  myLists,
  onSelectList,
  onForgetList,
  onCreateList,
  onOpenByKey
}) {
  const [inputKey, setInputKey] = useState('');
  const [keyError, setKeyError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newInitialText, setNewInitialText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenByKey = (e) => {
    e.preventDefault();
    const clean = inputKey.trim();
    if (!clean) {
      setKeyError('Please enter a list key');
      return;
    }
    setKeyError('');
    onOpenByKey(clean);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateList(newTitle.trim(), newInitialText.trim());
      setShowCreate(false);
      setNewTitle('');
      setNewInitialText('');
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '680px',
      margin: '40px auto',
      padding: '0 16px'
    }}>
      {/* Title / Hero */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <h1 style={{
          fontFamily: 'var(--title-font)',
          fontSize: '3.4rem',
          lineHeight: 1.1,
          marginBottom: '8px',
          letterSpacing: '-1px'
        }}>
          📝 Lined Paper
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Minimalist, spring-animated collaborative todo lists on ruled stationery.
        </p>
      </div>

      {/* Action Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Create New List Button Card */}
        <div style={{
          backgroundColor: 'var(--paper-bg)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: 'var(--paper-shadow)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          textAlign: 'center'
        }}>
          {!showCreate ? (
            <div>
              <h3 style={{ fontFamily: 'var(--title-font)', fontSize: '1.8rem', marginBottom: '8px' }}>
                Start a New List
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '16px' }}>
                Creates a new private list with auto-generated edit and view keys.
              </p>
              <button
                class="action-pill-btn"
                style={{
                  backgroundColor: 'var(--accent-blue)',
                  color: 'white',
                  fontSize: '1rem',
                  padding: '10px 24px'
                }}
                onClick={() => setShowCreate(true)}
              >
                ✨ Create New List
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'var(--title-font)', fontSize: '1.8rem' }}>Create New List</h3>
                <button type="button" class="icon-btn" onClick={() => setShowCreate(false)}>✕</button>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>List Title</label>
                <input
                  autoFocus
                  required
                  class="quick-add-input"
                  style={{ width: '100%', fontSize: '1.1rem', marginTop: '4px' }}
                  placeholder="e.g. FOWL PLAY or Vacation Prep"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Initial Raw Tasks (optional)</label>
                <textarea
                  class="quick-add-input"
                  style={{
                    width: '100%',
                    height: '100px',
                    fontFamily: 'var(--mono-font)',
                    fontSize: '0.85rem',
                    marginTop: '4px'
                  }}
                  placeholder="+ Category&#10;- [ ] First task"
                  value={newInitialText}
                  onChange={e => setNewInitialText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" class="action-pill-btn" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  class="action-pill-btn"
                  style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}
                >
                  {isSubmitting ? 'Creating…' : 'Create List'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Open by Key Card */}
        <div style={{
          backgroundColor: 'var(--paper-bg)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: 'var(--paper-shadow)',
          border: '1px solid rgba(0, 0, 0, 0.08)'
        }}>
          <h3 style={{ fontFamily: 'var(--title-font)', fontSize: '1.6rem', marginBottom: '8px' }}>
            Open Existing List
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '14px' }}>
            Enter your edit or view key (e.g. <code>plum-otter-lamp-42</code>):
          </p>

          <form onSubmit={handleOpenByKey} style={{ display: 'flex', gap: '8px' }}>
            <input
              placeholder="Enter your key…"
              class="quick-add-input"
              style={{ flex: 1, fontFamily: 'var(--mono-font)', fontSize: '1rem' }}
              value={inputKey}
              onChange={e => {
                setInputKey(e.target.value);
                setKeyError('');
              }}
            />
            <button
              type="submit"
              class="action-pill-btn"
              style={{ backgroundColor: 'var(--text-primary)', color: 'var(--paper-bg)' }}
            >
              Open
            </button>
          </form>
          {keyError && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '6px' }}>
              {keyError}
            </div>
          )}
        </div>

        {/* My Lists (Saved on this device) */}
        {myLists.length > 0 && (
          <div style={{
            backgroundColor: 'var(--paper-bg)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: 'var(--paper-shadow)',
            border: '1px solid rgba(0, 0, 0, 0.08)'
          }}>
            <h3 style={{ fontFamily: 'var(--title-font)', fontSize: '1.6rem', marginBottom: '16px' }}>
              Recent Lists on this Device
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myLists.map(l => (
                <div
                  key={l.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.03)',
                    border: '1px solid rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <div
                    onClick={() => onSelectList(l.key)}
                    style={{ cursor: 'pointer', flex: 1 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                        {l.title || 'Untitled'}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        backgroundColor: l.role === 'edit' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: l.role === 'edit' ? 'var(--accent-blue)' : 'var(--accent-amber)'
                      }}>
                        {l.role?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'var(--mono-font)' }}>
                      Key: {l.key}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      class="action-pill-btn"
                      onClick={() => onSelectList(l.key)}
                      style={{ fontSize: '0.85rem' }}
                    >
                      Open →
                    </button>
                    <button
                      class="icon-btn danger"
                      title="Forget this list from this device"
                      onClick={() => onForgetList(l.key)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
