# 📝 Lined Paper Todo Site

A minimalist, tactile collaborative todo app styled like real notebook stationery on a wooden desk. Features spring physics, hand-drawn check and strikethrough animations, private dual-key access (edit & view-only), 3 live views (Paper, Raw, Graph), and Groq AI voice & chat assistance.

## 🚀 Features

- **Lined Paper Aesthetics**:
  - Ruled lines, vintage red left margin, desktop 3 punched binder holes, and tactile drop shadows.
  - Handwritten typography for headings and categories (`Patrick Hand`, `Caveat`).
  - Sticky-note `#` notes with slight rotation and pin dots.
  - **Night Paper (Dark Mode)** theme.
- **Spring Physics & Juice**:
  - Checkbox pop with spring overshoot (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
  - Hand-drawn SVG animated strike-through line.
  - Confetti and chime celebration burst when a category reaches 100% completion!
  - Soft physical sound effects synthesized with Web Audio API (paper scratch, pop, chime, crumple) — toggleable in settings.
- **Two Keys per List**:
  - **Edit Key** (e.g. `plum-otter-lamp-42`): full control (check, add, edit, drag, voice/chat agent, history, rotate key, delete).
  - **View Key** (e.g. `quiet-heron-moss-17`): read-only access with a "Viewing Only" ribbon.
  - Keys can be rotated or disabled at any time.
  - Download keys as `.txt` backup in one tap.
- **Three Live Synchronized Views**:
  - **Paper View**: interactive notebook with collapsible categories, inline editing, quick-add, and progress pills.
  - **Raw View**: line-numbered monospace text editor with live validation, copy, export, and import with replace or merge diff preview.
  - **Graph View**:
    - *Progress Rings*: circular overall completion gauge and per-category progress bars.
    - *Activity & Burndown*: 14-day completion heatmap and cumulative velocity curve.
    - *Interactive Mind Map*: radial tree with clickable nodes to toggle completion.
- **Voice & AI Assistant (Groq)**:
  - Slide-up assistant drawer with real-time bouncing audio waveform.
  - Groq Whisper transcription (`whisper-large-v3-turbo` with `whisper-large-v3` fallback).
  - Groq Chat (`llama-3.3-70b-versatile` with tool calling) proposing structured actions as **diff cards** with Apply / Discard buttons.
  - Silent fallback to browser Speech Recognition and local intent parser if no Groq API key is present.
- **Resilient Real-time Sync**:
  - Optimistic client updates with offline queue that flushes upon reconnection.
  - Adaptive 4-second polling with idle backoff.
  - Item-level last-write-wins conflict resolution with tombstones.
  - Automatic snapshot history (last 30 versions) with one-click restore.

## 🛠️ Stack & Storage

- **Frontend**: Vite + Preact + Vanilla CSS (zero heavyweight frameworks, super lean 25KB gzipped bundle).
- **Backend**: Vercel Serverless Functions (`/api/*`) with Pantry basket storage adapter (and local zero-config fallback for development).
- **Crons**: Daily keepalive cron (`/api/keepalive`) configured in `vercel.json`.

## 📦 Environment Variables

Configure these in your Vercel Project Settings or local `.env`:

| Variable | Description | Default / Fallback |
| :--- | :--- | :--- |
| `PANTRY_ID` | Your Pantry ID from [getpantry.cloud](https://getpantry.cloud/) | Local file/memory fallback if unset |
| `GROQ_API_KEY` | Your API key from [Groq Console](https://console.groq.com/) | Local browser speech & rule parser if unset |
| `KEY_PEPPER` | Secret salt for key hashing | Safe default salt |

## 💻 Local Development

```bash
# Install dependencies
npm install

# Run dev server with built-in API proxy
npm run dev

# Run test suite
npm test

# Build for production
npm run build
```

## ⌨️ Keyboard Shortcuts

- `Enter`: Add item in quick-add / submit
- `Ctrl + Z` / `Cmd + Z`: Undo last action
- `Ctrl + K` / `Cmd + K`: Open / toggle Voice & AI Assistant
- `Esc`: Close open modal / drawer
