import { useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { MobileInstallBanner } from './MobileInstallBanner'
import './AppShell.css'

export function AppShell() {
  // The direct (1:1) AI chat route must behave like the Team Chat surface:
  // the OUTER shell is the fixed-height frame and ONLY the message list
  // scrolls — the composer stays pinned above the keyboard. If .app-main is
  // itself an auto-scroll container (the default for every other route), the
  // whole chat block scrolls and the input gets pushed under the mobile
  // keyboard ("can't type" bug). So on the chat route we drop app-main's own
  // scroll + bottom padding and let .chat-view own its internal layout.
  const { pathname } = useLocation()
  const isChatRoute = pathname === '/' || pathname === ''
  const isTeamChat = pathname === '/teamchat'

  // PERSISTENT team-chat iframe (2026-06-18 "re-triggers every time I enter"):
  // previously <TeamChatView> was a ROUTE element, so React unmounted it on
  // leave and re-mounted it on return → the iframe reloaded team-chat.html from
  // scratch every entry (full WS reconnect + history re-render + re-join feel).
  // Now we mount the iframe ONCE here and just show/hide it by route, so it
  // loads a single time and persists — re-entering is instant, no reconnect.
  const teamChatSrc = useMemo(() => {
    const token = localStorage.getItem('pyonair-portal-token') || ''
    const base = import.meta.env.BASE_URL || '/'
    const path = base === '/qa/' ? '/qa/team-chat.html' : '/team-chat'
    return `${window.location.origin}${path}?embed=true${token ? `&token=${encodeURIComponent(token)}` : ''}`
  }, [])

  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className={`app-main ${isChatRoute ? 'app-main-chat' : ''} ${isTeamChat ? 'app-main-teamchat' : ''}`}>
          {/* Hide (not unmount) the Outlet on the teamchat route so the
              persistent iframe shows instead. */}
          <div style={isTeamChat ? { display: 'none' } : undefined} className="app-main-outlet">
            <Outlet />
          </div>
          <iframe
            src={teamChatSrc}
            className="teamchat-iframe"
            style={{ display: isTeamChat ? 'block' : 'none' }}
            title="Team Chat"
          />
        </main>
      </div>
      {/* Mobile-only "Add to Home Screen" banner — surfaces install WITHOUT
          opening the sidebar drawer (Jord: add-to-home "hasn't changed"). */}
      <MobileInstallBanner />
      <MobileNav />
    </div>
  )
}
