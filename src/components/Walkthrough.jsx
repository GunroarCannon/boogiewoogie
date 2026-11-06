import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import {
  XIcon,
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
  HelpCircleIcon
} from './Icons.jsx';

const TOUR_STEPS = [
  {
    target: null, // Centered welcome
    title: 'Welcome to Boogiewoogie!',
    tagline: 'simple todo app on ruled paper',
    content: 'A collaborative, physics-animated todo list crafted on lined stationery. Let’s take a quick 30-second walkthrough of the features and how to use them.',
    actionLabel: 'Start Walkthrough'
  },
  {
    target: '.topbar-nav',
    title: 'Three Synchronized Views',
    content: 'Switch freely between 3 views at any time:\n• Paper: The tactile ruled notebook.\n• Raw: Pure markdown-style text editor.\n• Graph: Completion rings & radial mind-map.\n\nEdits in Raw or Paper never wipe when you switch tabs!',
    actionLabel: 'Next: Ruled Paper'
  },
  {
    target: '.lined-paper-sheet',
    title: 'Paper Notebook & Physics Juice',
    content: '• Tap checkboxes to check items with a satisfying spring pop and confetti!\n• Click any task or category to edit inline.\n• Drag items to reorder.\n• Tap a category header to collapse or expand it.',
    actionLabel: 'Next: Raw Text'
  },
  {
    target: '.raw-nav-btn',
    title: 'Raw Markdown Format & Auto-Save',
    content: 'The Raw view uses a simple readable syntax:\n  TODO: Title\n  + Category Name\n  - [ ] Unchecked task\n  - [x] Completed task\n  # Sticky notes\n\nEdits auto-save seamlessly so your text is never lost.',
    actionLabel: 'Next: Voice & AI'
  },
  {
    target: '.floating-agent-btn',
    title: 'Voice-to-AI Assistant',
    content: 'Press Ctrl+K or tap the microphone to talk or type to your assistant.\nPowered by Groq Whisper & Llama 3.3, it understands natural speech like "Add call mom under Personal" and shows a live diff before applying.',
    actionLabel: 'Next: Private Keys'
  },
  {
    target: '.share-nav-btn',
    title: 'Private Keys (No Passwords)',
    content: 'Every list has a unique human-friendly Edit Key and optional View Key (e.g. velvet-fox-lamp-42).\nShare the link or key with collaborators to work together in real-time. No sign-up required!',
    actionLabel: 'Got It!'
  }
];

export function Walkthrough({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const step = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  // Track target element bounding box
  useEffect(() => {
    const updateRect = () => {
      if (!step.target) {
        setHighlightRect(null);
        return;
      }
      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setHighlightRect({
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12
        });
        // Scroll target into view if needed
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        setHighlightRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [stepIndex, step.target]);

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    try {
      localStorage.setItem('boogiewoogie_tour_seen', '1');
    } catch (e) {}
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'auto'
    }}>
      {/* Dark overlay backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          transition: 'all 0.25s ease'
        }}
        onClick={handleFinish}
      />

      {/* Target spotlight cutout border */}
      {highlightRect && (
        <div style={{
          position: 'fixed',
          top: `${highlightRect.top}px`,
          left: `${highlightRect.left}px`,
          width: `${highlightRect.width}px`,
          height: `${highlightRect.height}px`,
          borderRadius: '8px',
          boxShadow: '0 0 0 4px #3b82f6, 0 0 25px rgba(59, 130, 246, 0.5), 0 0 0 99999px rgba(15, 23, 42, 0.65)',
          pointerEvents: 'none',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 100000
        }} />
      )}

      {/* Walkthrough Popover Card */}
      <div style={{
        position: 'relative',
        zIndex: 100001,
        width: '92%',
        maxWidth: '460px',
        backgroundColor: 'var(--paper-bg)',
        border: '2px solid var(--accent-blue)',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
        padding: '24px',
        animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <span style={{
              display: 'inline-block',
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--accent-blue)',
              marginBottom: '4px'
            }}>
              Step {stepIndex + 1} of {TOUR_STEPS.length}
            </span>
            <h3 style={{
              fontFamily: isFirst ? 'var(--comic-font)' : 'var(--title-font)',
              fontSize: isFirst ? '2.4rem' : '1.8rem',
              lineHeight: 1.1,
              letterSpacing: isFirst ? '1px' : 'normal',
              color: 'var(--text-primary)'
            }}>
              {step.title}
            </h3>
            {step.tagline && (
              <p style={{
                fontFamily: 'var(--comic-tagline-font)',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginTop: '2px'
              }}>
                {step.tagline}
              </p>
            )}
          </div>
          <button
            class="icon-btn"
            title="Skip Walkthrough"
            onClick={handleFinish}
            style={{ padding: '6px' }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          color: 'var(--text-primary)',
          fontSize: '0.96rem',
          lineHeight: 1.55,
          whiteSpace: 'pre-line',
          marginBottom: '20px'
        }}>
          {step.content}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', justifyContent: 'center' }}>
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === stepIndex ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: i === stepIndex ? 'var(--accent-blue)' : 'rgba(0, 0, 0, 0.15)',
                transition: 'all 0.25s ease'
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div>
            {!isFirst && (
              <button
                class="action-pill-btn"
                onClick={handlePrev}
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
              >
                Back
              </button>
            )}
            {isFirst && (
              <button
                class="action-pill-btn"
                onClick={handleFinish}
                style={{ padding: '8px 16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}
              >
                Skip Tour
              </button>
            )}
          </div>

          <button
            class="action-pill-btn"
            onClick={handleNext}
            style={{
              backgroundColor: 'var(--accent-blue)',
              color: 'white',
              padding: '10px 22px',
              fontSize: '0.96rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {step.actionLabel || (isLast ? 'Finish' : 'Next')}
            {!isLast && <ArrowRightIcon size={16} />}
            {isLast && <CheckIcon size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
