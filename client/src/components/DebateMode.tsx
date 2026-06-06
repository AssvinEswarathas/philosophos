import { Fragment, useEffect, useRef, useState } from 'react'
import Sidebar from './Sidebar'
import type { Conversation } from './Sidebar'
import ArgumentGraph from './ArgumentGraph'
import type { GraphNode, GraphEdge } from './ArgumentGraph'
import { useSettings } from '../contexts/SettingsContext'
import './DebateMode.css'

const COLORS: Record<string, string> = {
  nietzsche: '#f97316',
  kant:      '#3b82f6',
  sartre:    '#8b5cf6',
  camus:     '#10b981',
  aurelius:  '#f59e0b',
}

const LABELS: Record<string, string> = {
  nietzsche: 'Nietzsche', kant: 'Kant', sartre: 'Sartre', camus: 'Camus', aurelius: 'Aurelius',
}

const INITIALS: Record<string, string> = {
  nietzsche: 'N', kant: 'K', sartre: 'S', camus: 'C', aurelius: 'A',
}

interface DebateTurn {
  id: string
  philosopher: string
  stage: string
  role: 'proposition' | 'opposition'
  content: string
  done: boolean
}

interface Props {
  onBack: () => void
  onChat: () => void
}

export default function DebateMode({ onBack, onChat }: Props) {
  const { settings } = useSettings()
  const [step, setStep] = useState<'setup' | 'debating' | 'done'>('setup')
  const [topic, setTopic] = useState('')
  const [proposition, setProposition] = useState<string>('')
  const [opposition, setOpposition] = useState<string>('')
  const [turns, setTurns] = useState<DebateTurn[]>([])
  const [currentStage, setCurrentStage] = useState('')
  const [activePhilosopher, setActivePhilosopher] = useState('')
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([])
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([])
  const [activeView, setActiveView] = useState<'transcript' | 'graph'>('transcript')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [debateTitle, setDebateTitle] = useState('Debate Mode')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const ws = useRef<WebSocket | null>(null)
  const activeId = useRef<string>('')
  const firstToken = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef('')
  const roleRef = useRef('')

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:4000')
    return () => ws.current?.close()
  }, [])

  useEffect(() => {
    if (settings.autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns])

  useEffect(() => {
    if (step === 'debating' && topic) setDebateTitle(`"${topic}"`)
    if (step === 'setup') setDebateTitle('Debate Mode')
  }, [step, topic])

  const startTitleEdit = () => {
    setTitleDraft(debateTitle)
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.select(), 0)
  }

  const confirmTitleEdit = () => {
    if (titleDraft.trim()) setDebateTitle(titleDraft.trim())
    setEditingTitle(false)
  }

  const resetDebate = () => {
    setStep('setup')
    setTurns([])
    setGraphNodes([])
    setGraphEdges([])
    setActiveView('transcript')
  }

  const startDebate = () => {
    if (!topic.trim() || !proposition || !opposition || proposition === opposition) return
    setStep('debating')
    setTurns([])
    setGraphNodes([])
    setGraphEdges([])

    ws.current!.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === 'debate_stage') {
        stageRef.current = msg.stage
        roleRef.current = msg.role
        setCurrentStage(msg.stage)
        setActivePhilosopher(msg.philosopher)
        firstToken.current = false
      }

      if (msg.type === 'turn_start') {
        activeId.current = `${msg.philosopher}-${Date.now()}`
        firstToken.current = false
      }

      if (msg.type === 'token') {
        if (!firstToken.current) {
          firstToken.current = true
          const newTurn: DebateTurn = {
            id: activeId.current,
            philosopher: msg.philosopher,
            stage: stageRef.current,
            role: roleRef.current as 'proposition' | 'opposition',
            content: msg.delta,
            done: false,
          }
          setTurns(prev => [...prev, newTurn])
        } else {
          setTurns(prev => prev.map(t =>
            t.id === activeId.current ? { ...t, content: t.content + msg.delta } : t
          ))
        }
      }

      if (msg.type === 'turn_end') {
        setTurns(prev => prev.map(t =>
          t.id === activeId.current ? { ...t, done: true } : t
        ))
        setActivePhilosopher('')
      }

      if (msg.type === 'graph_update') {
        setGraphNodes(msg.nodes ?? [])
        setGraphEdges(msg.edges ?? [])
      }

      if (msg.type === 'debate_end') {
        setStep('done')
        setActivePhilosopher('')
      }
    }

    ws.current!.send(JSON.stringify({ type: 'start_debate', topic, proposition, opposition, responseLength: settings.responseLength }))
  }

  const philosophers = Object.keys(LABELS)
  const dummyConvs: Conversation[] = []

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <Sidebar
          conversations={dummyConvs}
          activeId=""
          activeMode="debate"
          onSelect={() => {}}
          onNew={() => {}}
          onRename={() => {}}
          onDelete={() => {}}
          onBack={onBack}
          onDebate={() => {}}
          onChat={onChat}
          activePhilosophers={Object.keys(LABELS)}
          onTogglePhilosopher={() => {}}
        />
      )}

      <div className="debate-main">
        <div className="chat-topbar">
          <button className="toggle-sidebar" onClick={() => setSidebarOpen(p => !p)}>☰</button>
          {editingTitle ? (
            <input
              ref={titleInputRef}
              className="topbar-title-input"
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={confirmTitleEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmTitleEdit()
                if (e.key === 'Escape') setEditingTitle(false)
              }}
            />
          ) : (
            <div className="chat-topbar-title editable" onClick={startTitleEdit} title="Click to rename">
              {debateTitle}
              <span className="topbar-edit-hint">✎</span>
            </div>
          )}
        </div>

        {step === 'setup' && (
          <div className="debate-setup">
            <div className="debate-setup-card">
              <div className="debate-setup-label">DEBATE MODE</div>
              <h2 className="debate-setup-title">Set up your debate</h2>
              <p className="debate-setup-sub">Pick two philosophers and a topic. Watch them argue it out in a structured formal debate.</p>

              <div className="debate-setup-divider" />

              <div className="debate-field">
                <label>Debate topic</label>
                <input
                  type="text"
                  placeholder="e.g. Is suffering necessary for greatness?"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startDebate()}
                />
              </div>

              <div className="debate-roles">
                <div className="debate-role">
                  <label>
                    <span className="role-badge proposition">Proposition</span>
                    Argues FOR the topic
                  </label>
                  <div className="philosopher-picker">
                    {philosophers.map(p => (
                      <div
                        key={p}
                        className={`picker-card ${proposition === p ? 'selected' : ''} ${opposition === p ? 'disabled' : ''}`}
                        onClick={() => opposition !== p && setProposition(p)}
                        style={{ borderColor: proposition === p ? COLORS[p] : 'transparent', background: proposition === p ? COLORS[p] + '15' : '#f9f9f9' }}
                      >
                        <div className="picker-avatar" style={{ background: COLORS[p] + '25', color: COLORS[p] }}>{INITIALS[p]}</div>
                        <span className="picker-name" style={{ color: proposition === p ? COLORS[p] : '#333' }}>{LABELS[p]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="debate-vs">VS</div>

                <div className="debate-role">
                  <label>
                    <span className="role-badge opposition">Opposition</span>
                    Argues AGAINST the topic
                  </label>
                  <div className="philosopher-picker">
                    {philosophers.map(p => (
                      <div
                        key={p}
                        className={`picker-card ${opposition === p ? 'selected' : ''} ${proposition === p ? 'disabled' : ''}`}
                        onClick={() => proposition !== p && setOpposition(p)}
                        style={{ borderColor: opposition === p ? COLORS[p] : 'transparent', background: opposition === p ? COLORS[p] + '15' : '#f9f9f9' }}
                      >
                        <div className="picker-avatar" style={{ background: COLORS[p] + '25', color: COLORS[p] }}>{INITIALS[p]}</div>
                        <span className="picker-name" style={{ color: opposition === p ? COLORS[p] : '#333' }}>{LABELS[p]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                className="debate-start-btn"
                onClick={startDebate}
                disabled={!topic.trim() || !proposition || !opposition || proposition === opposition}
              >
                Start Debate
              </button>
            </div>
          </div>
        )}

        {(step === 'debating' || step === 'done') && (
          <div className="debate-arena">
            <div className="debate-header">
              <button className="new-debate-btn" onClick={resetDebate}>
                ← New debate
              </button>

              <div className="debate-header-center">
                <div className="debate-header-topic">"{topic}"</div>
                <div className="debate-header-matchup">
                  <span style={{ color: COLORS[proposition] }}>
                    <span className="matchup-initial" style={{ background: COLORS[proposition] + '22', color: COLORS[proposition] }}>{INITIALS[proposition]}</span>
                    {LABELS[proposition]}
                  </span>
                  <span className="vs-text">VS</span>
                  <span style={{ color: COLORS[opposition] }}>
                    <span className="matchup-initial" style={{ background: COLORS[opposition] + '22', color: COLORS[opposition] }}>{INITIALS[opposition]}</span>
                    {LABELS[opposition]}
                  </span>
                </div>
              </div>

              <div className="debate-header-right">
                <div className="debate-view-toggle">
                  <button
                    className={`view-toggle-btn${activeView === 'transcript' ? ' active' : ''}`}
                    onClick={() => setActiveView('transcript')}
                  >
                    Transcript
                  </button>
                  <button
                    className={`view-toggle-btn${activeView === 'graph' ? ' active' : ''}`}
                    onClick={() => setActiveView('graph')}
                  >
                    Argument Graph
                    {graphNodes.length > 0 && (
                      <span className="graph-pill">{graphNodes.length}</span>
                    )}
                  </button>
                </div>

                {step === 'debating' && activePhilosopher && (
                  <span className="speaking-pill" style={{ color: COLORS[activePhilosopher], background: COLORS[activePhilosopher] + '18' }}>
                    <span className="speaking-dot" style={{ background: COLORS[activePhilosopher] }} />
                    {LABELS[activePhilosopher]}
                  </span>
                )}
                {step === 'done' && <span className="done-pill">Complete</span>}
              </div>
            </div>

            {activeView === 'transcript' && (
              <div className="debate-feed">
                {turns.map((turn, i) => {
                  const prevTurn = turns[i - 1]
                  const isNewStage = !prevTurn || prevTurn.stage !== turn.stage
                  const isStreaming = !turn.done
                  return (
                    <Fragment key={turn.id}>
                      {isNewStage && (
                        <div className="stage-banner">
                          <div className="stage-banner-line" />
                          <div className="stage-banner-label">{turn.stage}</div>
                          <div className="stage-banner-line" />
                        </div>
                      )}
                      <div
                        className={`debate-card${isStreaming ? ' debate-card-streaming' : ''}`}
                        style={{
                          borderLeftColor: COLORS[turn.philosopher],
                          ...(isStreaming && { boxShadow: `0 2px 20px ${COLORS[turn.philosopher]}22` }),
                        }}
                      >
                        <div className="debate-card-header">
                          <div className="debate-card-avatar" style={{ background: COLORS[turn.philosopher] + '20', color: COLORS[turn.philosopher] }}>
                            {INITIALS[turn.philosopher]}
                          </div>
                          <span className="debate-card-name" style={{ color: COLORS[turn.philosopher] }}>{LABELS[turn.philosopher]}</span>
                          <span className={`debate-card-role role-${turn.role}`}>
                            {turn.role === 'proposition' ? 'Proposition' : 'Opposition'}
                          </span>
                        </div>
                        <div className="debate-card-body">
                          {turn.content}
                          {isStreaming && <span className="cursor">|</span>}
                        </div>
                      </div>
                    </Fragment>
                  )
                })}

                {activePhilosopher && !turns.some(t => t.philosopher === activePhilosopher && !t.done) && (
                  <Fragment>
                    {currentStage !== turns[turns.length - 1]?.stage && (
                      <div className="stage-banner">
                        <div className="stage-banner-line" />
                        <div className="stage-banner-label">{currentStage}</div>
                        <div className="stage-banner-line" />
                      </div>
                    )}
                    <div className="debate-card debate-card-waiting" style={{ borderLeftColor: COLORS[activePhilosopher] }}>
                      <div className="debate-card-header">
                        <div className="debate-card-avatar" style={{ background: COLORS[activePhilosopher] + '20', color: COLORS[activePhilosopher] }}>
                          {INITIALS[activePhilosopher]}
                        </div>
                        <span className="debate-card-name" style={{ color: COLORS[activePhilosopher] }}>{LABELS[activePhilosopher]}</span>
                      </div>
                      <div className="typing-indicator"><span /><span /><span /></div>
                    </div>
                  </Fragment>
                )}

                {step === 'done' && turns.length > 0 && (
                  <div className="debate-end-banner">The debate has concluded</div>
                )}

                <div ref={bottomRef} />
              </div>
            )}

            {activeView === 'graph' && (
              <ArgumentGraph nodes={graphNodes} edges={graphEdges} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
