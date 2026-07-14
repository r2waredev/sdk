/**
 * Floating Toolbar
 *
 * Coordinates positioning of fixed-bottom-right floating action buttons.
 * Each button registers at an order and the toolbar calculates the `right`
 * CSS offset so buttons line up without overlapping.
 *
 * Uses a window singleton so separate widgets (shop, share) can register
 * independently regardless of load order.
 *
 * Layout: lowest order is rightmost, next order is to the left, etc.
 *   right = EDGE + index * (SLOT + GAP)
 */

export const SLOT = 50 // width reserved per button
const GAP = 10 // space between slots
const EDGE = 20 // distance from viewport right edge

function getToolbar() {
  if (!window.__r2FloatingToolbar) {
    window.__r2FloatingToolbar = { items: [] }
  }
  return window.__r2FloatingToolbar
}

function reflow() {
  const toolbar = getToolbar()
  const sorted = [...toolbar.items].sort((a, b) => a.order - b.order)
  sorted.forEach((item, index) => {
    item.el.style.right = EDGE + index * (SLOT + GAP) + 'px'
  })
}

/**
 * Register a floating button. `el` must already be position:fixed.
 * Lower `order` = further right (e.g. 10, 20, 30).
 */
export function register(el, order) {
  const toolbar = getToolbar()
  if (toolbar.items.some((item) => item.el === el)) return
  toolbar.items.push({ el, order })
  reflow()
}

/** Remove a button and reflow the remaining ones. */
export function unregister(el) {
  const toolbar = getToolbar()
  toolbar.items = toolbar.items.filter((item) => item.el !== el)
  reflow()
}
