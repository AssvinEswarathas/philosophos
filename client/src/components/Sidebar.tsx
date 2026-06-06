import { useState } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import './Sidebar.css'

const COLORS: Record<string, string> = {
  nietzsche: '#f97316',
  kant:      '#3b82f6',
  sartre:    '#8b5cf6',
  camus:     '#10b981',
  aurelius:  '#f59e0b',
}

const INITIALS: Record<string, string> = {
  nietzsche: 'N', kant: 'K', sartre: 'S', camus: 'C', aurelius: 'A',
}

const LABELS: Record<string, string> = {
  nietzsche: 'Nietzsche', kant: 'Kant', sartre: 'Sartre', camus: 'Camus', aurelius: 'Aurelius',
}

export interface Conversation {
  id: string
  title: string
}

interface Props {
  conversations: Conversation[]
  activeId: string
  activeMode: 'chat' | 'debate'
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onBack: () => void
  onDebate: () => void
  onChat: () => void
  activePhilosophers: string[]
  onTogglePhilosopher: (key: string) => void
}

export default function Sidebar({
  conversations, activeId, activeMode, onSelect, onNew, onRename, onDelete,
  onBack, onDebate, onChat, activePhilosophers, onTogglePhilosopher
}: Props) {
  const { openSettings } = useSettings()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showPhilosophers, setShowPhilosophers] = useState(true)

  const startEdit = (conv: Conversation) => {
    setEditingId(conv.id)
    setEditingTitle(conv.title)
  }

  const confirmEdit = () => {
    if (editingId && editingTitle.trim()) onRename(editingId, editingTitle.trim())
    setEditingId(null)
  }

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-logo">PhilosophOS</div>
        <button className="new-chat-btn" onClick={onNew}>+ New chat</button>
      </div>

      <div className="sidebar-modes">
        <div className={`mode-item ${activeMode === 'chat' ? 'mode-active' : ''}`} onClick={onChat}>
          Group Chat
        </div>
        <div className={`mode-item ${activeMode === 'debate' ? 'mode-active' : ''}`} onClick={onDebate}>
          Debate Mode
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header" onClick={() => setShowPhilosophers(p => !p)}>
          <span className="sidebar-section-label">Philosophers</span>
          <span className="sidebar-chevron" style={{ display: 'inline-block', transform: showPhilosophers ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          </span>
        </div>
        {showPhilosophers && (
          <div className="philosopher-filters">
            {Object.keys(LABELS).map(key => (
              <div
                key={key}
                className={`philosopher-filter ${activePhilosophers.includes(key) ? 'active' : ''}`}
                onClick={() => onTogglePhilosopher(key)}
                style={{
                  borderColor: activePhilosophers.includes(key) ? COLORS[key] : 'transparent',
                  background: activePhilosophers.includes(key) ? COLORS[key] + '15' : '#f5f5f5',
                }}
              >
                <div className="philosopher-filter-avatar" style={{ background: COLORS[key] + '25', color: COLORS[key] }}>
                  {INITIALS[key]}
                </div>
                <span className="philosopher-filter-name" style={{ color: activePhilosophers.includes(key) ? COLORS[key] : '#555' }}>
                  {LABELS[key]}
                </span>
                {activePhilosophers.includes(key) && (
                  <span className="philosopher-filter-check" style={{ color: COLORS[key] }}>✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-section sidebar-convs-section">
        <div className="sidebar-section-header">
          <span className="sidebar-section-label">Recent</span>
        </div>
        <div className="sidebar-convs">
          {conversations.length === 0 && (
            <div className="sidebar-empty">No conversations yet</div>
          )}
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`sidebar-conv ${conv.id === activeId ? 'active' : ''}`}
              onClick={() => onSelect(conv.id)}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {editingId === conv.id ? (
                <input
                  className="sidebar-rename-input"
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  onBlur={confirmEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmEdit()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="sidebar-conv-title">{conv.title}</span>
              )}
              {hoveredId === conv.id && editingId !== conv.id && (
                <div className="sidebar-conv-actions">
                  <button className="conv-action-btn" title="Rename" onClick={e => { e.stopPropagation(); startEdit(conv) }}>✎</button>
                  <button className="conv-action-btn delete" title="Delete" onClick={e => { e.stopPropagation(); onDelete(conv.id) }}>✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-item" onClick={onBack}>Back to home</div>
        <div className="sidebar-item" onClick={openSettings}>Settings</div>
        <div className="sidebar-profile">
          <div className="sidebar-profile-avatar">AE</div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">Assvin</div>
            <div className="sidebar-profile-plan">Free plan</div>
          </div>
        </div>
      </div>
    </div>
  )
}
