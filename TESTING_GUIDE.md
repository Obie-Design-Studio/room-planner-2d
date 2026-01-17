# Responsive Design Testing Guide

## Quick Test Instructions

### Option 1: Browser Resize Test (Desktop)

1. **Open the app**
   - Navigate to http://localhost:3000
   - Make sure dev server is running (`npm run dev`)

2. **Test Desktop View (> 1024px)**
   - Maximize your browser window
   - ✅ Verify: Sidebar is 320px wide and always visible
   - ✅ Verify: No hamburger menu in header
   - ✅ Verify: Room name and dimensions shown in center of header
   - ✅ Verify: Zoom controls are 40px × 40px

3. **Test Tablet View (768px - 1024px)**
   - Resize browser to ~900px width
   - ✅ Verify: Sidebar is 280px wide and always visible
   - ✅ Verify: No hamburger menu
   - ✅ Verify: Canvas adjusts to remaining space
   - ✅ Verify: All features still accessible

4. **Test Mobile View (< 768px)**
   - Resize browser to ~375px width (iPhone size)
   - ✅ Verify: Sidebar is hidden by default
   - ✅ Verify: Hamburger menu (☰) visible in top-left
   - ✅ Verify: Canvas is full width
   - ✅ Verify: Room name hidden, only unit selector visible
   - ✅ Verify: Zoom controls are 36px × 36px

5. **Test Mobile Sidebar Interaction**
   - Click hamburger menu (☰)
   - ✅ Verify: Sidebar slides in from left (smooth animation)
   - ✅ Verify: Backdrop overlay appears (dark semi-transparent)
   - ✅ Verify: Icon changes to X
   - Click backdrop or canvas
   - ✅ Verify: Sidebar closes smoothly
   - ✅ Verify: Icon changes back to ☰

### Option 2: Chrome DevTools Device Emulation

1. **Open DevTools**
   - Press F12 or Cmd+Option+I (Mac)
   - Click "Toggle device toolbar" icon or press Cmd+Shift+M

2. **Test iPhone 12 Pro (390px)**
   ```
   Expected behavior:
   - Hamburger menu visible
   - Sidebar hidden by default
   - Full-width canvas
   - 36px zoom controls
   - Clicking hamburger opens sidebar as overlay
   ```

3. **Test iPad (768px)**
   ```
   Expected behavior:
   - No hamburger menu
   - Sidebar always visible at 280px
   - Canvas fills remaining space
   - 40px zoom controls
   ```

4. **Test Desktop (1920px)**
   ```
   Expected behavior:
   - No hamburger menu
   - Sidebar always visible at 320px
   - Full header with room info
   - 40px zoom controls
   ```

### Option 3: Multiple Real Devices

Test on actual devices if available:
- **Phone**: iPhone, Android (portrait & landscape)
- **Tablet**: iPad, Android tablet
- **Desktop**: Laptop, external monitor

## Detailed Feature Testing

### Mobile Sidebar Tests

| Test | Action | Expected Result |
|------|--------|-----------------|
| Open | Click hamburger (☰) | Sidebar slides in from left, backdrop appears |
| Close via X | Click X icon | Sidebar slides out, backdrop disappears |
| Close via backdrop | Click dark area | Sidebar closes |
| Close via canvas | Click canvas | Sidebar closes |
| Scroll sidebar | Scroll within sidebar | Smooth touch scrolling |
| Add furniture | Click "Add Bed" | Item added, sidebar stays open |

### Responsive Layout Tests

| Screen Width | Sidebar Visible | Sidebar Width | Hamburger | Canvas Width |
|--------------|-----------------|---------------|-----------|--------------|
| 375px (Mobile) | No (overlay) | 320px | Yes | 100% |
| 768px (Tablet) | Yes | 280px | No | calc(100% - 280px) |
| 1024px (Desktop) | Yes | 320px | No | calc(100% - 320px) |
| 1920px (Desktop) | Yes | 320px | No | calc(100% - 320px) |

### Touch Target Tests (Mobile)

