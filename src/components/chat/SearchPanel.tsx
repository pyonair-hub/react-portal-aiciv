import { useState, useRef, useEffect } from 'react'
import './SearchPanel.css'

interface SearchPanelProps {
  onSearch: (query: string) => void
  matchCount: number
  onClose: () => void
}

export function SearchPanel({ onSearch, matchCount, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearch(value)
    }, 200)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="search-panel">
      <div className="search-input-wrap">
        <span className="search-icon" aria-hidden="true">
          {/* On-brand SVG magnifier (matches the header toggle in ChatView). Was the
              off-brand 🔍 emoji glyph, which rendered a different style/color per-OS.
              Inherits currentColor so CSS controls the brand color. */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages..."
        />
        {query && (
          <span className="search-count">
            {matchCount} match{matchCount !== 1 ? 'es' : ''}
          </span>
        )}
      </div>
      <button className="search-close" onClick={onClose}>&times;</button>
    </div>
  )
}
