import { useEffect, useState, useCallback } from 'react'
import { useIdentityStore } from '../../stores/identityStore'
import { StatusBadge } from '../common/StatusBadge'
import { apiGet } from '../../api/client'
import { Link } from 'react-router-dom'
import './Header.css'

interface ContextSnapshot {
  pct: number
  total_tokens: number
  max_tokens: number
}

// Header status/context ring = a context gauge ("how full is the AI's memory").
// Clarity-signed-off LIVE value (baked into source here, superseding the earlier
// green/amber/red gradient): the gauge arc is solid Pyonair brand red #E63946 at
// all fill levels. The separate green "Active" presence dot (StatusBadge) is
// UNTOUCHED — only the gauge ring is red. `pct` is retained in the signature so
// the arc/text stay a single source of truth and future gradient work is a
// one-line change here.
const PYONAIR_RED = '#E63946'
function ctxColor(_pct: number): string {
  return PYONAIR_RED
}

/** Mini SVG ring for the header */
function CtxRing({ pct }: { pct: number }) {
  const r = 12
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <svg className="header-ctx-ring" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r={r} fill="none" stroke="var(--bg-primary)" strokeWidth="3" />
      <circle
        cx="16" cy="16" r={r}
        fill="none"
        stroke={ctxColor(pct)}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 16 16)"
        style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.3s ease' }}
      />
      <text
        x="16" y="16"
        textAnchor="middle"
        dominantBaseline="central"
        className="header-ctx-ring-text"
        style={{ fill: ctxColor(pct) }}
      >
        {Math.round(pct)}
      </text>
    </svg>
  )
}

interface Branding {
  display_name: string
  logo_url: string
  platform: string
}

export function Header() {
  const { civName, status } = useIdentityStore()
  const [ctx, setCtx] = useState<ContextSnapshot | null>(null)
  // Real Pyonair wordmark (red dot + "Pyonair"). NOTE: the original
  // pyonair-logo-light.png is a 1200x300 frame whose actual mark occupies only
  // the centre ~23% (x:462-738) with huge empty side-margins — so at a fixed
  // header height with width:auto it rendered ~272px wide with the mark stranded
  // in the middle and empty space on the left (Jord's "logo missing / empty
  // space" on mobile). FIX: use the tightly-cropped asset (292x90, content
  // flush) so the mark fills the header. We also IGNORE an API logo_url that
  // points back at the un-cropped -light.png so the crop always wins.
  // BASE_URL-prefixed so the cropped asset resolves correctly under EVERY
  // build base: '/' (default → /pyonair-logo-cropped.png) and '/qa5/' (staging
  // → /qa5/pyonair-logo-cropped.png). A bare '/pyonair-logo-cropped.png' under
  // /qa5/ hit the SPA HTML fallback (404→index.html) → broken image, the exact
  // "empty space" Jord saw.
  const LOGO_CROPPED = `${import.meta.env.BASE_URL}pyonair-logo-cropped.png`.replace(/\/{2,}/g, '/')
  const [branding, setBranding] = useState<Branding>({ display_name: '', logo_url: LOGO_CROPPED, platform: 'Pyonair' })

  const fetchCtx = useCallback(async () => {
    try {
      const data = await apiGet<ContextSnapshot>('/api/context')
      setCtx(data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchCtx()
    const interval = setInterval(fetchCtx, 30_000)
    return () => clearInterval(interval)
  }, [fetchCtx])

  useEffect(() => {
    apiGet<Branding>('/api/branding').then(b => {
      // Keep the cropped logo if the API just hands back the un-cropped
      // -light.png (it has the bad side-margins). Honour a genuinely different
      // per-client logo_url.
      const apiLogo = b.logo_url || ''
      const logo_url = (!apiLogo || apiLogo.includes('pyonair-logo-light')) ? LOGO_CROPPED : apiLogo
      setBranding({ ...b, logo_url })
      document.title = b.display_name || 'Pyonair'
    }).catch(() => {})
  }, [])

  const claudeStatus = status?.claude_running ? 'online' : 'offline'

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-brand-stack">
          <a href="https://pyonair.com" target="_blank" rel="noopener noreferrer" className="header-brand-link">
            <img src={branding.logo_url} alt={branding.platform || 'Pyonair'} className="header-logo" />
          </a>
          {branding.display_name && (
            <span className="header-display-name">{branding.display_name}</span>
          )}
        </div>
      </div>
      <div className="header-right">
        {/* "Live View" label (Jord, minor/consistency): labels the live-status
            cluster — the heartbeat ring + the Active/Offline presence badge.
            BEST-CALL placement (flagged for Jord to confirm which element she
            meant); low-priority, kept subtle so it doesn't crowd the header. */}
        <span className="header-live-label">Live View</span>
        {ctx != null && (
          <Link to="/context" className="header-ctx-link" title="Context window — click for details">
            <CtxRing pct={ctx.pct} />
          </Link>
        )}
        <StatusBadge
          status={claudeStatus}
          label={claudeStatus === 'online' ? 'Active' : 'Offline'}
        />
      </div>
    </header>
  )
}
