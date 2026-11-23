/**
 * iOS 26 Safari (and installed PWAs) has a WebKit bug where, after the
 * on-screen keyboard closes, visualViewport.offsetTop doesn't reset. Elements
 * with position:fixed; bottom:0 then float up the page by roughly the
 * keyboard's height while scrolling (WebKit bugs 297779 and 300523).
 *
 * This works out how far below the layout viewport's bottom edge the visible
 * screen's bottom edge really is, so fixed bottom UI can be pushed back down.
 *
 * Returns 0 when nothing is wrong, when the user has pinch-zoomed (fixed
 * elements are meant to stay put then), and while the keyboard is open (the
 * visible bottom sits above the layout bottom, and the nav should stay
 * behind the keyboard rather than ride on top of it).
 */
export function viewportShift(vv: {
  offsetTop: number
  height: number
  scale: number
} | null | undefined, layoutHeight: number): number {
  if (!vv || !layoutHeight) return 0
  if (Math.abs(vv.scale - 1) > 0.01) return 0
  const shift = vv.offsetTop + vv.height - layoutHeight
  // Ignore sub-pixel noise.
  return shift > 1 ? Math.round(shift) : 0
}
