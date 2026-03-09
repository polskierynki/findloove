# 🎨 Old Color Utilities Audit Report

**Date:** 9 marca 2026  
**Scope:** Components and App directories (excluding utilities/definitions)  
**Target:** Neon/Glassmorphism Design Conflicts

---

## 📊 Summary Statistics

- **Total Files with Old Colors:** 21 files
- **Total Match Occurrences:** 400+ instances
- **Critical Files (New* components):** 7 files
- **Other Components:** 6 files
- **App Pages:** 8 pages

---

## 🔴 CRITICAL - New* Components (High Priority)

### 1. **NewHeader.tsx** 
- **Lines:** 41, 56, 62, 68, 74, 96, 108, 133, 136, 142, 179, 194, 203, 212, 221
- **Line Count:** ~60 occurrences
- **Old Colors Found:**
  - `text-gray-300` → 8 occurrences
  - `text-gray-400` → 4 occurrences
  - `text-gray-500` → 1 occurrence
  - `text-gray-200` → 2 occurrences
  - `text-white` → 8 occurrences (intended, keep for contrast)
  - `bg-white/10`, `bg-white/20`, `bg-white/5` → glass background usage (KEEP)
  - `border-white/10`, `border-white/5` → glass borders (KEEP)
- **Replacement Strategy:**
  - `text-gray-300` → `text-gray-300/80` or `text-cyan-300` for accent
  - `text-gray-400` → `text-cyan-400` for hover states  
  - `text-gray-500` → `text-gray-500/60` or `text-cyan-500/50`

### 2. **NewHomeView.tsx**
- **Lines:** 54, 59, 62, 65, 74
- **Line Count:** ~20 occurrences
- **Old Colors Found:**
  - `text-gray-400` → 2 occurrences
  - `text-gray-300` → 2 occurrences
  - `border-white/10` → glass elements (KEEP)
  - `bg-white/10` → glass backgrounds (KEEP)
- **Replacement Strategy:**
  - `text-gray-400` → `text-cyan-400` or keep with reduced opacity
  - `text-gray-300` → `text-cyan-300/70`

### 3. **NewProfileDetailView.tsx**
- **Lines:** 70, 74, 95, 127, 148, 163, 164, 166, 167, 177, 184, 216, 247, 250, 257, 259, 268, 278, 280, 288, 293, 296
- **Line Count:** ~50 occurrences
- **Old Colors Found:**
  - `text-gray-700` → 1 occurrence (dark text)
  - `text-gray-300` → 6 occurrences
  - `text-gray-500` → 3 occurrences
  - `text-gray-400` → 5 occurrences
  - `text-gray-200` → 1 occurrence
  - `placeholder-gray-500` → 1 occurrence
  - `text-white` → 8 occurrences (glass labels, KEEP)
- **Replacement Strategy:**
  - Dark text `text-gray-700` → `text-white` or `text-cyan-50`
  - `text-gray-300` → `text-cyan-300` or `text-cyan-200`
  - `text-gray-500` → `text-cyan-500/60` or `text-gray-500/50`
  - `text-gray-400` → `text-cyan-400` or `text-white/60`
  - `placeholder-gray-500` → `placeholder-cyan-500/40`

### 4. **NewMessagesView.tsx**
- **Lines:** 75, 77, 78, 81, 85, 97, 98, 101, 102, 107, 108, 110, 110, 118, 122, 122, 124, 128, 129, 141, 141, 148, 148, 149, 149, 150, 158, 160, 167
- **Line Count:** ~40 occurrences
- **Old Colors Found:**
  - `text-gray-400` → 3 occurrences
  - `text-gray-500` → 2 occurrences
  - `text-gray-200` → 1 occurrence
  - `bg-white/5`, `bg-white/10`, `bg-white/20` → glass elements (KEEP)
  - `border-white/5`, `border-white/10` → glass borders (KEEP)
- **Replacement Strategy:**
  - `text-gray-400` → `text-cyan-400` 
  - `text-gray-500` → `text-cyan-500/60`
  - `text-gray-200` → `text-white`

### 5. **NewSearchView.tsx**
- **Lines:** 37, 44, 54, 60, 70, 76, 89, 90, 90, 90, 108, 109, 111, 111, 111, 128, 130, 136, 145, 145, 145, 145, 148
- **Line Count:** ~45 occurrences
- **Old Colors Found:**
  - `text-gray-400` → 2 occurrences
  - `text-gray-300` → 3 occurrences
  - `text-white` → consistent throughout (KEEP)
  - `bg-white/5`, `bg-white/10`, `bg-white/20` → glass elements (KEEP)
  - `border-white/10`, `border-white/30` → glass borders (KEEP)
