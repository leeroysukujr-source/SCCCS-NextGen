// Lightweight AI client for the frontend to call the AI microservice
export async function summarizeMeeting(meetingId, transcript, options = {}) {
  // frontend dev servers usually proxy `/api/ai` to the AI microservice.
  const base = (typeof window !== 'undefined' && window.location.origin) ? '' : ''
  const res = await fetch(base + '/api/ai/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meeting_id: meetingId, transcript, mode: options.mode || 'post', brief: !!options.brief })
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`AI service error: ${res.status} ${txt}`)
  }
  return res.json()
}

// Extend with websocket helpers for live captioning and streaming later.
