/**
 * eSign trigger
 *
 * Turns any element with a `data-r2-esign` attribute into an e-signature
 * trigger: on click it creates a contract via the backend and redirects the
 * visitor to the signing URL.
 *
 *   <button data-r2-esign
 *           data-template-id="template_abc123"
 *           data-document-name="Client Agreement"
 *           data-signer-email="client@example.com"
 *           data-signer-name="John Doe"
 *           data-redirect-url="/thank-you"
 *           data-metadata-order-id="1234">
 *     Sign Agreement
 *   </button>
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

const config = {
  apiEndpoint: '/api/esign/create-contract',
  triggerSelector: '[data-r2-esign]',
  loadingClass: 'r2-esign-loading',
  errorClass: 'r2-esign-error',
  timeout: 10000,
}

function attachListeners() {
  document.querySelectorAll(config.triggerSelector).forEach((trigger) => {
    if (trigger.dataset.r2EsignAttached) return
    trigger.dataset.r2EsignAttached = 'true'
    trigger.addEventListener('click', handleTriggerClick)
  })
}

async function handleTriggerClick(event) {
  event.preventDefault()
  const button = event.currentTarget
  if (button.classList.contains(config.loadingClass)) return

  clearError(button)
  try {
    const signingUrl = await createContract(button)
    window.location.href = signingUrl
  } catch (error) {
    showError(button, error.message)
  }
}

function extractData(element) {
  const data = {
    template_id: element.dataset.templateId,
    document_name: element.dataset.documentName,
    signer_email: element.dataset.signerEmail,
    signer_name: element.dataset.signerName || null,
    redirect_url: element.dataset.redirectUrl || null,
    metadata: {},
  }

  // data-metadata-order-id -> metadata.order_id
  for (const [key, value] of Object.entries(element.dataset)) {
    if (key.startsWith('metadata')) {
      const metaKey = key
        .replace('metadata', '')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
      if (metaKey) data.metadata[metaKey] = value
    }
  }

  if (Object.keys(data.metadata).length === 0) delete data.metadata
  return data
}

function validate(data) {
  const errors = []
  if (!data.template_id) errors.push('Template ID is required (data-template-id)')
  if (!data.document_name) errors.push('Document name is required (data-document-name)')
  if (!data.signer_email) {
    errors.push('Signer email is required (data-signer-email)')
  } else if (!EMAIL_REGEX.test(data.signer_email)) {
    errors.push('Invalid email format')
  }
  return { valid: errors.length === 0, errors }
}

async function createContract(element) {
  const data = extractData(element)
  const validation = validate(data)
  if (!validation.valid) throw new Error(validation.errors.join('; '))

  setLoading(element, true)
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.message || `Request failed with status ${response.status}`)
    }
    if (!result.signing_url) throw new Error('No signing URL returned from server')
    return result.signing_url
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Request timed out. Please try again.')
    throw error
  } finally {
    setLoading(element, false)
  }
}

function setLoading(element, loading) {
  if (loading) {
    element.classList.add(config.loadingClass)
    element.dataset.originalText = element.textContent
    element.textContent = 'Loading...'
    element.disabled = true
  } else {
    element.classList.remove(config.loadingClass)
    if (element.dataset.originalText) {
      element.textContent = element.dataset.originalText
      delete element.dataset.originalText
    }
    element.disabled = false
  }
}

function showError(element, message) {
  element.classList.add(config.errorClass)
  let errorEl = element.nextElementSibling
  if (!errorEl || !errorEl.classList.contains('r2-esign-error-msg')) {
    errorEl = document.createElement('div')
    errorEl.className = 'r2-esign-error-msg'
    element.parentNode.insertBefore(errorEl, element.nextSibling)
  }
  errorEl.textContent = message
}

function clearError(element) {
  element.classList.remove(config.errorClass)
  const errorEl = element.nextElementSibling
  if (errorEl && errorEl.classList.contains('r2-esign-error-msg')) {
    errorEl.remove()
  }
}

/**
 * Initialize eSign triggers. Inert if no `[data-r2-esign]` elements exist.
 * @param {Object} [options] - { apiEndpoint, triggerSelector, timeout }
 */
export function initEsign(options = {}) {
  Object.assign(config, options)
  attachListeners()
}

// Exposed for testing / advanced use.
export { createContract, extractData, validate }
