import { useEffect, useRef, useState } from 'react'
import './GroupChat.css'

const COLORS: Record<string, string> = {
  nietzsche: '#f97316',
  kant:      '#3b82f6',
  sartre:    '#8b5cf6',
  camus:     '#10b981',
  aurelius:  '#f59e0b',
}

const LABELS: Record<string, string> = {
  nietzsche: 'Nietzsche',
  kant:      'Kant',
  sartre:    'Sartre',
  camus:     'Camus',
  aurelius:  'Aurelius',
}

const INITIALS: Record<string, string> = {
  nietzsche: 'N',
  kant:      'K',
  sartre:    'S',
  camus:     'C',
  aurelius:  'A',
}

const SUGGESTED_TOPICS = [
  'Is free will real?',
  'What gives life meaning?',
  'Should I follow my passion or be practical?',
  'Is suffering necessary for greatness?',
  'How should I deal with failure?',
  'Does morality exist without God?',
  'What does it mean to live a good life?',
  'Is happiness the goal of life?',
]

interface ChatMessage {
  id: string
  type: 'user' | 'philosopher'
  philosopher?: string
  content: string
  done: boolean
}

interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
}

interface Props {
  initialMessage?: string
  onBack: () => void
}

export default function GroupChat({ initialMessage, onBack }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [responding, setResponding] = useState(false)
  const [typingPhilosophers, setTypingPhilosophers] = useState<string[]>([])
  const [showMention, setShowMention] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const ws = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeMessages = useRef<Record<string, string>>({})
  const initialSent = useRef(false)
  const currentConvId = useRef<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const createNewChat = () => {
    const id = `conv-${Date.now()}`
    const newConv: Conversation = { id, title: 'New conversation', messages: [] }
    setConversations(prev => [newConv, ...prev])
    setActiveId(id)
    currentConvId.current = id
    setMessages([])
  }

  const switchConversation = (conv: Conversation) => {
    setActiveId(conv.id)
    currentConvId.current = conv.id
    setMessages(conv.messages)
  }

  useEffect(() => {
    const id = `conv-${Date.now()}`
    currentConvId.current = id
    setActiveId(id)
    const initial: Conversation = {
      id,
      title: initialMessage || 'New conversation',
      messages: []
    }
    setConversations([initial])

    ws.current = new WebSocket('ws://localhost:4000')

    ws.current.onopen = () => {
      if (initialMessage && !initialSent.current) {
        initialSent.current = true
        setTimeout(() => sendMessage(initialMessage), 300)
      }
    }

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === 'response_start') {
        setResponding(true)
        activeMessages.current = {}
      }

      if (msg.type === 'turn_start') {
        const id = `${msg.philosopher}-${Date.now()}`
        activeMessages.current[msg.philosopher] = id
        setTypingPhilosophers(prev => [...prev, msg.philosopher])
        const newMsg: ChatMessage = {
          id, type: 'philosopher', philosopher: msg.philosopher, content: '', done: false,
        }
        setMessages(prev => [...prev, newMsg])
        setConversations(prev => prev.map(c =>
          c.id === currentConvId.current ? { ...c, messages: [...c.messages, newMsg] } : c
        ))
      }

      if (msg.type === 'token') {
        const id = activeMessages.current[msg.philosopher]
        setTypingPhilosophers(prev => prev.filter(p => p !== msg.philosopher))
        setMessages(prev => prev.map(m =>
          m.id === id ? { ...m, content: m.content + msg.delta } : m
        ))
      }

      if (msg.type === 'turn_end') {
        const id = activeMessages.current[msg.philosopher]
        setTypingPhilosophers(prev => prev.filter(p => p !== msg.philosopher))
        setMessages(prev => prev.map(m =>
          m.id === id ? { ...m, done: true } : m
        ))
      }

      if (msg.type === 'response_end') {
        setResponding(false)
        setTypingPhilosophers([])
      }
    }

    return () => ws.current?.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingPhilosophers])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)
    const atIndex = val.lastIndexOf('@')
    if (atIndex !== -1) {
      const afterAt = val.slice(atIndex + 1).toLowerCase()
      if (!afterAt.includes(' ')) {
        setMentionFilter(afterAt)
        setShowMention(true)
        return
      }
    }
    setShowMention(false)
  }

  const insertMention = (name: string) => {
    const atIndex = input.lastIndexOf('@')
    const newInput = input.slice(0, atIndex) + `@${name} `
    setInput(newInput)
    setShowMention(false)
    inputRef.current?.focus()
  }

  const sendMessage = (text: string) => {
    if (!text.trim() || responding || ws.current?.readyState !== WebSocket.OPEN) return
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`, type: 'user', content: text, done: true,
    }
    setMessages(prev => [...prev, userMsg])
    setConversations(prev => prev.map(c =>
      c.id === currentConvId.current
        ? { ...c, title: c.title === 'New conversation' ? text.slice(0, 40) : c.title, messages: [...c.messages, userMsg] }
        : c
    ))
    ws.current!.send(JSON.stringify({ type: 'chat', text }))
  }

  const send = () => {
    const text = input.trim()
    if (!text) return
    sendMessage(text)
    setInput('')
    setShowMention(false)
  }

  const filteredPhilosophers = Object.keys(LABELS).filter(k =>
    k.startsWith(mentionFilter) || LABELS[k].toLowerCase().startsWith(mentionFilter)
  )

  const isEmpty = messages.length === 0

  return (
    <div className="app-shell">
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-top">
          <div className="sidebar-logo">PhilosophOS</div>
          <button className="new-chat-btn" onClick={createNewChat}>+ New chat</button>
        </div>
        <div className="sidebar-section-label">Recent</div>
        <div className="sidebar-convs">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`sidebar-conv ${conv.id === activeId ? 'active' : ''}`}
              onClick={() => switchConversation(conv)}
            >
              <span className="sidebar-conv-icon">💬</span>
              <span className="sidebar-conv-title">{conv.title}</span>
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-item" onClick={onBack}>← Back to home</div>
          <div className="sidebar-item">⚙ Settings</div>
          <div className="sidebar-philosophers">
            {Object.entries(LABELS).map(([key, name]) => (
              <span key={key} style={{ color: COLORS[key] }} onClick={() => { setInput(prev => prev + `@${key} `); inputRef.current?.focus() }}>
                @{name.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-topbar">
          <button className="toggle-sidebar" onClick={() => setSidebarOpen(p => !p)}>☰</button>
          <div className="chat-topbar-title">
            {conversations.find(c => c.id === activeId)?.title || 'New conversation'}
          </div>
        </div>

        <div className="chat-messages">
          {isEmpty && (
            <div className="empty-state">
              <div className="empty-title">What's on your mind?</div>
              <div className="empty-sub">Ask the philosophers anything, or pick a topic to get started.</div>
              <div className="topic-pills">
                {SUGGESTED_TOPICS.map(topic => (
                  <button key={topic} className="topic-pill" onClick={() => { sendMessage(topic) }}>
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`msg ${msg.type}`}>
              {msg.type === 'philosopher' && (
                <div className="msg-row">
                  <div
                    className="philosopher-avatar"
                    style={{ background: COLORS[msg.philosopher!] + '22', color: COLORS[msg.philosopher!] }}
                  >
                    {INITIALS[msg.philosopher!]}
                  </div>
                  <div className="msg-content">
                    <div className="msg-name" style={{ color: COLORS[msg.philosopher!] }}>
                      {LABELS[msg.philosopher!]}
                    </div>
                    <div className="msg-bubble philosopher-bubble">
                      {msg.content}
                      {!msg.done && <span className="cursor">▌</span>}
                    </div>
                  </div>
                </div>
              )}
              {msg.type === 'user' && (
                <div className="msg-bubble user-bubble">{msg.content}</div>
              )}
            </div>
          ))}

          {typingPhilosophers.map(p => (
            <div key={`typing-${p}`} className="msg philosopher">
              <div className="msg-row">
                <div
                  className="philosopher-avatar"
                  style={{ background: COLORS[p] + '22', color: COLORS[p] }}
                >
                  {INITIALS[p]}
                </div>
                <div className="msg-content">
                  <div className="msg-name" style={{ color: COLORS[p] }}>{LABELS[p]}</div>
                  <div className="typing-indicator">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        <div className="chat-input-area">
          {showMention && filteredPhilosophers.length > 0 && (
            <div className="mention-popup">
              {filteredPhilosophers.map(p => (
                <div key={p} className="mention-item" onClick={() => insertMention(p)}>
                  <div className="mention-avatar" style={{ background: COLORS[p] + '22', color: COLORS[p] }}>
                    {INITIALS[p]}
                  </div>
                  <div>
                    <div className="mention-name">{LABELS[p]}</div>
                    <div className="mention-handle">@{p}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              placeholder="Ask anything... or type @ to mention a philosopher"
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => {
                if (e.key === 'Enter' && !showMention) send()
                if (e.key === 'Escape') setShowMention(false)
              }}
              disabled={responding}
            />
            <button className="chat-send" onClick={send} disabled={responding}>Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}
