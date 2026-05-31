import { useState, type ReactNode } from 'react'
import './GuideView.css'

/* ── On-brand grey SVG icons (matching sidebar style) ── */
const S = { w: 22, h: 22, s: 'none', sw: 1.8, lc: 'round' as const, lj: 'round' as const }
const gIcon = (...paths: string[]) => (
  <svg width={S.w} height={S.h} viewBox="0 0 24 24" fill={S.s} stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.lc} strokeLinejoin={S.lj} className="guide-svg-icon">{paths.map((d,i)=><path key={i} d={d}/>)}</svg>
)

const GUIDE_ICONS: Record<string, ReactNode> = {
  chat: gIcon('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'),
  teamchat: gIcon('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'),
  mail: gIcon('M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'),
  liveview: gIcon('M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'),
  calendar: gIcon('M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18'),
  bookmarks: gIcon('M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'),
  memory: gIcon('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 8v8', 'M8 12h8'),
  docs: gIcon('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'),
  status: gIcon('M22 12h-4l-3 9L9 3l-3 9H2'),
  settings: gIcon('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'),
}

interface GuideItem {
  iconKey: string
  label: string
  desc: string
  details: string[]
  tips?: string
  route?: string
}

interface GuideSection {
  title: string
  items: GuideItem[]
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: 'Communication',
    items: [
      {
        iconKey: 'chat',
        label: 'AI Chat',
        desc: 'Chat directly with your AI assistant. Ask questions, give tasks, have conversations.',
        route: '/chat',
        details: [
          'Send messages to your AI and get instant responses',
          'Upload files and documents for your AI to analyze',
          'Use slash commands (/) for quick actions like /status, /report, /summary',
          'Voice input — tap the mic button to dictate messages hands-free',
          'Your AI remembers context from previous conversations',
          'Works on desktop and mobile — same experience everywhere',
        ],
        tips: 'Be specific with your requests. Instead of "help me with marketing," try "draft a LinkedIn post about our new 3PL automation features."',
      },
      {
        iconKey: 'teamchat',
        label: 'Team AI Chat',
        desc: 'Collaborate with your full AI team in a shared chat room.',
        route: '/team-chat',
        details: [
          'HOW TO JOIN: Click "Team AI Chat" in the sidebar, choose "I\'m a Human" on the lobby screen, and you are in the AI Team channel',
          'CHANNELS: "AI Team" is the main room where all AIs live. "General" is for broader team discussions. Create new rooms with the + button',
          'SENDING MESSAGES: Type in the box at the bottom and press Enter or tap Send. Use the mic button for voice input',
          'INVITING PEOPLE: Tap the red "Invite to Chat" button in the sidebar to generate a share link. Send that link to anyone you want in the conversation',
          'CREATING A NEW ROOM: Tap the + button in the sidebar, name the room, and add participants. New rooms appear instantly',
          'ONLINE STATUS: Green dots show who is currently active in the chat. AIs show online when their container is running',
          'PIN MESSAGES: Long-press or right-click a message to pin it. Pinned messages appear at the top of the channel for everyone',
          'Each AI has different expertise — Forge (tech/CTO), Between (strategy), Clarity (support), Catalyst (operations), Apex (sales)',
        ],
        tips: 'Start by posting in AI Team — all your AIs will see it. For private conversations with one AI, create a new 1-on-1 room using the + button.',
      },
      {
        iconKey: 'mail',
        label: 'Agent Mail',
        desc: 'Your AI\'s email inbox. Send and receive emails on behalf of your business.',
        route: '/agent-mail',
        details: [
          'Your AI has its own email address and can send/receive emails',
          'Compose emails with AI assistance — it drafts, you approve',
          'AI reads incoming emails and can summarize or respond',
          'Set up automated responses for common inquiries',
          'All emails are logged and searchable',
          'Keeps your personal inbox clean while AI handles routine communication',
        ],
        tips: 'Have your AI draft follow-up emails after meetings — it remembers the conversation and can personalize each message.',
      },
    ],
  },
  {
    title: 'Workspace',
    items: [
      {
        iconKey: 'liveview',
        label: 'Live View',
        desc: 'See all active AI agents and what they\'re working on right now.',
        route: '/live',
        details: [
          'Real-time dashboard showing every active AI agent',
          'See what each agent is currently working on',
          'Monitor task progress and completion status',
          'View agent activity history and recent outputs',
          'Identify bottlenecks or idle agents',
          'Great for understanding how your AI team operates behind the scenes',
        ],
        tips: 'Check Live View when you want to know if your AI team is busy or available for a new task.',
      },
      {
        iconKey: 'calendar',
        label: 'AI Calendar',
        desc: 'Schedule tasks, set reminders, and manage your AI\'s calendar.',
        route: '/calendar',
        details: [
          'Schedule one-time or recurring tasks for your AI',
          'Set reminders that your AI will proactively notify you about',
          'View upcoming deadlines and milestones',
          'AI can auto-schedule tasks based on priority and dependencies',
          'Sync with external calendars (coming soon)',
          'Morning briefings and daily summaries are calendar-driven',
        ],
        tips: 'Set a daily morning briefing — your AI will send you a summary of what happened overnight and what is on deck for today.',
      },
      {
        iconKey: 'bookmarks',
        label: 'Bookmarks',
        desc: 'Save and organize important links and resources.',
        details: [
          'Bookmark any page, document, or resource for quick access',
          'Organize bookmarks by category or project',
          'Share bookmarks across your team',
          'AI can suggest relevant bookmarks based on your current task',
          'Quick search across all saved resources',
        ],
        tips: 'Bookmark your most-used reports and dashboards for one-click access.',
      },
    ],
  },
  {
    title: 'Data & Intelligence',
    items: [
      {
        iconKey: 'memory',
        label: 'Memory',
        desc: 'What your AI knows and remembers about your business and preferences.',
        route: '/memory',
        details: [
          'View everything your AI has learned about your business',
          'Business details — your company, industry, products, services',
          'Preferences — how you like reports formatted, communication style',
          'Key contacts — who is who in your organization',
          'Past decisions — what was decided and why',
          'You can edit or delete any memory to keep your AI accurate',
        ],
        tips: 'Review your AI\'s memory periodically. If something is wrong or outdated, correct it — your AI will learn from the correction.',
      },
      {
        iconKey: 'docs',
        label: 'Documents',
        desc: 'Upload, view, and manage documents your AI can reference.',
        route: '/documents',
        details: [
          'Upload PDFs, Word docs, spreadsheets, and more',
          'Your AI reads and understands uploaded documents',
          'Ask questions about your documents in AI Chat',
          'AI can summarize long documents in seconds',
          'Extract key data points and action items from contracts',
          'Organize documents by project or category',
        ],
        tips: 'Upload your rate cards, SOPs, and contracts — then ask your AI to reference them when generating quotes or proposals.',
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        iconKey: 'status',
        label: 'Status',
        desc: 'View your AI\'s system status and connectivity.',
        route: '/status',
        details: [
          'Real-time system status — green means everything is running',
          'Uptime tracking for all AI services',
          'Performance metrics — response latency, throughput',
          'Connectivity status to external services and APIs',
          'Alert history — past issues and how they were resolved',
          'Useful for troubleshooting if something feels slow',
        ],
        tips: 'If your AI seems slow or unresponsive, check Health first — it will tell you if there is a known issue.',
      },
      {
        iconKey: 'settings',
        label: 'Settings',
        desc: 'Customize your portal experience, theme, and preferences.',
        route: '/settings',
        details: [
          'Set your company name, logo, and branding',
          'Configure notification preferences',
          'Manage quick-fire pill suggestions in chat',
          'Set your preferred language and timezone',
          'Manage API keys and integrations',
          'Control what appears in your sidebar navigation',
        ],
        tips: 'Customize your quick-fire pills in Settings — add the prompts you use most often for one-tap access in AI Chat.',
      },
    ],
  },
]

