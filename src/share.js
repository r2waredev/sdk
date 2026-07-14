/**
 * Share toolbar
 *
 * Floating share icon that opens an iframe modal for managing PIN-based page
 * sharing. Opt in by setting `data-r2-share` on <html> or <body>. The iframe
 * loads /app/share/manage (server-rendered by the platform).
 */

import { register as toolbarRegister, SLOT as TOOLBAR_SLOT } from './floating-toolbar.js'

function createFloatingIcon() {
  if (document.getElementById('r2-share-icon')) return

  const btn = document.createElement('button')
  btn.id = 'r2-share-icon'
  btn.setAttribute('aria-label', 'Share settings')
  btn.style.cssText = `
    all: unset;
    position: fixed;
    bottom: 20px;
    width: ${TOOLBAR_SLOT || 50}px;
    height: ${TOOLBAR_SLOT || 50}px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #6c757d;
    color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
    box-sizing: border-box;
  `

  const icon = document.createElement('span')
  icon.style.cssText = 'all: unset; width: 20px; height: 20px; display: block;'
  icon.setAttribute('aria-hidden', 'true')
  icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" style="display:block;width:100%;height:100%;">
      <path d="M9.71 6.71L11 5.41V14C11 14.2652 11.1054 14.5196 11.2929 14.7071C11.4804 14.8946 11.7348 15 12 15C12.2652 15 12.5196 14.8946 12.7071 14.7071C12.8946 14.5196 13 14.2652 13 14V5.41L14.29 6.71C14.383 6.80373 14.4936 6.87812 14.6154 6.92889C14.7373 6.97966 14.868 7.0058 15 7.0058C15.132 7.0058 15.2627 6.97966 15.3846 6.92889C15.5064 6.87812 15.617 6.80373 15.71 6.71C15.8037 6.61704 15.8781 6.50644 15.9289 6.38458C15.9797 6.26272 16.0058 6.13201 16.0058 6C16.0058 5.86799 15.9797 5.73728 15.9289 5.61542C15.8781 5.49356 15.8037 5.38296 15.71 5.29L12.71 2.29C12.617 2.19627 12.5064 2.12188 12.3846 2.07111C12.2627 2.02034 12.132 1.9942 12 1.9942C11.868 1.9942 11.7373 2.02034 11.6154 2.07111C11.4936 2.12188 11.383 2.19627 11.29 2.29L8.29 5.29C8.1017 5.4783 7.99591 5.7337 7.99591 6C7.99591 6.2663 8.1017 6.5217 8.29 6.71C8.47831 6.8983 8.7337 7.00409 9 7.00409C9.2663 7.00409 9.5217 6.8983 9.71 6.71Z" fill="currentColor"/>
      <path d="M18 9H15V11H18V20H6V11H9V9H6C5.46957 9 4.96086 9.21071 4.58579 9.58579C4.21071 9.96086 4 10.4696 4 11V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V11C20 10.4696 19.7893 9.96086 19.4142 9.58579C19.0391 9.21071 18.5304 9 18 9Z" fill="currentColor"/>
    </svg>
  `
  btn.appendChild(icon)

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)'
    btn.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)'
  })
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)'
    btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
  })

  btn.addEventListener('click', openModal)
  document.body.appendChild(btn)

  toolbarRegister(btn, 20)
}

function openModal() {
  if (document.getElementById('r2-share-modal-overlay')) return

  const overlay = document.createElement('div')
  overlay.id = 'r2-share-modal-overlay'
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 10001;
    display: flex; align-items: center; justify-content: center;
  `
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal()
  })

  const path = encodeURIComponent(window.location.pathname)
  const iframe = document.createElement('iframe')
  iframe.id = 'r2-share-modal-iframe'
  iframe.src = '/app/share/manage?path=' + path
  iframe.style.cssText = `
    border: none;
    border-radius: 8px;
    width: 420px;
    height: 340px;
    max-width: 95vw;
    max-height: 80vh;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    background: #fff;
  `

  overlay.appendChild(iframe)
  document.body.appendChild(overlay)
}

function closeModal() {
  const overlay = document.getElementById('r2-share-modal-overlay')
  if (overlay) overlay.remove()

  const url = new URL(window.location)
  if (url.searchParams.has('share')) {
    url.searchParams.delete('share')
    window.history.replaceState({}, '', url)
  }
}

function isOptedIn() {
  return (
    document.documentElement.hasAttribute('data-r2-share') ||
    document.body.hasAttribute('data-r2-share')
  )
}

let listening = false

/** Initialize the share toolbar. Inert unless `data-r2-share` is present. */
export function initShare() {
  if (!isOptedIn()) return
  if (document.getElementById('r2-share-icon')) return // already initialized

  if (!listening) {
    listening = true
    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'share-close') closeModal()
    })
  }

  createFloatingIcon()

  const params = new URLSearchParams(window.location.search)
  if (params.get('share') === 'open') openModal()
}
