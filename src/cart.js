/**
 * Shopping cart (embeddable surface)
 *
 * The client-side pieces a static storefront needs:
 *   - Cart        : localStorage-backed cart API
 *   - add-to-cart : `[data-r2-add-to-cart]` buttons
 *   - floating icon + badge (links to the platform-served /app/shop/cart page)
 *   - checkout-success clearing via `[data-r2-checkout-success]`
 *
 * The cart *page* itself (/app/shop/cart) is rendered and served by the
 * platform, not the SDK; it imports `Cart` from here for its storage API.
 */

import { register as toolbarRegister, SLOT as TOOLBAR_SLOT } from './floating-toolbar.js'

// =============================================================================
// Core cart (localStorage)
// =============================================================================

const Cart = (function () {
  const STORAGE_KEY = 'cart'
  const VERSION = 2

  function isLocalStorageAvailable() {
    try {
      const test = '__localStorage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch (e) {
      return false
    }
  }

  // Stable identity for a cart line: same productId + customizations -> same line.
  function computeLineKey(productId, customizations) {
    if (!customizations || customizations.length === 0) return productId
    return productId + '#' + JSON.stringify(customizations)
  }

  function getCartData() {
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage is not available. Please enable cookies/storage in your browser.')
    }
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return { items: [], updatedAt: Date.now(), version: VERSION }

      const cart = JSON.parse(data)
      if (!cart.items || !Array.isArray(cart.items)) {
        console.warn('Invalid cart schema, resetting cart')
        return { items: [], updatedAt: Date.now(), version: VERSION }
      }
      // v1 items have no customizations / lineKey. Backfill both.
      if (cart.version !== VERSION) {
        cart.items.forEach((item) => {
          if (!Array.isArray(item.customizations)) item.customizations = []
          if (!item.lineKey) item.lineKey = computeLineKey(item.productId, item.customizations)
        })
        cart.version = VERSION
      }
      return cart
    } catch (e) {
      console.error('Failed to parse cart data:', e)
      return { items: [], updatedAt: Date.now(), version: VERSION }
    }
  }

  function saveCartData(cart) {
    if (!isLocalStorageAvailable()) throw new Error('localStorage is not available')
    cart.updatedAt = Date.now()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }))
  }

  return {
    isAvailable() {
      return isLocalStorageAvailable()
    },
    getItems() {
      return getCartData().items
    },
    addItem(item, quantity = 1) {
      const cart = getCartData()
      if (!item.productId || !item.name || !item.price) {
        throw new Error('Invalid item: missing required fields (productId, name, price)')
      }
      if (quantity < 1) throw new Error('Quantity must be at least 1')

      const maxQuantity = parseInt(item.maxQuantity, 10) || 99
      const customizations = Array.isArray(item.customizations) ? item.customizations : []
      const lineKey = computeLineKey(item.productId, customizations)
      const existingItem = cart.items.find((i) => i.lineKey === lineKey)

      if (existingItem) {
        const newQty = existingItem.quantity + quantity
        if (newQty > maxQuantity) throw new Error(`Maximum quantity for '${item.name}' is ${maxQuantity}`)
        existingItem.quantity = newQty
        existingItem.maxQuantity = maxQuantity
      } else {
        if (quantity > maxQuantity) throw new Error(`Maximum quantity for '${item.name}' is ${maxQuantity}`)
        cart.items.push({
          lineKey: lineKey,
          productId: item.productId,
          name: item.name,
          price: parseInt(item.price, 10),
          currency: item.currency || 'usd',
          quantity: quantity,
          maxQuantity: maxQuantity,
          imageUrl: item.imageUrl || '',
          esignTemplateId: item.esignTemplateId || '',
          customizations: customizations,
        })
      }
      saveCartData(cart)
      return cart.items
    },
    updateQuantity(lineKey, quantity) {
      const cart = getCartData()
      const item = cart.items.find((i) => i.lineKey === lineKey)
      if (!item) throw new Error('Item not found in cart')
      if (quantity <= 0) {
        cart.items = cart.items.filter((i) => i.lineKey !== lineKey)
      } else {
        const maxQuantity = item.maxQuantity || 99
        if (quantity > maxQuantity) throw new Error(`Maximum quantity for '${item.name}' is ${maxQuantity}`)
        item.quantity = quantity
      }
      saveCartData(cart)
      return cart.items
    },
    removeItem(lineKey) {
      const cart = getCartData()
      cart.items = cart.items.filter((i) => i.lineKey !== lineKey)
      saveCartData(cart)
      return cart.items
    },
    clear() {
      const cart = { items: [], updatedAt: Date.now(), version: VERSION }
      saveCartData(cart)
      return cart.items
    },
    getTotals() {
      const items = this.getItems()
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      return { itemCount, subtotal, currency: items.length > 0 ? items[0].currency : 'usd' }
    },
    getCheckoutPayload() {
      const items = this.getItems()
      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          customizations: item.customizations || [],
        })),
      }
      const discount = this.getDiscount()
      if (discount && discount.code) payload.discountCode = discount.code
      return payload
    },
    // Persisted in sessionStorage so the code survives the eSign hop and
    // Stripe Checkout redirects, mirroring `checkout_session_id`.
    getDiscount() {
      try {
        const raw = sessionStorage.getItem('discount_code')
        return raw ? JSON.parse(raw) : null
      } catch (e) {
        return null
      }
    },
    setDiscount(discount) {
      try {
        sessionStorage.setItem('discount_code', JSON.stringify(discount))
      } catch (e) {
        // sessionStorage unavailable — fail open and let the user re-enter.
      }
    },
    clearDiscount() {
      try {
        sessionStorage.removeItem('discount_code')
      } catch (e) {
        // ignore
      }
    },
  }
})()

