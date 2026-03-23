# Visual Design System - Premium Meeting Interface

## Color Palette

### Primary Colors
```
Blue (#3B82F6)     - Primary actions, active states, focus
Purple (#8B5CF6)   - Secondary actions, accents
Red (#EF4444)      - Danger, recording, warnings
Green (#10B981)    - Success, online, speaking
Amber (#F59E0B)    - Alerts, participant count
```

### Background Colors
```
Slate 950 (#030712)   - Deep background
Slate 900 (#0f172a)   - Surface dark
Slate 800 (#1e293b)   - Element background
Slate 700 (#334155)   - Hover state
White 10% (rgba)      - Borders
White 5% (rgba)       - Subtle dividers
```

### States
```
Default: Slate 800/60 border white/10
Hover:   Slate 700/60 border white/20
Active:  Blue 600 border blue 400
Disabled: Slate 600 opacity 50%
```

---

## Typography System

### Font Family
```
Primary: Inter
Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI'
Weights: 400, 500, 600, 700, 800
```

### Type Scale
```
Display    → 32px, weight 800, line-height 1.2
Heading    → 24px, weight 700, line-height 1.2
Subheading → 18px, weight 600, line-height 1.3
Title      → 16px, weight 600, line-height 1.3
Body       → 14px, weight 400, line-height 1.5
Label      → 12px, weight 600, line-height 1.4
Caption    → 11px, weight 500, line-height 1.4
Small      → 10px, weight 500, line-height 1.4
```

### Examples
```jsx
<h1 className="text-2xl font-bold">Premium Meeting</h1>
<p className="text-sm text-slate-400">Subtitle text</p>
<button className="text-xs font-semibold">Button label</button>
```

---

## Spacing System

### Base Unit: 4px
```
1  = 4px   (xs)
2  = 8px   (sm)
3  = 12px  (md)
4  = 16px  (lg)
5  = 20px  (xl)
6  = 24px  (2xl)
8  = 32px  (3xl)
```

### Common Patterns
```
Padding:
- Button: px-4 py-2 (16px x 8px)
- Card: p-6 (24px all)
- Section: p-8 (32px all)

Margin:
- Between sections: mb-6 (24px)
- Between elements: gap-4 (16px)
- Tight spacing: gap-2 (8px)

Radius:
- Button: rounded-lg (8px)
- Card: rounded-2xl (16px)
- Large: rounded-3xl (24px)
```

---

## Component Specifications

### Header Bar
```
Height:     75px (60px for mobile)
Padding:    px-8 (32px sides)
Background: Gradient from slate-900/90 via slate-950/90
Border:     1px solid white/10
Shadow:     shadow-2xl (max shadow)

Layout:
├─ Left: Status + Title + Room ID
├─ Center: Stats (Time, Network, Recording, Count)
└─ Right: Quick actions (3px buttons)
```

### Control Bar
```
Height:     96px (24 + padding)
Padding:    px-8 py-5
Background: Gradient from slate-950 to slate-900/80
Border:     1px solid white/10
Shadow:     shadow-2xl

Layout:
├─ Left: Secondary buttons (sm)
├─ Center: Primary buttons (lg) in glass container
├─ Right: Chat/People + Leave button
```

### Video Tile
```
Border-radius: 16px (rounded-2xl)
Border:        1px solid white/10
Aspect-ratio:  16/9
Shadow:        0 10px 30px rgba(0,0,0,0.3)

Hover effects:
- Box shadow increases
- Border color lighter
- Slight scale increase (if not playing)
```

### Button Styles

#### Small Button (sm)
```
Size:           40x40px (h-10 w-10)
Icon size:      16px
Border-radius:  11px (rounded-lg)
Padding:        0 (icon only)
Font weight:    600
Transition:     all 0.3s
```

#### Medium Button (md)
```
Size:           44x44px (h-11 w-11)
Icon size:      18px
Border-radius:  11px (rounded-lg)
Padding:        0 (icon only)
Font weight:    600
```

