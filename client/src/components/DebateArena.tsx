import { useEffect, useRef, useState } from 'react'
import './DebateArena.css'

const PHILOSOPHER_COLORS: Record<string, string> = {
  nietzsche: '#e05c3a',
  kant:      '#4a90d9',
  sartre:    '#c084fc',
  camus:     '#34d399',
  aurelius:  '#fbbf24',
}

const PHILOSOPHER_LABELS: Record<string, string> = {
  nietzsche: 'Friedrich Nietzsche',
  kant:      'Immanuel Kant',
  sartre:    'Jean-Paul Sartre',
  camus:     'Albert Camus',
  aurelius:  'Marcus Aurelius',
}

interface Turn {
  philosopher: string
  content: string
  done: boolean
}

interface Props {
  topic: string
  onReset: () => void
}

export default function DebateArena({ topic, onReset }: Props) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [status, setStatus] = useState<'connecting' | 'debating' | 'done'>('connecting')
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)
  const ws = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:4000')

    ws.current.onopen = () => {
      setStatus('debating')
      ws.current?.send(JSON.stringify({ type: 'start_debate', topic, rounds: 1 }))
    }

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === 'turn_start') {
        setActiveSpeaker(msg.philosopher)
        setTurns(prev => [...prev, { philosopher: msg.philosopher, content: '', done: false }])
      }

      if (msg.type === 'token') {
        setTurns(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last && last.philosopher === msg.philosopher) {
            updated[updated.length - 1] = { ...last, content: last.content + msg.delta }
          }
          return updated
        })
      }

      if (msg.type === 'turn_end') {
        setTurns(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], done: true }
          return updated
        })
        setActiveSpeaker(null)
      }

      if (msg.type === 'debate_end') {
        setStatus('done')
      }
    }

    return () => ws.current?.close()
  }, [topic])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns])

  return (
    <div className="arena">
      <div className="arena-header">
        <button className="back-btn" onClick={onReset}>← New debate</button>
        <div className="arena-topic">"{topic}"</div>
        <div className="arena-status">
          {status === 'connecting' && 'Connecting...'}
          {status === 'debating' && activeSpeaker && `${PHILOSOPHER_LABELS[activeSpeaker]} is speaking...`}
          {status === 'done' && 'Debate complete'}
        </div>
      </div>

      <div className="turns">
        {turns.map((turn, i) => (
          <div key={i} className={`turn ${turn.done ? 'done' : 'active'}`}>
            <div
              className="turn-name"
              style={{ color: PHILOSOPHER_COLORS[turn.philosopher] }}
            >
              {PHILOSOPHER_LABELS[turn.philosopher]}
            </div>
            <div className="turn-content">
              {turn.content}
              {!turn.done && <span className="cursor">▌</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
