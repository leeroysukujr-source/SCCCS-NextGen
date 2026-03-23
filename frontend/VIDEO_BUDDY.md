Video Room — Local testing & notes

Overview
- The Video Room section provides a dashboard, calendar, meetings list, contacts, and the ability to open meetings (either navigated to `/meeting/:roomId` or inline).
- The canonical live meeting experience is provided by `frontend/src/pages/Meeting.jsx` which integrates with mediasoup and socket.io.

How to run locally
1. Start backend API and mediasoup server (project expects API at http://localhost:5000 by default)
2. Start the frontend dev server:

```powershell
cd C:\Users\PC\Desktop\dd\frontend
npm install
npm run dev
```

3. Open the app at the Vite dev URL (typically `http://localhost:3000`) and go to `/video-room`.

Quick test cases
- Home: should show agenda, invitations and insights fetched via `roomsAPI.getRooms()`.
- Calendar: groups events from `roomsAPI.getRooms()` by day.
- Meetings: lists rooms; click `Open` to navigate to `/meeting/:roomId` or `Open inline` to mount the live meeting component in-place.
- Contacts: lists users from `usersAPI.getUsers()` and allows creating a direct room via `roomsAPI.createDirectRoom(userId)`.

Notes
- The frontend uses `NotificationProvider` for prompts and toasts; prompts replace older `window.prompt` calls.
- If your backend uses different endpoints, update `frontend/src/api/rooms.js` and `frontend/src/api/users.js` accordingly.

Debug tips
- If the embedded inline meeting fails to initialize, check the browser console for errors from mediasoup or socket.io: CORS or socket URL mismatches are common issues.
- Verify the backend `/rooms` endpoints are reachable and return expected objects (`id`, `room_code`, `start_time`, `name`).

Next steps
- Improve inline-meeting loading UX (progress indicator while mediasoup initializes).
- Add richer calendar sync with external calendars if needed.
