// Lightweight AI client for the frontend to call the AI microservice
export async function summarizeMeeting(meetingId, transcript, options = {}) {
  // Retrieve token from localStorage (managed by our AuthStore)
  const token = localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage'))?.state?.token : null;
  
  if (!token) {
    throw new Error('Unauthorized: Please log in to summarize this meeting.');
  }

  const base = ''; // Current host routing
  const res = await fetch(base + '/api/ai/summarize', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      meeting_id: meetingId, 
      transcript, 
      mode: options.mode || 'post', 
      brief: !!options.brief 
    })
  });
  
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI service error: ${res.status} ${txt}`);
  }
  return res.json();
}

// Extend with websocket helpers for live captioning and streaming later.
