---
description: Connect Multiple Computers (LAN) with Auto-Join
---

To connect a second computer to your running development server, follow these steps.

## 1. Restart Backend
I have updated your backend configuration to allow connections from other computers. **You must restart the backend now.**
1. Select the `py run.py` terminal.
2. Press `Ctrl+C` to stop it.
3. Run `py run.py` again.

## 2. Find Your Local IP Address
1. Open a new terminal.
2. Run `ipconfig`.
3. Look for **IPv4 Address** (usually under "Wireless LAN adapter Wi-Fi" or "Ethernet"). It will look like `192.168.1.5` or `10.0.0.5`.
   > Let's assume your IP is **192.168.1.10** for the examples below.

## 3. Enable Camera Access on the Second Computer
**CRITICAL:** Browsers block Camera/Microphone on HTTP sites that aren't "localhost". Since you are accessing via IP (e.g. `http://192.168.1.10:5173`), you must tell the browser it is safe.

**On the SECOND computer (the one joining externally):**
1. Open Chrome (or Edge/Brave).
2. Go to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
   (Copy and paste this into the address bar).
3. **Enable** the flag.
4. In the text box, enter your host's URL: `http://192.168.1.10:5173` (Create sure to replace `192.168.1.10` with your ACTUAL IP).
5. Click **Relaunch** at the bottom of the screen.

## 4. Join the Meeting
On the second computer, use this link to join automatically:

```text
http://<YOUR_IP>:5173/meeting/<ROOM_ID>?auto=true
```

**Example:**
`http://192.168.1.10:5173/meeting/Mathematics?auto=true`

- **`autojoin=true`**: Skips the "Join" button (after a brief moment to detecting devices).
- You will need to **Log In** on the second computer if you aren't already. You can log in as a different user (e.g., register a new account "Student2") to test the video call.
