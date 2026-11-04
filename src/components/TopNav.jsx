import { h } from 'preact';

export function TopNav({
  title,
  onTitleChange,
  role,
  syncStatus,
  activeView,
  onViewChange,
  darkMode,
  onToggleDarkMode,
  soundEnabled,
  onToggleSound,
  onOpenShare,
  onOpenHistory,
  onOpenHome,
  onNewList
}) {
  const isViewOnly = role === 'view';

  return (
    <header class="app-topbar">
      <div class="topbar-left">
        <button
          class="icon-btn"
          title="My Lists"
          onClick={onOpenHome}
          style={{ fontSize: '1.2rem', padding: '6px' }}
        >
          📁
        </button>

        <div class="sync-badge" title={`Status: ${syncStatus}`}>
          <svg
            class={`sync-paperclip ${syncStatus === 'saving' ? 'pulsing' : ''}`}
            viewBox="0 0 24 24"
          >
            <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V6H9v9.5a3 3 0 0 0 6 0V5a4 4 0 0 0-8 0v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
          </svg>
          <span style={{ textTransform: 'capitalize' }}>
            {syncStatus === 'saving' ? 'Saving…' : syncStatus === 'offline' ? 'Offline' : syncStatus === 'error' ? 'Sync error' : 'Synced'}
          </span>
        </div>

        {isViewOnly && (
          <span class="view-only-ribbon">
            👁️ Viewing Only
          </span>
        )}
      </div>

      <nav class="topbar-nav">
        <button
          class={`nav-tab-btn ${activeView === 'paper' ? 'active' : ''}`}
          onClick={() => onViewChange('paper')}
        >
          📝 Paper
        </button>
        <button
          class={`nav-tab-btn ${activeView === 'raw' ? 'active' : ''}`}
          onClick={() => onViewChange('raw')}
        >
          📄 Raw
        </button>
        <button
          class={`nav-tab-btn ${activeView === 'graph' ? 'active' : ''}`}
          onClick={() => onViewChange('graph')}
        >
          📊 Graph
        </button>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          class="icon-btn"
          title={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
          onClick={onToggleSound}
        >
          {soundEnabled ? '🔔' : '🔕'}
        </button>

        <button
          class="icon-btn"
          title={darkMode ? 'Switch to Day Paper' : 'Switch to Night Paper'}
          onClick={onToggleDarkMode}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        <button
          class="icon-btn"
          title="Share list or view keys"
          onClick={onOpenShare}
        >
          🔗
        </button>

        {role === 'edit' && (
          <button
            class="icon-btn"
            title="Version History & Restore"
            onClick={onOpenHistory}
          >
            ⏳
          </button>
        )}

        <button
          class="icon-btn"
          title="Create New List"
          onClick={onNewList}
          style={{ fontWeight: 'bold' }}
        >
          ➕
        </button>
      </div>
    </header>
  );
}