- **Replacement Strategy:**
  - `text-gray-400` → `text-cyan-400/80`
  - `text-gray-300` → `text-cyan-300/70`

---

## 🟡 HIGH PRIORITY - Layout Components

### 6. **CropImageModal.tsx**
- **Lines:** 38, 39, 42, 42, 44, 47, 49, 64, 82, 82, 82, 89, 89, 89, 96, 96, 96
- **Line Count:** 30+ occurrences
- **Old Colors Found:**
  - `bg-black/70` → overlay background
  - `bg-white` → 1 occurrence (modal background)
  - `bg-slate-100` → 4 occurrences (accent backgrounds)
  - `bg-slate-200` → 1 occurrence (hover state)
  - `text-slate-600` → 1 occurrence
  - `text-slate-800` → 1 occurrence (heading)
  - `text-slate-700` → 3 occurrences
  - `border-slate-300` → 3 occurrences
  - `hover:bg-slate-50` → 3 occurrences
  - `bg-rose-500`, `bg-rose-600`, `text-white` → action buttons (consider replacing with neon)
- **Replacement Strategy:**
  - `bg-slate-100` → `bg-white/10` (glass)
  - `bg-slate-200` → `bg-white/20` (glass hover)
  - `text-slate-600` → `text-white/60`
  - `text-slate-800` → `text-white`
  - `text-slate-700` → `text-white/80`
  - `border-slate-300` → `border-white/20`
  - `bg-rose-500` → `bg-cyan-500` or keep with adjusted design
  - `bg-rose-600` → `bg-cyan-600` or keep with adjusted design

### 7. **AdminCommentsView.tsx**
- **Lines:** 193, 193, 193, 201, 213, 227, 230, 253, 255, 278, 284, 284, 284, 295, 302
- **Line Count:** 35+ occurrences
- **Old Colors Found:**
  - `bg-slate-800`, `border-slate-700` → notification toast
  - `text-gray-500` → 1 occurrence
  - `hover:bg-gray-50` → 1 occurrence
  - `text-gray-600` → 1 occurrence
  - `text-gray-800` → 1 occurrence
  - `bg-gray-100` → 1 occurrence
  - `text-gray-600` → 2 occurrences
  - `bg-gray-300`, `text-gray-800` → button
- **Replacement Strategy:**
  - `bg-slate-800` → `bg-black/60` (glass dark)
  - `border-slate-700` → `border-white/20`
  - `text-gray-*` → `text-white` or `text-cyan-*` equivalents
  - `bg-gray-100` → `bg-white/10` (glass)
  - `bg-gray-300` → `bg-cyan-300/40` or `bg-white/30`

### 8. **GuestBanner.tsx**
- **Lines:** 21, 21, 21, 21, 21, 27, 27, 35, 42, 54, 56, 59, 67, 67, 67
- **Line Count:** 25 occurrences
- **Old Colors Found:**
  - `from-rose-600 via-rose-500 to-pink-500` → gradient background
  - `text-white` → text (KEEP, as accent)
  - `bg-white/20` → glass backdrop (KEEP)
  - `text-white/80`, `text-white/90` → text opacity
  - `bg-white/30` → glass element
  - `text-white/80` → dim text
  - `bg-white text-rose-600` → button (rose colors)
  - `hover:bg-rose-50` → button hover
- **Replacement Strategy:**
  - `from-rose-600 via-rose-500 to-pink-500` → `from-fuchsia-600 via-cyan-500 to-blue-500` (neon gradient)
  - `text-rose-600` → `text-cyan-400` button text
  - `hover:bg-rose-50` → `hover:bg-cyan-50/20`

### 9. **BottomNav.tsx**
- **Lines:** 27, 27, 49, 50, 50, 60, 66, 66
- **Line Count:** 15 occurrences
- **Old Colors Found:**
  - `bg-white`, `border-t border-slate-200` → navigation background
  - `text-rose-500` → active icon
  - `text-slate-400 hover:bg-slate-50` → inactive icon + hover
  - `bg-rose-50 p-1.5` → active state background
  - `bg-rose-500 text-white` → badge
