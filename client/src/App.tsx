import { useState } from 'react'
import LandingPage from './components/LandingPage'
import GroupChat from './components/GroupChat'
import DebateMode from './components/DebateMode'
import { SettingsProvider } from './contexts/SettingsContext'
import './App.css'

type View = 'landing' | 'chat' | 'debate'

function App() {
  const [view, setView] = useState<View>('landing')
  const [initialMessage, setInitialMessage] = useState('')

  const handleEnter = (message?: string) => {
    if (message) setInitialMessage(message)
    setView('chat')
  }

  if (view === 'landing') return <LandingPage onEnter={handleEnter} />

  return (
    <SettingsProvider>
      <div style={{ display: 'flex', height: '100vh' }}>
        {view === 'chat' && (
          <GroupChat
            initialMessage={initialMessage}
            onBack={() => setView('landing')}
            onDebate={() => setView('debate')}
          />
        )}
        {view === 'debate' && (
          <DebateMode
            onBack={() => setView('landing')}
            onChat={() => setView('chat')}
          />
        )}
      </div>
    </SettingsProvider>
  )
}

export default App
