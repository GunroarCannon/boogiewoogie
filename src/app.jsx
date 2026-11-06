import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { ClientSync } from './lib/clientSync.js';
import { TopNav } from './components/TopNav.jsx';
import { PaperView } from './components/PaperView.jsx';
import { RawView } from './components/RawView.jsx';
import { GraphView } from './components/GraphView.jsx';
import { AgentDrawer } from './components/AgentDrawer.jsx';
import { ShareModal } from './components/ShareModal.jsx';
import { HistoryModal } from './components/HistoryModal.jsx';
import { HomeScreen } from './components/HomeScreen.jsx';
import { Walkthrough } from './components/Walkthrough.jsx';
import { SparklesIcon, MicIcon } from './components/Icons.jsx';
import { initSoundPreference, setSoundEnabled, isSoundEnabled } from './lib/sound.js';

export function App() {
  const syncRef = useRef(null);
  if (!syncRef.current) {
    syncRef.current = new ClientSync();
  }
  const sync = syncRef.current;

  const [list, setList] = useState(null);
  const [role, setRole] = useState('edit');
  const [syncStatus, setSyncStatus] = useState('synced');
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [activeKey, setActiveKey] = useState(null);
  const [activeView, setActiveView] = useState('paper'); // 'paper' | 'raw' | 'graph'
  const [myLists, setMyLists] = useState([]);
  const [isHomeOpen, setIsHomeOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Modals
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);

  // Sound & Dark mode
  const [darkMode, setDarkMode] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    // 1. Init sound & dark mode preferences
    setSoundOn(initSoundPreference());
    try {
      const savedDark = localStorage.getItem('lined_paper_dark') === '1';
      setDarkMode(savedDark);
      if (savedDark) document.body.classList.add('dark-mode');
    } catch (e) {}

    // 2. Subscribe to sync engine
    const unsubscribe = sync.subscribe((state) => {
      setList(state.list);
      setRole(state.role);
      setSyncStatus(state.syncStatus);
      setActiveKey(state.key);
      setHistory({ canUndo: !!state.canUndo, canRedo: !!state.canRedo });
      setMyLists(sync.getMyLists());
    });

    // 3. Check URL hash for direct key link (#k=... or #v=...)
    const hash = window.location.hash;
    let initialKey = null;
    if (hash.startsWith('#k=')) {
      initialKey = decodeURIComponent(hash.substring(3));
    } else if (hash.startsWith('#v=')) {
      initialKey = decodeURIComponent(hash.substring(3));
    }

    // If no hash key, check localStorage for active key
    if (!initialKey) {
      try {
        initialKey = localStorage.getItem('lined_paper_active_key');
      } catch (e) {}
    }

    if (initialKey) {
      sync.loadInitial(initialKey).catch(() => {
        setIsHomeOpen(true);
      });
    } else {
      setIsHomeOpen(true);
    }

    setMyLists(sync.getMyLists());

    // Check if walkthrough should be shown
    try {
      if (localStorage.getItem('boogiewoogie_tour_seen') !== '1') {
        setTimeout(() => setIsTourOpen(true), 800);
      }
    } catch (e) {}

    // 4. Keyboard Shortcuts
    const handleKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = (e.key || '').toLowerCase();
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (mod && k === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) sync.redo(); else sync.undo();
      } else if (mod && k === 'y' && !typing) {
        e.preventDefault();
        sync.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsAgentOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsAgentOpen(false);
        setIsShareOpen(false);
        setIsHistoryOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleToggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    try {
      localStorage.setItem('lined_paper_dark', nextDark ? '1' : '0');
    } catch (e) {}
  };

  const handleToggleSound = () => {
    const nextSound = !soundOn;
    setSoundOn(nextSound);
    setSoundEnabled(nextSound);
  };

  const handleOpenByKey = async (key) => {
    try {
      await sync.loadInitial(key);
      setIsHomeOpen(false);
      window.location.hash = `#k=${encodeURIComponent(key)}`;
    } catch (err) {
      alert('Could not open list: ' + err.message);
    }
  };

  const handleCreateNewList = async (title, text) => {
    const res = await fetch('/api/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, text })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create list');

    await sync.loadInitial(data.editKey);
    setIsHomeOpen(false);
    window.location.hash = `#k=${encodeURIComponent(data.editKey)}`;
  };

  const handleForgetList = (key) => {
    sync.removeFromMyLists(key);
    setMyLists(sync.getMyLists());
    if (activeKey === key) {
      setList(null);
      setIsHomeOpen(true);
    }
  };

  const handleApplyOps = (ops) => {
    sync.applyOps(ops);
  };

  return (
    <div class="desk-wrapper">
      {/* If Home screen is open or no list is loaded */}
      {isHomeOpen || !list ? (
        <HomeScreen
          myLists={myLists}
          onSelectList={(key) => handleOpenByKey(key)}
          onForgetList={handleForgetList}
          onCreateList={handleCreateNewList}
          onOpenByKey={(key) => handleOpenByKey(key)}
          onOpenTour={() => setIsTourOpen(true)}
        />
      ) : (
        <>
          <TopNav
            title={list.title}
            role={role}
            syncStatus={syncStatus}
            activeView={activeView}
            onViewChange={setActiveView}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
            soundEnabled={soundOn}
            onToggleSound={handleToggleSound}
            onOpenShare={() => setIsShareOpen(true)}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onOpenHome={() => setIsHomeOpen(true)}
            onNewList={() => setIsHomeOpen(true)}
            onOpenTour={() => setIsTourOpen(true)}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={() => sync.undo()}
            onRedo={() => sync.redo()}
          />

          <main style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {activeView === 'paper' && (
              <PaperView
                list={list}
                role={role}
                onApplyOps={handleApplyOps}
              />
            )}
            {activeView === 'raw' && (
              <RawView
                list={list}
                role={role}
                onApplyOps={handleApplyOps}
              />
            )}
            {activeView === 'graph' && (
              <GraphView
                list={list}
                role={role}
                onApplyOps={handleApplyOps}
              />
            )}
          </main>

          {/* Floating Action Bar */}
          <div class="floating-bottom-bar">
            <button
              class="action-pill-btn floating-agent-btn"
              onClick={() => setIsAgentOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <SparklesIcon size={18} /> Ask Assistant (Ctrl+K)
            </button>

            <button
              class="mic-float-btn floating-agent-btn"
              onClick={() => setIsAgentOpen(true)}
              title="Voice & Chat Assistant"
            >
              <MicIcon size={20} />
            </button>
          </div>

          {/* Agent Slide-up Drawer */}
          <AgentDrawer
            isOpen={isAgentOpen}
            onClose={() => setIsAgentOpen(false)}
            list={list}
            role={role}
            onApplyOps={handleApplyOps}
            onUndo={() => sync.undo()}
            onRedo={() => sync.redo()}
          />

          {/* Share Modal */}
          <ShareModal
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            listTitle={list.title}
            activeKey={activeKey}
            role={role}
            onRotateKey={(newKey) => {
              sync.setKey(newKey);
              window.location.hash = `#k=${encodeURIComponent(newKey)}`;
            }}
          />

          {/* History Modal */}
          <HistoryModal
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            activeKey={activeKey}
            onSnapshotRestored={(restoredList) => {
              sync.list = restoredList;
              sync.notify();
            }}
          />
        </>
      )}

      {/* Interactive Walkthrough Tour */}
      <Walkthrough
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />
    </div>
  );
}