All interactive elements should be minimum 44px × 44px:
- ✅ Hamburger menu button
- ✅ Zoom in button
- ✅ Zoom out button
- ✅ Fit to view button
- ✅ Sidebar close button (X)
- ✅ Add furniture buttons
- ✅ Edit/delete buttons in item list

### Animation Tests

- ✅ Sidebar slide-in: 250ms smooth ease-in-out
- ✅ Sidebar slide-out: 250ms smooth ease-in-out
- ✅ Backdrop fade: Smooth opacity transition
- ✅ No layout jank during animations

### Resize Tests

1. Start in mobile view (< 768px)
2. Slowly resize to tablet (768px+)
3. ✅ Verify: Hamburger disappears
4. ✅ Verify: Sidebar becomes permanently visible
5. ✅ Verify: Canvas width adjusts smoothly
6. Continue to desktop (1024px+)
7. ✅ Verify: Sidebar expands to 320px
8. Resize back down
9. ✅ Verify: All transitions are smooth

## Common Issues & Solutions

### Issue: Sidebar doesn't close on mobile
**Solution**: Check that backdrop overlay is receiving click events

### Issue: Hamburger menu not visible
**Solution**: Check screen width is < 768px

### Issue: Canvas too small on mobile
**Solution**: Verify viewport meta tag is present in layout.tsx

### Issue: Touch targets too small
**Solution**: Check globals.css has minimum touch target rules

### Issue: Sidebar not scrolling smoothly
**Solution**: Verify -webkit-overflow-scrolling: touch is applied

## Browser Testing Checklist

### Chrome (Desktop & Mobile)
- [ ] Desktop view works
- [ ] Tablet view works
- [ ] Mobile view works
- [ ] Device emulation accurate
- [ ] Touch events work in emulation

### Safari (iOS)
- [ ] Sidebar opens/closes smoothly
- [ ] No pull-to-refresh interference
- [ ] Touch scrolling works
- [ ] Canvas interactions work
- [ ] Zoom controls responsive

### Firefox (Desktop)
- [ ] All responsive breakpoints work
- [ ] Sidebar animations smooth
- [ ] Canvas rendering correct

### Edge (Desktop)
- [ ] Same as Chrome testing
- [ ] No specific Edge issues

## Performance Tests

### Mobile Performance
- Canvas rendering at 30+ FPS
- Sidebar animation smooth (60 FPS)
- No lag when dragging furniture
- Zoom controls responsive

### Tablet Performance
- Same as mobile, should be faster
- No performance degradation

## Accessibility Tests

### Touch Accessibility
- [ ] All buttons minimum 44×44px
- [ ] Sufficient spacing between buttons
- [ ] No accidental taps

### Keyboard Accessibility (tablets with keyboards)
- [ ] All keyboard shortcuts still work
- [ ] Tab navigation works
- [ ] Focus indicators visible

## Screenshot Checklist

Take screenshots at these key widths:
1. 375px (iPhone SE)
2. 390px (iPhone 12 Pro)
3. 768px (iPad Portrait)
4. 1024px (iPad Landscape)
5. 1920px (Desktop)

Compare with expected layouts in RESPONSIVE_DESIGN.md

## Quick Visual Test

Open app and look for:
- ✅ Clean, uncluttered mobile layout
- ✅ Easy-to-tap controls
- ✅ Smooth animations
- ✅ Proper spacing
- ✅ No horizontal scrolling
- ✅ No cut-off content
- ✅ Readable text at all sizes

## Pass/Fail Criteria

**PASS**: All responsive breakpoints work, sidebar animations smooth, touch targets adequate, no layout issues

**FAIL**: Sidebar doesn't work on mobile, hamburger not visible, touch targets too small, layout breaks at certain widths

---

## Quick Commands

```bash
# Start dev server
npm run dev

# Open in default browser (Mac)
open http://localhost:3000

# Open Chrome DevTools device mode
# Then press: Cmd+Shift+M (Mac) or Ctrl+Shift+M (Windows)
```
