/**
 * Form direct-to-S3 uploads
 *
 * Progressive enhancement for static-site forms that POST to /app/forms/submit.
 * On submit, each <input type="file"> is uploaded straight to S3 via a
 * short-lived presigned POST minted by /app/forms/presign; the resulting object
 * keys are written into a hidden `_attachments` field so the normal form
 * submission carries them. The file bytes never pass through the app server.
 *
 *   <form action="/app/forms/submit" method="post" data-r2-uploads>
 *     <input type="file" name="resume">
 *     <div data-r2-uploads-error hidden></div>
 *     <button type="submit">Send</button>
 *   </form>
 *
 * Without JS the file input is ignored and the text fields still submit.
 */

const DEFAULT_PRESIGN_URL = '/app/forms/presign'

function fileInputs(form) {
  return Array.from(form.querySelectorAll('input[type="file"]')).filter(
    (input) => input.name && input.files && input.files.length > 0,
  )
}

function randId() {
  const bytes = new Uint8Array(8)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function uploadErrorMessage(file, status) {
  if (status === 415) return `"${file.name}" is not an allowed file type.`
  if (status === 413) return `"${file.name}" is too large.`
  return `Upload failed for "${file.name}". Please try again.`
}

async function uploadOne(presignUrl, file, subRand) {
  const contentType = file.type || 'application/octet-stream'

  const presignResp = await fetch(presignUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, content_type: contentType, sub_rand: subRand }),
  })
  if (!presignResp.ok) throw new Error(uploadErrorMessage(file, presignResp.status))

  const { url, fields, key } = await presignResp.json()
  const form = new FormData()
  Object.entries(fields).forEach(([k, v]) => form.append(k, v))
  form.append('file', file)

  const uploadResp = await fetch(url, { method: 'POST', body: form })
  if (!uploadResp.ok) throw new Error(uploadErrorMessage(file, uploadResp.status))
  return key
}

function setHidden(form, name, value) {
  let input = form.querySelector(`input[type="hidden"][name="${name}"]`)
  if (!input) {
    input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    form.appendChild(input)
  }
  input.value = value
}

function setBusy(form, busy) {
  const submit = form.querySelector('[type="submit"]')
  if (submit) submit.disabled = busy
  form.classList.toggle('r2-uploading', busy)
}

function errorTarget(form) {
  return form.querySelector('[data-r2-uploads-error]')
}

function clearError(form) {
  const el = errorTarget(form)
  if (el) {
    el.textContent = ''
    el.hidden = true
  }
}

function showError(form, err) {
  const msg = (err && err.message) || 'File upload failed. Please try again.'
  const el = errorTarget(form)
  if (el) {
    el.textContent = msg
    el.hidden = false
  } else {
    window.alert(msg)
  }
}

function attach(form) {
  if (form.dataset.r2UploadsAttached) return
  form.dataset.r2UploadsAttached = 'true'

  const presignUrl = form.dataset.r2UploadsUrl || DEFAULT_PRESIGN_URL
  let uploading = false

  form.addEventListener('submit', async (event) => {
    if (uploading) return
    const inputs = fileInputs(form)
    if (inputs.length === 0) return // nothing to upload — let it submit

    event.preventDefault()
    uploading = true
    setBusy(form, true)
    clearError(form)

    // One random group id per submission so its files share a key prefix.
    const subRand = randId()
    const attachments = {}

    try {
      for (const input of inputs) {
        const keys = []
        for (const file of input.files) {
          keys.push(await uploadOne(presignUrl, file, subRand))
        }
        attachments[input.name] = keys
        input.disabled = true // post only keys, not the raw file part
      }

      setHidden(form, '_attachments', JSON.stringify(attachments))
      form.submit() // native submit() does not re-fire the submit event
    } catch (err) {
      uploading = false
      setBusy(form, false)
      inputs.forEach((i) => (i.disabled = false))
      showError(form, err)
    }
  })
}

/** Wire up every `[data-r2-uploads]` form. Inert if none exist. */
export function initForms() {
  document.querySelectorAll('form[data-r2-uploads]').forEach(attach)
}