// =============================================================================
// Scoped toast (no Bootstrap)
// =============================================================================

const ICONS = {
  success:
    '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.08-.022l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>',
  danger:
    '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057M8.95 1.255a1.13 1.13 0 0 0-1.9 0L.165 12.92c-.457.778.091 1.767.991 1.767h13.685c.9 0 1.448-.99.991-1.767zM8 5a.9.9 0 0 0-.9.995l.35 3.507a.55.55 0 0 0 1.1 0l.35-3.507A.9.9 0 0 0 8 5m.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/></svg>',
  info: '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2"/></svg>',
  warning:
    '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/></svg>',
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div')
  toast.className = `r2-toast r2-toast--${type}`
  toast.setAttribute('role', 'status')

  const icon = document.createElement('span')
  icon.className = 'r2-toast__icon'
  icon.innerHTML = ICONS[type] || ICONS.info

  const text = document.createElement('span')
  text.className = 'r2-toast__msg'
  text.textContent = message

  toast.appendChild(icon)
  toast.appendChild(text)
  document.body.appendChild(toast)

  // Force reflow then animate in.
  void toast.offsetWidth
  toast.classList.add('r2-toast--show')

  setTimeout(() => {
    toast.classList.remove('r2-toast--show')
    setTimeout(() => toast.remove(), 200)
  }, 3000)
}

// =============================================================================
// Floating cart icon + badge
// =============================================================================