#### Large Button (lg)
```
Height:         48px (h-12)
Padding:        px-6 (24px sides)
Icon size:      18px
Text size:      14px (text-sm)
Border-radius:  11px (rounded-xl)
Font weight:    600
Text hidden on mobile (hidden sm:inline)
```

### Sidebar
```
Width:          420px (380px on tablet, full on mobile)
Background:     Gradient from slate-900/95 via slate-950
Border:         1px solid white/10 (left only)
Header height:  64px (h-16)
Border-radius:  0 (no radius on sides)
Shadow:         shadow-2xl
```

### Chat Message
```
Padding:        12px
Border-radius:  12px
Background:     slate-800/50
Border:         1px solid white/5
Avatar:         8px, 32px diameter
Timestamp:      text-xs text-slate-500
Hover:          background lighter
Spacing:        gap-3 between avatar and text
```

### Participant Item
```
Padding:        12px
Border-radius:  12px
Background:     slate-800/40
Border:         1px solid white/10
Avatar:         40px diameter
Name:           text-sm font-semibold
Status:         text-xs text-slate-400
Hover:          background slate-800/60
Speaking state: border-green-500/50, bg-green-600/20, shadow
```

---

## Animation Specifications

### Slide In Up
```css
Duration:  0.3s
Easing:    ease-out
From:      translateY(10px), opacity 0
To:        translateY(0), opacity 1
Use for:   Chat messages, notifications
```

### Slide In Right
```css
Duration:  0.3s
Easing:    ease-out
From:      translateX(20px), opacity 0
To:        translateX(0), opacity 1
Use for:   Sidebar opening
```

### Pulse
```css
Duration:  2s
Easing:    cubic-bezier(0.4, 0, 0.6, 1)
Loop:      infinite
Opacity:   1 → 0.5 → 1
Use for:   Recording indicator, online status
```

### Glow
```css
Duration:  3s
Easing:    ease-in-out
Loop:      infinite
Box-shadow: 20px to 30px
Use for:   Active speaker, focus state
```

### Scale
```css
Duration:  0.3s
Easing:    cubic-bezier(0.4, 0, 0.2, 1)
Hover:     scale(1.05)
Active:    scale(0.95)
Use for:   Button interactions
```

---

## Responsive Grid

### Desktop (>1920px)
```
Video Grid:  2 columns, 12px gap
Header:      Full width, centered content
Sidebar:     420px fixed right
Controls:    Full width, max-content centered
```

### Laptop (1366-1920px)
```
Video Grid:  2 columns, 12px gap
Header:      Full width, tight padding
Sidebar:     380px fixed right
Controls:    Full width, tight spacing
```

### Tablet (768-1024px)
```
Video Grid:  1 column, 8px gap
Header:      Full width, sm padding
Sidebar:     360px overlay
Controls:    Full width, flex wrap if needed
```

### Mobile (<768px)
```
Video Grid:  1 column, 4px gap
Header:      Compact, 60px height
Sidebar:     Full screen drawer
Controls:    Horizontal scroll or wrap
Buttons:     Icon only (no labels)
```

---

## Shadow System

```
sm:     0 1px 2px 0 rgba(0, 0, 0, 0.05)
md:     0 4px 6px -1px rgba(0, 0, 0, 0.1)
lg:     0 10px 15px -3px rgba(0, 0, 0, 0.1)
xl:     0 20px 25px -5px rgba(0, 0, 0, 0.1)
2xl:    0 25px 50px -12px rgba(0, 0, 0, 0.25)

Glow shadows:
- Blue:    shadow-lg shadow-blue-600/30
- Red:     shadow-lg shadow-red-600/30
- Green:   shadow-lg shadow-green-600/30
- Purple:  shadow-lg shadow-purple-600/30
```

---

## Border System

```
Border Color:     white/10 (default), white/20 (hover)
Border Width:     1px (standard), 2px (focus)
Border Radius:
  - Buttons:      11px (rounded-lg to rounded-xl)
  - Cards:        16px (rounded-2xl)
  - Large:        24px (rounded-3xl)
  - Circle:       50% (rounded-full)
```