- **Replacement Strategy:**
  - Keep `bg-white` for contrast on dark glass backgrounds
  - `text-rose-500` → `text-cyan-400` active icon
  - `text-slate-400` → `text-gray-400` or `text-cyan-600`
  - `hover:bg-slate-50` → `hover:bg-cyan-50/10`
  - `bg-rose-50` → `bg-cyan-50/20` active background
  - `bg-rose-500` → `bg-cyan-500` badge

---

## 🟠 MEDIUM PRIORITY - View Components

### 10. **LikesView.tsx**
- **Lines:** 183, 184, 186, 187, 191, 195, 195, 196, 206, 206, 206, 215, 215, 215, 217, 217, 218, 240, 245, 252, 252, 253, 254, 259, 264, 264, 266, 269, 277, 281, 281, 283, 285, 285, 288, 305, 305, 305, 311, 314, 314, 314, 325, 330, 330, 338, 345, 345, 345, 346, 346, 357, 357, 357, 357, 358, 359, 364, 364, 364
- **Line Count:** 60+ occurrences
- **Old Colors Found:**
  - `bg-black/50` → overlay (KEEP as glass effect)
  - `bg-white` → modal/card backgrounds (frequent)
  - `bg-rose-100` → accent backgrounds (5 occurrences)
  - `text-rose-500`, `text-rose-600`, `text-rose-700` → rose colors
  - `border-2 border-rose-200` → rose accents
  - `text-slate-*` all variants (200-900) → multiple text shades
  - `bg-slate-50`, `bg-slate-100`, `bg-slate-200`, `bg-slate-300` → backgrounds
- **Replacement Strategy:**
  - Keep `bg-white` as primary surface in glass context
  - `bg-rose-*` → `bg-cyan-*` equivalents
  - `text-rose-*` → `text-cyan-*` equivalents
  - `text-slate-*` → map to appropriate glass/white variations
  - `border-rose-*` → `border-cyan-*`

### 11. **SearchView.tsx**
- **Lines:** 284, 284, 288, 293, 312, 312, 312, 313, 313, 313, 313, 313, 341, 341, 341, 342, 343, 346, 346, 346, 346, 347, 348, 368, 368, 368, 368, 369, 374, 374, 377, 377, 386, 386, 386, 387, 387, 387, 387, 393, 393, 402, 402, 406, 410, 414, 419, 421, 427, 433, 434, 434
- **Line Count:** 50+ occurrences
- **Old Colors Found:**
  - `text-slate-500`, `text-slate-400`, `text-slate-600`, `text-slate-800`, `text-slate-900` → text colors
  - `hover:bg-slate-100` → hover state
  - `bg-white` → surface backgrounds
  - `border-slate-200` → borders
  - `bg-rose-100`, `border-rose-200`, `border-rose-300` → rose accents
  - `text-rose-600` → rose text
  - `hover:bg-rose-50` → rose hover
  - `text-amber-600`, `text-violet-600` → other accent colors
- **Replacement Strategy:**
  - Comprehensive redesign needed—convert to neon theme
  - `text-slate-*` → `text-white` or `text-cyan-*`
  - `bg-rose-*` → `bg-cyan-*` or `bg-fuchsia-*`
  - `hover:bg-rose-50` → `hover:bg-cyan-50/20`
  - Keep button variants but with neon colors

### 12. **AdminCommentsView.tsx** (already listed as #7)

---

## 🔵 APP PAGE COLOR ISSUES

### 13. **app/reset-password/page.tsx**
- **Lines:** 260, 261, 261, 262, 267, 268, 271, 271, 271, 287, 294, 294, 294, 294, 301, 301, 301, 311, 318, 318, 318, 318, 331, 331, 331, 331, 337, 337, 337, 349, 349, 349, 349, 359, 367, 367, 367, 367, 372, 372, 380, 388, 388, 388, 388, 393, 393, 403, 403, 403, 418, 418, 418, 418
- **Line Count:** 50+ occurrences
- **Old Colors:**
  - Gradient backgrounds: `from-rose-50 via-white to-amber-50`
  - Rose/slate color palette throughout
  - `border-rose-100`, `text-rose-600`
  - Form inputs with slate styling
- **Replacement:** Full redesign to neon/glassmorphism

### 14. **app/page.tsx**
- **Lines:** 630, 630, 663, 708, 708, 708, 709, 712
- **Line Count:** 15 occurrences
- **Old Colors:** slate-900, slate-400, slate-100, rose-100
- **Replacement:** Update main dashboard colors

