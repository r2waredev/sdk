/**
 * @r2ware/sdk — entry point
 *
 * A single self-running bundle. Each widget self-gates on its own markup, so
 * the SDK stays inert until a page actually uses a feature. Auto-initializes on
 * load; re-run `R2.init()` after injecting markup dynamically.
 */

import './styles.css'
import { initEsign } from './esign.js'
import { initShare } from './share.js'
import { initCart, Cart } from './cart.js'
import { initForms } from './forms.js'

const VERSION = __SDK_VERSION__

/**
 * Initialize all widgets. Safe to call repeatedly (each widget is idempotent).
 * @param {Object} [options]
 * @param {Object} [options.esign] - eSign overrides ({ apiEndpoint, timeout })
 */
function init(options = {}) {
  initEsign(options.esign || {})
  initShare()
  initCart()
  initForms()
}

function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn)
  } else {
    fn()
  }
}

const R2 = (window.R2 = window.R2 || {})
R2.version = VERSION
R2.init = init
R2.Cart = Cart

ready(() => init(window.R2_CONFIG || {}))

export default R2