function createFloatingCartIcon() {
  if (document.getElementById('r2-cart-icon')) return

  const cartIcon = document.createElement('a')
  cartIcon.id = 'r2-cart-icon'
  cartIcon.href = '/app/shop/cart'

  const totals = Cart.getTotals()
  const shouldShow = totals.itemCount > 0 || document.body.hasAttribute('data-r2-cart-show')

  cartIcon.style.cssText = `
    all: unset;
    position: fixed;
    bottom: 20px;
    width: ${TOOLBAR_SLOT || 50}px;
    height: ${TOOLBAR_SLOT || 50}px;
    border-radius: 50%;
    display: ${shouldShow ? 'flex' : 'none'};
    align-items: center;
    justify-content: center;
    background-color: #0d6efd;
    color: white;
    text-decoration: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
    box-sizing: border-box;
  `

  const icon = document.createElement('span')
  icon.style.cssText = 'all: unset; width: 24px; height: 24px; display: block;'
  icon.setAttribute('aria-hidden', 'true')
  icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16" fill="currentColor" style="display: block; width: 100%; height: 100%;">
      <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .49.598l-1 5a.5.5 0 0 1-.465.401l-9.397.472L4.415 11H13a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M3.102 4l.84 4.479 9.144-.459L13.89 4zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
    </svg>
  `

  const badge = document.createElement('span')
  badge.id = 'r2-cart-badge'
  badge.style.cssText = `
    all: unset;
    position: absolute;
    top: -5px;
    right: -5px;
    min-width: 20px;
    height: 20px;
    padding: 2px 6px;
    border-radius: 10px;
    background-color: #dc3545;
    color: white;
    font-size: 11px;
    font-weight: bold;
    line-height: 16px;
    text-align: center;
    display: none;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  `
  badge.textContent = '0'

  cartIcon.appendChild(icon)
  cartIcon.appendChild(badge)

  cartIcon.addEventListener('mouseenter', () => {
    cartIcon.style.transform = 'scale(1.1)'
    cartIcon.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)'
  })
  cartIcon.addEventListener('mouseleave', () => {
    cartIcon.style.transform = 'scale(1)'
    cartIcon.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
  })

  document.body.appendChild(cartIcon)
  toolbarRegister(cartIcon, 10)
}

function updateCartBadge() {
  if (!Cart.isAvailable()) return

  const totals = Cart.getTotals()
  const shouldShow = totals.itemCount > 0 || document.body.hasAttribute('data-r2-cart-show')

  const cartIcon = document.getElementById('r2-cart-icon')
  if (cartIcon) cartIcon.style.display = shouldShow ? 'flex' : 'none'

  const floatingBadge = document.getElementById('r2-cart-badge')
  if (floatingBadge) {
    if (totals.itemCount > 0) {
      floatingBadge.textContent = totals.itemCount
      floatingBadge.style.display = 'block'
      floatingBadge.classList.remove('r2-cart-badge-bounce')
      void floatingBadge.offsetWidth
      floatingBadge.classList.add('r2-cart-badge-bounce')
    } else {
      floatingBadge.style.display = 'none'
    }
  }
}

// =============================================================================
// Add to cart
// =============================================================================

function handleAddToCart(event) {
  const button = event.target.closest('[data-r2-add-to-cart]')
  if (!button) return

  event.preventDefault()

  if (!Cart.isAvailable()) {
    showToast('Cart unavailable. Please enable localStorage.', 'danger')
    return
  }

  let customizations = []
  if (button.dataset.customizations) {
    try {
      const parsed = JSON.parse(button.dataset.customizations)
      if (Array.isArray(parsed)) customizations = parsed
    } catch (e) {
      console.warn('Invalid data-customizations JSON, ignoring:', e)
    }
  }

  const item = {
    productId: button.dataset.productId,
    name: button.dataset.name,
    price: button.dataset.price,
    currency: button.dataset.currency || 'usd',
    imageUrl: button.dataset.imageUrl || '',
    esignTemplateId: button.dataset.esignTemplateId || '',
    maxQuantity: button.dataset.maxQuantity || '99',
    customizations: customizations,
  }

  if (!item.productId || !item.name || !item.price) {
    console.error('Invalid product data:', item)
    showToast('Error adding item to cart.', 'danger')
    return
  }

  try {
    Cart.addItem(item, 1)
    showToast(`${item.name} added to cart!`, 'success')
    updateCartBadge()
  } catch (error) {
    console.error('Error adding to cart:', error)
    showToast(error.message, 'danger')
  }
}

// =============================================================================
// Init
// =============================================================================

let initialized = false

/** Initialize the shop cart surface (floating icon, add-to-cart, badge). */
export function initCart() {
  if (initialized) return
  initialized = true

  // Clear the cart after a successful checkout.
  if (document.querySelector('[data-r2-checkout-success]')) {
    if (Cart.isAvailable()) Cart.clear()
    const badge = document.getElementById('r2-cart-badge')
    if (badge) badge.style.display = 'none'
    const icon = document.getElementById('r2-cart-icon')
    if (icon) icon.style.display = 'none'
  }

  createFloatingCartIcon()

  if (!Cart.isAvailable()) {
    showToast('Shopping cart unavailable: enable cookies/storage in your browser.', 'danger')
    document.querySelectorAll('[data-r2-add-to-cart]').forEach((button) => {
      button.disabled = true
      button.title = 'Cart unavailable (localStorage required)'
    })
    console.error('Shopping cart unavailable: localStorage is not supported or disabled')
    return
  }

  document.body.addEventListener('click', handleAddToCart)
  window.addEventListener('cartUpdated', updateCartBadge)
  updateCartBadge()
}

export { Cart }
