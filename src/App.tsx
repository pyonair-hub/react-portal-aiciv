import { lazy, Suspense, useEffect, useState, useCallback } from 'react'
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
// Pyonair extension registry — Pyonair-only routes layered on top of base portal
import { PYONAIR_ROUTES } from './extensions'
import { AuthGuard } from './components/auth/AuthGuard'
import { ClaudeAuthFlow } from './components/auth/ClaudeAuthFlow'
import { AppShell } from './components/layout/AppShell'
import { ChatView } from './components/chat/ChatView'
import { CalendarView } from './components/calendar/CalendarView'
import { MailView } from './components/agentmail/MailView'
import { SettingsView } from './components/settings/SettingsView'
import { TerminalView } from './components/terminal/TerminalView'
import { ConsoleView } from './components/console/ConsoleView'
import { TeamsView } from './components/teams/TeamsView'
// Pass the portal auth token + embed flag into the team-chat iframe. The
// embedded team-chat.html needs a token for its /api/team-chat/* + WS calls;
// without it every call 401s and the chat hangs blank (the 2026-06-18 "stuck
// team chat" bug). We pass it explicitly via ?token so it never depends on
// localStorage key/timing. (team-chat.html also falls back to reading this key
// itself, belt-and-suspenders.)
// The team-chat iframe is now rendered PERSISTENTLY in AppShell (mounted once,
// shown/hidden by route) so it doesn't reload/reconnect every time the user
// re-enters /teamchat (2026-06-18 "re-triggers every entry" fix). This route
// element is intentionally empty — AppShell shows the persistent iframe when
// pathname === '/teamchat'.
const TeamChatView = () => null
import { BookmarksView } from './components/bookmarks/BookmarksView'
import { StatusView } from './components/status/StatusView'
import { ContextView } from './components/context/ContextView'
import OrgChartView from './components/agents/OrgChartView'
import { DocsView } from './components/docs/DocsView'
import { SheetsView } from './components/sheets/SheetsView'
import { PointsView } from './components/points/PointsView'
import { TriadView } from './components/triad/TriadView'
import { GuideView } from './components/guide/GuideView'
import { useIdentityStore } from './stores/identityStore'
import { useSettingsStore } from './stores/settingsStore'
import { apiGet } from './api/client'

/** Runs identity + status fetches only after auth succeeds */
function AuthenticatedApp() {
  const fetchIdentity = useIdentityStore(s => s.fetchIdentity)
  const fetchStatusInfo = useIdentityStore(s => s.fetchStatusInfo)

  useEffect(() => {
    fetchIdentity()
    fetchStatusInfo()
    const interval = setInterval(fetchStatusInfo, 30_000)
    return () => clearInterval(interval)
  }, [fetchIdentity, fetchStatusInfo])

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<ChatView />} />
        <Route path="/terminal" element={<ConsoleView />} />
        <Route path="/console" element={<ConsoleView />} />
        <Route path="/teams" element={<TeamsView />} />
        <Route path="/teamchat" element={<TeamChatView />} />
        <Route path="/orgchart" element={<OrgChartView />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/mail" element={<MailView />} />
        <Route path="/bookmarks" element={<BookmarksView />} />
        <Route path="/context" element={<ContextView />} />
        <Route path="/points" element={<PointsView />} />
        <Route path="/docs" element={<DocsView />} />
        <Route path="/sheets" element={<SheetsView />} />
        <Route path="/triad" element={<TriadView />} />
        <Route path="/status" element={<StatusView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/guide" element={<GuideView />} />
        {/* Pyonair extensions — lazy-loaded, only present in Pyonair's local build */}
        {PYONAIR_ROUTES.map(r => {
          const Panel = lazy(r.component)
          return <Route key={r.path} path={r.path} element={<Suspense fallback={null}><Panel /></Suspense>} />
        })}
      </Route>
    </Routes>
  )
}

/** Inner app — has access to useNavigate (inside HashRouter) */
function AppInner() {
  const navigate = useNavigate()
  // null = still checking, true = needs auth, false = already authed
  const [needsClaudeAuth, setNeedsClaudeAuth] = useState<boolean | null>(null)

  useEffect(() => {
    apiGet<{ authenticated: boolean }>('/api/auth/status')
      .then(s => setNeedsClaudeAuth(!s.authenticated))
      .catch(() => setNeedsClaudeAuth(false)) // If check fails, don't block portal
  }, [])

  const handleAuthComplete = useCallback(() => {
    // Parent unmounts ClaudeAuthFlow — overlay gone instantly
    setNeedsClaudeAuth(false)
    // Navigate to terminal so human watches evolution
    navigate('/terminal')
  }, [navigate])

  return (
    <>
      {needsClaudeAuth && <ClaudeAuthFlow onComplete={handleAuthComplete} />}
      <AuthenticatedApp />
    </>
  )
}

export default function App() {
  const loadFromStorage = useSettingsStore(s => s.loadFromStorage)

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  return (
    <HashRouter>
      <Routes>
        {/* Triad page is public — no auth required */}
        <Route path="/triad" element={<TriadView />} />
        {/* Everything else requires auth */}
        <Route path="*" element={
          <AuthGuard>
            <AppInner />
          </AuthGuard>
        } />
      </Routes>
    </HashRouter>
  )
}
