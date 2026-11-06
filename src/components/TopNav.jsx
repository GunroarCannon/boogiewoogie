import { h } from 'preact';
import {
  HomeIcon,
  NotebookIcon,
  ScriptIcon,
  ChartIcon,
  EyeIcon,
  SunIcon,
  MoonIcon,
  VolumeIcon,
  VolumeOffIcon,
  LinkIcon,
  ClockIcon,
  PlusIcon,
  HelpCircleIcon,
  UndoIcon,
  RedoIcon
} from './Icons.jsx';

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
  onNewList,
  onOpenTour,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) {
  const isViewOnly = role === 'view';

  return (
    <header class="app-topbar">
      <div class="topbar-left">
        <button
          class="icon-btn"
          title="My Lists"
          onClick={onOpenHome}
          style={{ padding: '6px' }}
        >
          <HomeIcon size={20} />
        </button>

        <span
          onClick={onOpenHome}
          style={{
            fontFamily: 'var(--comic-font)',
            fontSize: '1.45rem',
            letterSpacing: '1.5px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            marginLeft: '2px',
            marginRight: '4px',
            lineHeight: 1,
            userSelect: 'none'
          }}
          title="Boogiewoogie - simple todo app"
        >
          Boogiewoogie
        </span>

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
            <EyeIcon size={14} /> Viewing Only
          </span>
        )}
      </div>

      <nav class="topbar-nav">
        <button
          class={`nav-tab-btn paper-nav-btn ${activeView === 'paper' ? 'active' : ''}`}
          onClick={() => onViewChange('paper')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <NotebookIcon size={16} /> Paper
        </button>
        <button
          class={`nav-tab-btn raw-nav-btn ${activeView === 'raw' ? 'active' : ''}`}
          onClick={() => onViewChange('raw')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ScriptIcon size={16} /> Raw
        </button>
        <button
          class={`nav-tab-btn graph-nav-btn ${activeView === 'graph' ? 'active' : ''}`}
          onClick={() => onViewChange('graph')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ChartIcon size={16} /> Graph
        </button>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!isViewOnly && (
          <>
            <button
              class="icon-btn"
              title="Undo (Ctrl+Z)"
              onClick={onUndo}
              disabled={!canUndo}
              style={{ opacity: canUndo ? 1 : 0.35 }}
            >
              <UndoIcon size={20} />
            </button>
            <button
              class="icon-btn"
              title="Redo (Ctrl+Y)"
              onClick={onRedo}
              disabled={!canRedo}
              style={{ opacity: canRedo ? 1 : 0.35 }}
            >
              <RedoIcon size={20} />
            </button>
          </>
        )}
        <button
          class="icon-btn tour-nav-btn"
          title="App Walkthrough & Guide"
          onClick={onOpenTour}
        >
          <HelpCircleIcon size={18} />
        </button>

        <button
          class="icon-btn"
          title={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
          onClick={onToggleSound}
        >
          {soundEnabled ? <VolumeIcon size={18} /> : <VolumeOffIcon size={18} />}
        </button>

        <button
          class="icon-btn"
          title={darkMode ? 'Switch to Day Paper' : 'Switch to Night Paper'}
          onClick={onToggleDarkMode}
        >
          {darkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>

        <button
          class="icon-btn share-nav-btn"
          title="Share list or view keys"
          onClick={onOpenShare}
        >
          <LinkIcon size={18} />
        </button>

        {role === 'edit' && (
          <button
            class="icon-btn"
            title="Version History & Restore"
            onClick={onOpenHistory}
          >
            <ClockIcon size={18} />
          </button>
        )}

        <button
          class="icon-btn"
          title="Create New List"
          onClick={onNewList}
        >
          <PlusIcon size={18} />
        </button>
      </div>
    </header>
  );
}
