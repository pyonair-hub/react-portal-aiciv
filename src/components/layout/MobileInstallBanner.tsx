import { useEffect, useState } from 'react'
import './MobileInstallBanner.css'

/**
 * MobileInstallBanner — a compact, dismissible "Add to Home Screen" banner that
 * shows on MOBILE only, pinned just above the bottom nav, WITHOUT needing to
 * open the sidebar drawer.
 *
 * Why this exists: Jord said add-to-home "hasn't changed" because the install
 * affordance lived only inside the sidebar drawer (hidden behind the hamburger
 * on mobile). This surfaces it where she'll actually see it.
 *
 * Behaviour (parity with the sidebar banner):
 *  - Uses `beforeinstallprompt` → fires the REAL native install dialog on
 *    Android Chrome / Samsung Internet when PWA criteria are met.
 *  - On browsers that never fire it (iOS Safari), shows inline per-browser
 *    steps instead of a confusing alert.
 *  - Self-hides after dismiss (shared `install-banner-dismissed` localStorage
 *    key, so dismissing here also dismisses the sidebar one and vice-versa).
 *  - Auto-hides on successful `appinstalled`.
 *  - Hidden when already running standalone (already installed).
 */
export function MobileInstallBanner() {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('install-banner-dismissed') === 'true'
  )
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showHowTo, setShowHowTo] = useState(false)

  // Already-installed (standalone) → never show.
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari
      (navigator as any).standalone === true)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const onInstalled = () => dismiss()
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Browser-aware install steps. PWA install wording differs per browser, so we
  // detect from the UA and show the RIGHT instructions. Order matters:
  //  1. Firefox FIRST (FxiOS on iOS reports as iPhone too, and Firefox Android's
  //     menu has no "Add page to" — Jord's browser; wrong steps were shown).
  //  2. iOS Safari (real Safari, NOT Chrome/CriOS/Firefox/FxiOS on iOS).
  //  3. Samsung Internet.
  //  4. Chrome/Edge Android (default Chromium).
  //  5. Unknown → generic fallback.
  const platformHelp = (() => {
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    // Firefox (Android = "Firefox/", iOS = "FxiOS")
    if (/Firefox\/|FxiOS/.test(ua)) {
      return ['Tap the ⋮ menu (three dots).', 'Tap "Install" (or "Add to Home screen") — it\'s near the top of the menu, not under Add-ons.', 'Confirm — Pyonair appears on your home screen.']
    }
    // iOS Safari only (exclude Chrome/CriOS/Edge/Firefox-on-iOS, already handled)
    if (isIOS && !/CriOS|EdgiOS/.test(ua)) {
      return ['Tap the Share icon (a square with an up-arrow) at the bottom of Safari.', 'Scroll down and tap "Add to Home Screen".', 'Tap "Add" — Pyonair appears on your home screen.']
    }
    if (/SamsungBrowser/.test(ua)) {
      return ['Tap the menu (three lines) at the bottom-right.', 'Tap "Add page to" then "Home screen" (or "Install").', 'Confirm — Pyonair appears on your home screen.']
    }
    // Chrome / Edge on Android (default Chromium)
    if (/Chrome|CriOS|Edg/i.test(ua)) {
      return ['Tap the ⋮ menu (top-right).', 'Tap "Add to Home screen" or "Install app".', 'Tap "Install" — Pyonair appears on your home screen.']
    }
    // Unknown browser — generic, wording-agnostic fallback.
    return ['Open your browser menu (look for ⋮ or three lines).', 'Look for "Install", "Add to Home screen", or "Add page to" — wording varies by browser.', 'Confirm — Pyonair appears on your home screen.']
  })()

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      if (result.outcome === 'accepted') dismiss()
      return
    }
    setShowHowTo(v => !v)
  }

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem('install-banner-dismissed', 'true')
  }

  if (dismissed || isStandalone) return null

  return (
    <div className="mobile-install-banner" role="region" aria-label="Install Pyonair app">
      <div className="mobile-install-row">
        <span className="mobile-install-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12" />
            <polyline points="7 10 12 15 17 10" />
            <path d="M5 19h14" />
          </svg>
        </span>
        <div className="mobile-install-text">
          <strong>Install the Pyonair app</strong>
          <span>Open Pyonair like an app — one tap, always up to date.</span>
        </div>
        <button className="mobile-install-btn" onClick={handleInstall} type="button">
          {deferredPrompt ? 'Install app' : 'How'}
        </button>
        <button className="mobile-install-dismiss" onClick={dismiss} type="button" aria-label="Dismiss install banner">&times;</button>
      </div>
      {showHowTo && (
        <div className="mobile-install-howto">
          <ol>
            {platformHelp.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          <button className="mobile-install-howto-done" onClick={() => setShowHowTo(false)} type="button">Got it</button>
        </div>
      )}
    </div>
  )
}
