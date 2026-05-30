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

interface ChatMessage {
  id: string
  type: 'user' | 'philosopher'
  philosopher?: string
  content: string
  done: boolean
}

interface Props {
  initialMessage?: string
  onBack: () => void
}

export default function GroupChat({ initialMessage, onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'philosopher',
      philosopher: 'camus',
      content: "Welcome. Ask us anything — about life, meaning, suffering, choice. Or @mention one of us directly. We are Nietzsche, Kant, Sartre, Camus, and Aurelius. We've been waiting.",
      done: true,
    }
  ])
  const [input, setInput] = useState('')
  const [responding, setResponding] = useState(false)
  const ws = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeMessages = useRef<Record<string, string>>({})
  const initialSent = useRef(false)

  useEffect(() => {
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
        setMessages(prev => [...prev, {
          id,
          type: 'philosopher',
          philosopher: msg.philosopher,
          content: '',
          done: false,
        }])
      }

      if (msg.type === 'token') {
        const id = activeMessages.current[msg.philosopher]
        setMessages(prev => prev.map(m =>
          m.id === id ? { ...m, content: m.content + msg.delta } : m
        ))
      }

      if (msg.type === 'turn_end') {
        const id = activeMessages.current[msg.philosopher]
        setMessages(prev => prev.map(m =>
          m.id === id ? { ...m, done: true } : m
        ))
      }

      if (msg.type === 'response_end') {
        setResponding(false)
      }
    }

    return () => ws.current?.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (text: string) => {
    if (!text.trim() || responding || ws.current?.readyState !== WebSocket.OPEN) return

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text,
      done: true,
    }])

    ws.current!.send(JSON.stringify({ type: 'chat', text }))
  }

  const send = () => {
    const text = input.trim()
    if (!text) return
    sendMessage(text)
    setInput('')
  }

  return (
    <div className="chat">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="chat-title">PhilosophOS</div>
        <div className="chat-members">
          {Object.entries(LABELS).map(([key, name]) => (
            <span key={key} style={{ color: COLORS[key] }}>@{name.toLowerCase()}</span>
          ))}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`msg ${msg.type}`}>
            {msg.type === 'philosopher' && (
              <div className="msg-name" style={{ color: COLORS[msg.philosopher!] }}>
                {LABELS[msg.philosopher!]}
              </div>
            )}
            <div className="msg-bubble">
              {msg.content}
              {!msg.done && <span className="cursor">▌</span>}
            </div>
          </div>
        ))}
        {responding && (
          <div className="typing">philosophers are thinking...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          type="text"
          placeholder="Ask anything... or @nietzsche @kant @sartre @camus @aurelius"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={responding}
        />
        <button className="chat-send" onClick={send} disabled={responding}>Send</button>
      </div>
    </div>
  )
}
