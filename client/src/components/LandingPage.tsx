import { useState } from 'react'
import './LandingPage.css'

interface Props {
  onEnter: (message?: string) => void
}

const PHILOSOPHERS = [
  { key: 'nietzsche', name: 'Nietzsche', years: '1844–1900', color: '#f97316', bg: '#fff7ed', idea: 'Will to power' },
  { key: 'kant',      name: 'Kant',      years: '1724–1804', color: '#3b82f6', bg: '#eff6ff', idea: 'Moral duty' },
  { key: 'sartre',    name: 'Sartre',    years: '1905–1980', color: '#8b5cf6', bg: '#f5f3ff', idea: 'Radical freedom' },
  { key: 'camus',     name: 'Camus',     years: '1913–1960', color: '#10b981', bg: '#f0fdf4', idea: 'The absurd' },
  { key: 'aurelius',  name: 'Aurelius',  years: '121–180 AD', color: '#f59e0b', bg: '#fffbeb', idea: 'Stoic virtue' },
]

export default function LandingPage({ onEnter }: Props) {
  const [input, setInput] = useState('')

  const handleStart = () => {
    onEnter(input.trim() || undefined)
  }

  return (
    <div className="landing">
      <nav className="nav">
        <div className="nav-logo">PhilosophOS</div>
        <div className="nav-links">
          <span>Thinkers</span>
          <span>Topics</span>
          <span>About</span>
        </div>
        <button className="nav-cta" onClick={() => onEnter()}>Enter the chat →</button>
      </nav>

      <div className="hero">
        <div className="hero-left">
          <div className="badge">✦ 5 great minds. 1 chat.</div>
          <h1 className="hero-h1">
            Think deeper.<br />
            <span className="hero-accent">With history's</span><br />
            greatest minds.
          </h1>
          <p className="hero-sub">
            Ask Nietzsche, Kant, Sartre, Camus, and Aurelius anything.
            Challenge your thinking. Gain new perspectives on life.
          </p>
          <div className="hero-input-row">
            <input
              type="text"
              placeholder="Ask anything, or start a debate..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
            />
            <button onClick={handleStart}>Start →</button>
          </div>
          <p className="hero-hint">
            Try: <span onClick={() => { setInput('@nietzsche what should I do with my life?') }}>@nietzsche what should I do with my life?</span>
          </p>
        </div>

        <div className="hero-right">
          <div className="blob" />
          <div className="mockup">
            <div className="mockup-header">
              <span className="mockup-title">PhilosophOS</span>
              <div className="mockup-tags">
                <span style={{ color: '#f97316' }}>@nietzsche</span>
                <span style={{ color: '#8b5cf6' }}>@sartre</span>
              </div>
            </div>
            <div className="mockup-messages">
              <div className="mock-msg user">
                <div className="mock-bubble user">Is suffering necessary for greatness?</div>
              </div>
              <div className="mock-msg phil">
                <div className="mock-name" style={{ color: '#f97316' }}>Nietzsche</div>
                <div className="mock-bubble phil">Suffering is the anvil on which greatness is forged. Without it, you remain soft clay — never a statue.</div>
              </div>
              <div className="mock-msg phil">
                <div className="mock-name" style={{ color: '#8b5cf6' }}>Sartre</div>
                <div className="mock-bubble phil">Asking if it's "necessary" is bad faith. You already know the answer — you're just looking for permission.</div>
              </div>
              <div className="mock-msg user">
                <div className="mock-bubble user">@nietzsche but what if the suffering breaks you?</div>
              </div>
              <div className="mock-msg phil">
                <div className="mock-name" style={{ color: '#f97316' }}>Nietzsche</div>
                <div className="mock-bubble phil">Then you weren't ready yet. The question is whether you have the will to rise.</div>
              </div>
            </div>
            <div className="mockup-input">
              <span>Ask anything...</span>
              <button>Send</button>
            </div>
          </div>
        </div>
      </div>

      <div className="philosophers">
        <div className="section-label">The thinkers</div>
        <h2 className="section-title">Five philosophers. All yours.</h2>
        <div className="phil-grid">
          {PHILOSOPHERS.map(p => (
            <div className="phil-card" key={p.key}>
              <div className="phil-avatar" style={{ background: p.bg, color: p.color }}>
                {p.name[0]}
              </div>
              <div className="phil-name">{p.name}</div>
              <div className="phil-years">{p.years}</div>
              <div className="phil-idea" style={{ color: p.color }}>{p.idea}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="cta-section">
        <h2 className="cta-title">Ready to think differently?</h2>
        <p className="cta-sub">Join the conversation that's been 2,000 years in the making.</p>
        <button className="cta-btn" onClick={() => onEnter()}>Enter PhilosophOS →</button>
      </div>
    </div>
  )
}
