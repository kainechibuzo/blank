import { useEffect, useRef } from 'react'

/**
 * captcha.jsx — hCaptcha, explicitly rendered.
 *
 * Rendered only when a site key is configured. Without one the vote buttons
 * still work, so the site is usable before captcha keys exist; the gap is
 * visible in the UI rather than hidden.
 *
 * The widget is loaded on demand, never at page load, so a visitor who never
 * votes never downloads it.
 */

let loadPromise = null

function loadHcaptcha() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    window.hcaptchaOnLoad = () => resolve(window.hcaptcha)
    const script = document.createElement('script')
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit&onload=hcaptchaOnLoad'
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('Could not load the captcha script'))
    document.head.appendChild(script)
  })
  return loadPromise
}

export default function Captcha({ sitekey, onVerify, onExpire, onError }) {
  const containerRef = useRef(null)
  const callbacks = useRef({ onVerify, onExpire, onError })
  callbacks.current = { onVerify, onExpire, onError }

  useEffect(() => {
    let cancelled = false
    let widgetId = null

    loadHcaptcha()
      .then((hcaptcha) => {
        if (cancelled || !containerRef.current) return
        widgetId = hcaptcha.render(containerRef.current, {
          sitekey,
          theme: 'light',
          size: 'compact',
          callback: (token) => callbacks.current.onVerify?.(token),
          'expired-callback': () => callbacks.current.onExpire?.(),
          'error-callback': () => callbacks.current.onError?.(),
        })
      })
      .catch(() => {
        if (!cancelled) callbacks.current.onError?.()
      })

    return () => {
      cancelled = true
      if (widgetId !== null && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetId)
        } catch {
          /* the widget is already gone; nothing to clean up */
        }
      }
    }
  }, [sitekey])

  return <div ref={containerRef} aria-label="Human check required before voting" />
}