---

## Backdrop Effects

### Glass Morphism
```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.1);
```

### Blur Intensity
```
sm:   blur(4px)
md:   blur(8px)
lg:   blur(12px)
xl:   blur(16px)
```

---

## Accessibility Colors

### Contrast Ratios (WCAG 2.1)
```
Text on Dark:      4.5:1 (minimum)
Borders on Dark:   3:1 (minimum)
Icons + Text:      4.5:1 (minimum)
Focus Indicators:  3:1 (minimum)
```

### High Contrast Mode
```
Text:   white (full opacity)
Borders: white/30 (increased)
Buttons: 2px borders
Focus:   3px outline
```

---

## Icon System

### Icon Sizes
```
xs:   12px (text-xs)
sm:   14px (text-sm)
base: 16px (text-base)
lg:   18px (text-lg)
xl:   20px (text-xl)
2xl:  24px (text-2xl)
3xl:  32px (text-3xl)
```

### Icon Buttons
```
Small:  32x32px with 14px icon
Medium: 44x44px with 16px icon
Large:  48x48px with 18px icon
```

### Icon Colors
```
Default:    text-slate-300
Hover:      text-white
Active:     text-blue-400
Disabled:   text-slate-600
Success:    text-green-400
Alert:      text-amber-400
Error:      text-red-400
```

---

## Focus States

### Keyboard Focus
```
Border:       2px solid blue-500
Outline:      3px solid rgba(59, 130, 246, 0.5)
Offset:       2px
Ring:         2px ring-blue-500/50
```

### Focus Visible
```
Only shows when using keyboard
Hidden for mouse users
Compliant with WCAG 2.1
```

---

## State Indicators

### Speaking
```
Background: Gradient green/blue
Border:     green-500/50
Box-shadow: 0 0 15px rgba(16, 185, 129, 0.8)
Animation:  pulse
```

### Recording
```
Background: Gradient red
Border:     red-500/30
Text-color: red-300
Animation:  pulse 2s
Icon:       animated red circle
```

### Online
```
Dot size:   8px
Color:      green-500
Shadow:     shadow-lg shadow-green-500/50
Animation:  pulse optional
```

### Offline
```
Dot size:   8px
Color:      gray-500
Shadow:     none
Opacity:    reduced
```

---

## Density Modes

### Comfortable (Current)
```
Gap:     16px (gap-4)
Padding: 16px (p-4)
Height:  48-56px
```

### Compact (Optional)
```
Gap:     12px (gap-3)
Padding: 12px (p-3)
Height:  40-44px
```

### Spacious (Optional)
```
Gap:     24px (gap-6)
Padding: 24px (p-6)
Height:  56-64px
```

---

## Print Styles

```css
@media print {
  .no-print {
    display: none;
  }
  
  * {
    box-shadow: none !important;
  }
  
  background {
    background: white !important;
  }
}
```

---

## Performance Optimization

### GPU Acceleration
```css
will-change: transform;
transform: translate3d(0, 0, 0);
backface-visibility: hidden;
```

### Smooth Rendering
```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

---

## Dark Mode Support

```css
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
  }
}
```

---

## Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Design Tokens Summary

| Token | Value | Usage |
|-------|-------|-------|
| Primary | Blue #3B82F6 | Actions |
| Secondary | Purple #8B5CF6 | Secondary actions |
| Success | Green #10B981 | Positive states |
| Warning | Amber #F59E0B | Alerts |
| Error | Red #EF4444 | Destructive actions |
| Surface | Slate 900 | Backgrounds |
| Border | White 10% | Dividers |
| Text Primary | White | Main text |
| Text Secondary | Slate 400 | Helper text |
| Radius Small | 8px | Buttons |
| Radius Large | 16px | Cards |
| Shadow | Various | Depth |
| Spacing | 4px base | Consistency |
| Duration | 0.3s | Animations |

---

This design system ensures **consistency**, **accessibility**, and **visual excellence** across the entire premium meeting interface.

**Version**: 1.0.0  
**Last Updated**: December 8, 2025
