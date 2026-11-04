/**
 * /api/transcribe endpoint
 * Uses Groq Whisper (whisper-large-v3-turbo, retry with whisper-large-v3)
 * Supports audio sent as JSON { audioBase64, mimeType }
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-list-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return res.status(200).json({
      fallback: true,
      message: 'Groq API key not set on server. Use client speech recognition fallback.'
    });
  }

  try {
    const { audioBase64, mimeType } = req.body || {};
    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64 in request body' });
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const extension = (mimeType && mimeType.includes('mp4')) ? 'mp4' : 'webm';
    const filename = `recording.${extension}`;

    const form = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType || 'audio/webm' });
    form.append('file', blob, filename);
    form.append('model', 'whisper-large-v3-turbo');
    form.append('language', 'en');
    form.append('response_format', 'json');

    // Attempt 1: whisper-large-v3-turbo
    let groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`
      },
      body: form
    });

    let data = null;
    if (groqRes.ok) {
      data = await groqRes.json();
    }

    // Attempt 2: retry with whisper-large-v3 if empty or failed
    if (!data || !data.text || data.text.trim().length === 0) {
      const retryForm = new FormData();
      retryForm.append('file', blob, filename);
      retryForm.append('model', 'whisper-large-v3');
      retryForm.append('language', 'en');
      retryForm.append('response_format', 'json');

      const retryRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`
        },
        body: retryForm
      });

      if (retryRes.ok) {
        data = await retryRes.json();
      }
    }

    if (!data || typeof data.text !== 'string') {
      return res.status(500).json({
        fallback: true,
        error: 'Transcription returned no text. Falling back to browser speech recognition.'
      });
    }

    return res.status(200).json({
      text: data.text.trim()
    });
  } catch (err) {
    console.error('Transcription error:', err);
    return res.status(500).json({
      fallback: true,
      error: 'Transcription failed: ' + err.message
    });
  }
}
