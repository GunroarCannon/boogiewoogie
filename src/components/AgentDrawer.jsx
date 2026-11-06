import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { playPop, playScratch, playChime } from '../lib/sound.js';
import {
  SparklesIcon,
  UndoIcon,
  RedoIcon,
  XIcon,
  MicIcon,
  StopIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon
} from './Icons.jsx';

export function AgentDrawer({
  isOpen,
  onClose,
  list,
  role,
  onApplyOps,
  onUndo,
  onRedo
}) {
  const isViewOnly = role === 'view';
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm your paper assistant. Speak or type instructions like "add fix collision under Physics", "mark wash dishes done", or ask "what's left?".`
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [proposedDiff, setProposedDiff] = useState(null);
  const [autoApply, setAutoApply] = useState(true);
  const [lastApplied, setLastApplied] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    try {
      const savedAuto = localStorage.getItem('lined_paper_auto_apply');
      if (savedAuto !== null) setAutoApply(savedAuto === '1');
    } catch (e) {}
  }, []);

  const handleToggleAutoApply = () => {
    const nextVal = !autoApply;
    setAutoApply(nextVal);
    try {
      localStorage.setItem('lined_paper_auto_apply', nextVal ? '1' : '0');
    } catch (e) {}
  };

  // --- Voice Recording & Waveform ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Set up AudioContext Analyser for bouncy waveform
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      drawWaveform();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleAudioTranscribe(audioBlob, mimeType);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access failed, trying browser SpeechRecognition:', err);
      fallbackBrowserSpeech();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };
    render();
  };

  const fallbackBrowserSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      sendMessage(transcript);
    };
    recognition.onerror = () => {
      alert('Could not capture audio. Please type your command.');
    };
  };

  const handleAudioTranscribe = async (blob, mimeType) => {
    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64Data, mimeType })
        });

        const data = await res.json();
        if (data.text) {
          sendMessage(data.text);
        } else if (data.fallback) {
          fallbackBrowserSpeech();
        } else {
          throw new Error(data.error || 'Transcription failed');
        }
      };
    } catch (err) {
      console.warn('Transcribe error:', err);
      fallbackBrowserSpeech();
    } finally {
      setIsLoading(false);
    }
  };

  // --- Send Message to AI Agent ---
  const sendMessage = async (userText) => {
    const text = (userText || inputText).trim();
    if (!text) return;

    const newMsgs = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    setInputText('');
    setIsLoading(true);
    setProposedDiff(null);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          conversation: newMsgs,
          listContext: {
            title: list.title,
            items: list.items
          }
        })
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);

      if (data.actions && data.actions.length > 0 && role === 'edit') {
        const mappedOps = convertActionsToOps(data.actions, list);
        if (autoApply) {
          applyGeneratedOps(mappedOps);
        } else {
          setProposedDiff({ actions: data.actions, ops: mappedOps });
        }
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I ran into an error processing your request. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const convertActionsToOps = (actions, currentList) => {
    const ops = [];
    const activeItems = (currentList.items || []).filter(i => !i.deleted);
    const categories = activeItems.filter(i => i.type === 'category');

    let orderCursor = activeItems.length;
    const createdCats = new Map();
    const itemById = new Map(activeItems.map(i => [i.id, i]));
    const findCat = (name) => {
      const lower = String(name).toLowerCase().trim();
      return categories.find(c => c.text.toLowerCase().trim() === lower) || createdCats.get(lower);
    };
    const ensureCat = (name) => {
      const found = findCat(name);
      if (found) return found.id;
      const id = 'cat_' + Math.random().toString(36).substring(2, 9);
      const item = { id, type: 'category', text: name, order: orderCursor++, createdAt: Date.now() };
      createdCats.set(String(name).toLowerCase().trim(), item);
      ops.push({ op: 'add_category', item });
      return id;
    };

    for (const a of actions) {
      if (a.tool === 'add_items') {
        const parentId = a.params.category_name ? ensureCat(a.params.category_name) : null;
        for (const text of (a.params.texts || [])) {
          if (!text || !String(text).trim()) continue;
          ops.push({
            op: 'add_item',
            item: {
              id: 'todo_' + Math.random().toString(36).substring(2, 9),
              type: 'todo',
              text: String(text).trim(),
              done: false,
              parentId,
              order: orderCursor++,
              createdAt: Date.now()
            }
          });
        }
      } else if (a.tool === 'move_item') {
        if (!itemById.has(a.params.item_id)) continue;
        ops.push({
          op: 'move_item',
          id: a.params.item_id,
          parentId: ensureCat(a.params.target_category_name),
          order: orderCursor++,
          updatedAt: Date.now()
        });
      } else if (a.tool === 'add_item') {
        const parentId = a.params.category_name ? ensureCat(a.params.category_name) : null;
        ops.push({
          op: 'add_item',
          item: {
            id: 'todo_' + Math.random().toString(36).substring(2, 9),
            type: 'todo',
            text: a.params.text,
            done: false,
            parentId,
            order: orderCursor++,
            createdAt: Date.now()
          }
        });
      } else if (a.tool === 'check_item') {
        ops.push({
          op: 'check_item',
          id: a.params.item_id,
          done: a.params.done,
          completedAt: a.params.done ? Date.now() : null,
          updatedAt: Date.now()
        });
      } else if (a.tool === 'delete_item') {
        ops.push({
          op: 'delete_item',
          id: a.params.item_id,
          updatedAt: Date.now()
        });
      } else if (a.tool === 'edit_item') {
        ops.push({
          op: 'edit_item',
          id: a.params.item_id,
          text: a.params.text,
          updatedAt: Date.now()
        });
      } else if (a.tool === 'add_category') {
        ops.push({
          op: 'add_category',
          item: {
            id: 'cat_' + Math.random().toString(36).substring(2, 9),
            type: 'category',
            text: a.params.name,
            order: activeItems.length,
            createdAt: Date.now()
          }
        });
      }
    }
    return ops;
  };

  const applyGeneratedOps = (ops) => {
    onApplyOps(ops);
    playChime();
    setProposedDiff(null);
    setLastApplied(true);
    setTimeout(() => setLastApplied(false), 5000);
  };

  if (!isOpen) return null;

  return (
    <div class="agent-drawer">
      <div class="drawer-handle" onClick={onClose} style={{ cursor: 'pointer' }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 20px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SparklesIcon size={20} />
          <h3 style={{ fontFamily: 'var(--title-font)', fontSize: '1.6rem' }}>Voice & AI Assistant</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {role === 'edit' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoApply}
                onChange={handleToggleAutoApply}
              />
              Auto-apply changes
            </label>
          )}

          {lastApplied && (
            <button
              class="action-pill-btn"
              onClick={() => {
                onUndo();
                setLastApplied(false);
              }}
              style={{ fontSize: '0.8rem', padding: '4px 10px', backgroundColor: 'rgba(245, 158, 11, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <UndoIcon size={14} /> Undo
            </button>
          )}
          {onRedo && role === 'edit' && (
            <button class="icon-btn" title="Redo" onClick={onRedo}><RedoIcon size={16} /></button>
          )}

          <button class="icon-btn" onClick={onClose}><XIcon size={18} /></button>
        </div>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxHeight: '360px'
      }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: m.role === 'user' ? 'var(--accent-blue)' : 'rgba(0, 0, 0, 0.05)',
              color: m.role === 'user' ? 'white' : 'var(--text-primary)',
              borderRadius: '12px',
              padding: '10px 14px',
              maxWidth: '85%',
              fontSize: '0.94rem',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {m.content}
          </div>
        ))}

        {isLoading && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Thinking…
          </div>
        )}

        {/* Diff Proposal Card */}
        {proposedDiff && (
          <div class="diff-card">
            <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Proposed Modifications:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {proposedDiff.actions.map((act, i) => (
                <div key={i} style={{ fontSize: '0.9rem' }}>
                  {act.tool === 'add_item' && (
                    <span class="diff-item-add">+ Add: "{act.params.text}" {act.params.category_name ? `under ${act.params.category_name}` : ''}</span>
                  )}
                  {act.tool === 'add_items' && (
                    <span class="diff-item-add">+ Add {(act.params.texts || []).length} tasks{act.params.category_name ? ` under ${act.params.category_name}` : ''}: {(act.params.texts || []).map(t => `"${t}"`).join(', ')}</span>
                  )}
                  {act.tool === 'edit_item' && (
                    <span class="diff-item-add">Rename item to: "{act.params.text}"</span>
                  )}
                  {act.tool === 'move_item' && (
                    <span class="diff-item-add">Move item to {act.params.target_category_name}</span>
                  )}
                  {act.tool === 'check_item' && (
                    <span class="diff-item-add"><CheckIcon size={14} /> Check item: "{act.params.item_text || act.params.item_id}"</span>
                  )}
                  {act.tool === 'delete_item' && (
                    <span class="diff-item-remove"><TrashIcon size={14} /> Delete item: "{act.params.item_text || act.params.item_id}"</span>
                  )}
                  {act.tool === 'add_category' && (
                    <span class="diff-item-add">+ New Category: "{act.params.name}"</span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                class="action-pill-btn"
                onClick={() => setProposedDiff(null)}
              >
                Discard
              </button>
              <button
                class="action-pill-btn"
                style={{ backgroundColor: 'var(--accent-green)', color: 'white' }}
                onClick={() => applyGeneratedOps(proposedDiff.ops)}
              >
                Apply Changes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input / Mic Bar */}
      <div style={{
        padding: '12px 20px 24px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderTop: '1px solid rgba(0, 0, 0, 0.08)'
      }}>
        {isRecording ? (
          <canvas
            ref={canvasRef}
            width="220"
            height="36"
            style={{ borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.05)' }}
          />
        ) : (
          <textarea
            placeholder="Type or paste a list, or click the mic… (Shift+Enter for new line)"
            class="quick-add-input"
            rows={inputText.includes('\n') ? Math.min(6, inputText.split('\n').length) : 1}
            style={{ resize: 'none', fontFamily: 'inherit' }}
            value={inputText}
            onInput={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
        )}

        <button
          class={`mic-float-btn ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? 'Stop listening' : 'Start voice input'}
        >
          {isRecording ? <StopIcon size={18} /> : <MicIcon size={18} />}
        </button>

        {!isRecording && (
          <button
            class="action-pill-btn"
            style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}
            onClick={() => sendMessage()}
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
