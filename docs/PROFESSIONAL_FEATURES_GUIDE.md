# Quick Start Guide - Professional Meeting Features

## Hand Raise Indicator

### Where to Find It
- **On Video Tiles:** Amber/golden border with "Hand Raised" label
- **In Participants List:** Hand emoji (✋) next to participant name
- **In Header:** "N hand(s) raised" notification banner

### How to Use
1. Click the **✋ Raise Hand** button in the control bar
2. Your video tile gets a golden border
3. Participants list shows hand emoji next to your name
4. Header displays count of raised hands
5. Click the button again to **Lower Hand**

### Visual Indicators
```
┌─────────────────────────────┐
│ ✋ Hand Raised               │
│ ┌───────────────────────┐   │
│ │                       │   │  <- Amber border on video tile
│ │   Your Video Feed     │   │
│ │                       │   │
│ │   (Name on hover)     │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

---

## Camera Device Selection

### Before Joining Meeting
1. On pre-join screen, click **"⚙️ Device Settings"** button
2. Panel expands showing available cameras
3. Click **Camera** dropdown
4. Select your preferred camera from the list
5. Video preview updates with selected camera
6. Click **"Join meeting"** to enter with this camera

### During Meeting
1. Click **⋯** (three dots) button in control bar
2. **Device Settings Modal** opens
3. Find **📹 Camera** dropdown
4. Select a different camera
5. Camera switches immediately
6. Click **"Done"** to close settings

### Device Names
- Built-in camera: "Integrated Webcam" or "FaceTime HD Camera"
- USB cameras: "Logitech Webcam" or "USB Video Device"
- If label unavailable: "Camera (UUID...)" with device ID

---

## Microphone Device Selection

### Before Joining Meeting
1. On pre-join screen, click **"⚙️ Device Settings"** button
2. Panel expands showing available microphones
3. Click **Microphone** dropdown
4. Select your preferred microphone
5. Selected microphone is ready for use
6. Click **"Join meeting"** to enter with this microphone

### During Meeting
1. Click **⋯** (three dots) button in control bar
2. **Device Settings Modal** opens
3. Find **🎤 Microphone** dropdown
4. Select a different microphone
5. Microphone switches immediately
6. Click **"Done"** to close settings

### Common Microphone Types
- Built-in: "Microphone (Built-in)"
- Headset: "USB Headset Microphone"
- External: "Audio Technica USB Microphone"
- Wireless: "Bluetooth Headset"

---

## Video Effects & Filters

### How to Apply Effects

**Pre-Join Screen:**
1. Click **"⚙️ Device Settings"** button
2. Scroll to **Video Effects** section
3. Choose from 6 available effects
4. Preview updates in real-time
5. Join meeting with selected effect active

**During Meeting:**
1. Click **⋯** button in control bar
2. **Device Settings Modal** opens
3. Find **✨ Video Effects** grid
4. Click effect button to apply
5. Effect applies immediately
6. Click another effect to switch
7. Click **"Done"** to close

### Available Effects & Uses

| Effect | Icon | Best For |
|--------|------|----------|
| None | 🎬 | Natural, unfiltered appearance |
| Blur | 🌫️ | Professional meetings, hide background |
| Enhance | ⭐ | Improving low-light video quality |
| Warm | 🔥 | Evening meetings, warm lighting |
| Cool | ❄️ | Bright environments, daylight |
| B&W | ⚫ | Professional/formal presentations |

---

## Advanced Audio Settings

### Access Audio Settings
1. Click **⋯** button in control bar
2. **Device Settings Modal** opens
3. Scroll down to **🔊 Audio Settings** section
4. Toggle features as needed

### Available Audio Enhancement Options

✅ **Noise Suppression** (Enabled by Default)
- Removes background noise
- Recommended: Always ON
- Best for: Open offices, noisy environments

✅ **Echo Cancellation** (Enabled by Default)
- Prevents audio feedback
- Recommended: Always ON
- Best for: All conference scenarios

🔲 **Auto Gain Control** (Disabled by Default)
- Automatically adjusts microphone volume
- Recommended: ON for inconsistent speakers
- Best for: Large groups with varied microphone levels

---

## Settings Modal Interface

### Layout
```
╔════════════════════════════════════════╗
║  Device Settings                   ✕   │
╟────────────────────────────────────────╢
║  📹 Camera                             │
║  [Dropdown: Camera Selection    ▼]    │
║                                        │
║  🎤 Microphone                         │
║  [Dropdown: Microphone Selection ▼]   │
║                                        │
║  ✨ Video Effects                      │
║  [🎬] [🌫️] [⭐]                        │
║  [🔥] [❄️] [⚫]                        │
║                                        │
║  🔊 Audio Settings                     │
║  ☑ Noise Suppression                  │
║  ☑ Echo Cancellation                  │
║  ☐ Auto Gain Control                  │
║                                        │
║  [         Done           ]            │
╚════════════════════════════════════════╝
```

### Common Settings Combinations

**Professional Meeting**
- Camera: Primary webcam
- Microphone: Headset or external mic
- Effect: Blur (to hide background)
- Audio: All enhancement ON

**Casual Team Chat**
- Camera: Built-in webcam
- Microphone: Built-in microphone
- Effect: None or Enhance
- Audio: Noise suppression ON

**Video Presentation**
- Camera: Best quality camera
- Microphone: External microphone
- Effect: None (unfiltered)
- Audio: Echo cancellation ON

---

## Tips & Tricks

### Pro Tips
1. **Test devices before meetings** - Join 2-3 minutes early to ensure all devices work
2. **Use external microphone** - Better audio quality than built-in
3. **Enable blur effect** - Professional appearance, privacy
4. **Noise suppression is your friend** - Especially in open offices
5. **Test echo cancellation** - Prevents participant feedback

### Troubleshooting

**Camera not showing in dropdown?**
- Check camera permissions in system settings
- Try unplugging/replugging USB camera
- Restart browser

**Microphone not working?**
- Check volume levels in OS audio settings
- Test microphone in system settings first
- Try different microphone if available
- Disable "Auto Gain Control" if audio is cutting out

**Effect looks bad?**
- Switch to "None" filter
- Try "Enhance" for better results
- Check lighting conditions
- Use Blur for low-light situations

**Audio feedback/echo?**
- Ensure echo cancellation is ON
- Don't use speakers + mic (use headphones)
- Check microphone placement

---

## Control Bar Reference

```
[🎤] [📹] [🖥] [●] [✋] [─] [💬] [👥] [⋯] ─────── [📞 Leave]
 │     │     │   │   │    │   │    │   │
 │     │     │   │   │    │   │    │   └─ Settings
 │     │     │   │   │    │   │    └───── Participants
 │     │     │   │   │    │   └────────── Chat
 │     │     │   │   │    └──────────── Divider
 │     │     │   │   └─────────────── Raise Hand
 │     │     │   └────────────────── Record
 │     │     └──────────────────── Screen Share
 │     └────────────────────────── Camera Toggle
 └──────────────────────────────── Mute Toggle
```

---

## Keyboard Shortcuts (Coming Soon)
- `M` - Toggle Mute
- `V` - Toggle Video
- `H` - Raise/Lower Hand
- `C` - Open Chat
- `P` - Open Participants
- `S` - Open Settings (⋯)

---

## Mobile/Tablet Considerations
- Device selection may be limited
- Effects may have reduced performance
- Settings accessed via same modal
- Touch-friendly button sizes (44px minimum)

---

## Accessibility
- All buttons have keyboard focus states
- Settings modal keyboard-navigable
- ARIA labels for screen readers
- High contrast indicators
- Clear, descriptive text labels