### 15. **app/myprofile/page.tsx**
- **Lines:** 15
- **Old Colors:** `from-rose-50 via-white to-amber-50` gradient
- **Replacement:** Neon gradient or glass background

---

## 📋 REPLACEMENT COLOR MAPPING

### Old → New Color Scheme

| Old Color | Context | New Color(s) |
|-----------|---------|-------------|
| `slate-50` | Light background | `bg-white/5` or `bg-white/10` |
| `slate-100` | Accent background | `bg-white/10` or `bg-cyan-500/10` |
| `slate-200` | Medium background | `bg-white/20` or `bg-cyan-400/10` |
| `slate-300` | Border / divider | `border-white/20` or `border-cyan-500/30` |
| `slate-400` | Muted text | `text-white/50` or `text-cyan-400/60` |
| `slate-500` | Medium text | `text-white/70` or `text-cyan-300/80` |
| `slate-600` | Semi-dark text | `text-white/80` or `text-cyan-200` |
| `slate-700` | Dark text | `text-white/90` or `text-cyan-100` |
| `slate-800` | Very dark background | `bg-black/40` or `bg-black/60` |
| `slate-900` | Darkest text | `text-white` |
| `gray-50` | Light background | `bg-white/5` |
| `gray-100` | Accent background | `bg-white/10` |
| `gray-200` | Medium background | `bg-white/20` |
| `gray-300` | Light border | `border-white/20` |
| `gray-400` | Muted text | `text-cyan-400/60` |
| `gray-500` | Medium text | `text-cyan-400` |
| `gray-600` | Semi-dark text | `text-white/80` |
| `gray-700` | Dark text | `text-white/90` |
| `gray-800` | Very dark text | `text-white` |
| `rose-50` | Light background | `bg-fuchsia-500/5` |
| `rose-100` | Accent background | `bg-cyan-500/10` |
| `rose-500` | Active button | `bg-cyan-500` or `bg-fuchsia-500` |
| `rose-600` | Hover button | `bg-cyan-600` or `bg-fuchsia-600` |
| `rose-700` | Dark button | `bg-cyan-700` |
| `pink-500` | Accent | `bg-fuchsia-500` |
| `white` (background) | Surface | `bg-white/10` (glass) or keep on light pages |
| `white` (text) | Strong text | Keep as-is for contrast |
| `black` (background) | Overlay/dark bg | Keep as `bg-black/40` or `bg-black/60` |
| `black` (text) | Foreground | Change to `text-white` |

---

## 🎯 FILES REQUIRING UPDATES (Full List)

### Components (12 files)
- [ ] `components/layout/CropImageModal.tsx`
- [ ] `components/layout/NewHeader.tsx`
- [ ] `components/layout/BottomNav.tsx`
- [ ] `components/layout/GuestBanner.tsx`
- [ ] `components/views/AdminCommentsView.tsx`
- [ ] `components/views/NewHomeView.tsx`
- [ ] `components/views/NewProfileDetailView.tsx`
- [ ] `components/views/NewMessagesView.tsx`
- [ ] `components/views/NewSearchView.tsx`
- [ ] `components/views/LikesView.tsx`
- [ ] `components/views/SearchView.tsx`
- [ ] (Other views with minor rose/slate usage)

### App Pages (8 files)
- [ ] `app/reset-password/page.tsx`
- [ ] `app/myprofile/page.tsx`
- [ ] `app/page.tsx`
- [ ] (Plus 5 other pages with occasional old colors)

---

## ✅ WHAT TO KEEP

These patterns should **NOT** be changed:
- `bg-white/5`, `bg-white/10`, `bg-white/20` → glass backgrounds ✓
- `border-white/5`, `border-white/10`, `border-white/20` → glass borders ✓
- `text-white` → primary text on dark backgrounds ✓
- `bg-black/40`, `bg-black/60` → dark glass overlays ✓
- `backdrop-blur-*` → blur effects ✓
- Neon colors (cyan, fuchsia, magenta) → keep and expand ✓

---

## 📝 RECOMMENDED PRIORITY

1. **Phase 1 (Critical):** NewHeader, NewHomeView, NewProfileDetailView, NewMessagesView, NewSearchView
2. **Phase 2 (High):** CropImageModal, AdminCommentsView, GuestBanner, BottomNav
3. **Phase 3 (Medium):** LikesView, SearchView, other components
4. **Phase 4 (Low):** App pages (reset-password, myprofile, page.tsx)

---

**Generated:** 9 marca 2026
**Status:** Ready for implementation
