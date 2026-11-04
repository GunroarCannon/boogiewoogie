import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { playPop, playScratch, playChime } from '../lib/sound.js';

export function AgentDrawer({
  isOpen,
  onClose,
  list,
  role,
  onApplyOps,
  onUndo
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
  const [autoApply, setAutoApply] = useState(false);
  const [lastApplied, setLastApplied] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    try {
      const savedAuto = localStorage.getItem('lined_paper_auto_apply');
      if (savedAuto) setAutoApply(savedAuto === '1');
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

    for (const a of actions) {
      if (a.tool === 'add_item') {
        let parentId = null;
        if (a.params.category_name) {
          const matchCat = categories.find(c => c.text.toLowerCase() === a.params.category_name.toLowerCase());
          if (matchCat) {
            parentId = matchCat.id;
          } else {
            // Create new category first
            const newCatId = 'cat_' + Math.random().toString(36).substring(2, 9);
            ops.push({
              op: 'add_category',
              item: {
                id: newCatId,
                type: 'category',
                text: a.params.category_name,
                order: activeItems.length,
                createdAt: Date.now()
              }
            });
            parentId = newCatId;
          }
        }
        ops.push({
          op: 'add_item',
          item: {
            id: 'todo_' + Math.random().toString(36).substring(2, 9),
            type: 'todo',
            text: a.params.text,
            done: false,
            parentId,
            order: activeItems.length + 1,
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
          <span style={{ fontSize: '1.4rem' }}>✨</span>
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
              style={{ fontSize: '0.8rem', padding: '4px 10px', backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
            >
              ↩ Undo
            </button>
          )}

          <button class="icon-btn" onClick={onClose}>✕</button>
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
              lineHeight: 1.4
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
                  {act.tool === 'check_item' && (
                    <span class="diff-item-add">✓ Check item: "{act.params.item_text || act.params.item_id}"</span>
                  )}
                  {act.tool === 'delete_item' && (
                    <span class="diff-item-remove">✕ Delete item: "{act.params.item_text || act.params.item_id}"</span>
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
          <input
            placeholder="Type or click the mic to speak…"
            class="quick-add-input"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
        )}

        <button
          class={`mic-float-btn ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? 'Stop listening' : 'Start voice input'}
        >
          {isRecording ? '⏹' : '🎤'}
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