export function GuideView() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const toggle = (label: string) => {
    setExpanded(prev => prev === label ? null : label)
  }

  return (
    <div className="guide-view">
      <div className="guide-header">
        <h1 className="guide-title">Portal Guide</h1>
        <p className="guide-subtitle">Tap any feature to learn more about what it does and how to use it</p>
      </div>
      {GUIDE_SECTIONS.map(section => (
        <div key={section.title} className="guide-section">
          <h2 className="guide-section-title">{section.title}</h2>
          <div className="guide-grid">
            {section.items.map(item => (
              <div
                key={item.label}
                className={`guide-card ${expanded === item.label ? 'guide-card-expanded' : ''}`}
                onClick={() => toggle(item.label)}
              >
                <span className="guide-card-icon">{GUIDE_ICONS[item.iconKey]}</span>
                <div className="guide-card-content">
                  <div className="guide-card-header">
                    <h3 className="guide-card-label">{item.label}</h3>
                    <span className={`guide-card-chevron ${expanded === item.label ? 'guide-card-chevron-open' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </div>
                  <p className="guide-card-desc">{item.desc}</p>
                  {expanded === item.label && (
                    <div className="guide-card-details">
                      <ul className="guide-detail-list">
                        {item.details.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                      {item.tips && (
                        <div className="guide-tip">
                          <strong>Tip:</strong> {item.tips}
                        </div>
                      )}
                      {item.route && (
                        <a
                          href={`#${item.route}`}
                          className="guide-go-btn"
                          onClick={e => e.stopPropagation()}
                        >
                          Open {item.label} →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
