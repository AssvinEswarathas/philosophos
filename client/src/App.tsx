import { useState } from 'react'
import LandingPage from './components/LandingPage'
import GroupChat from './components/GroupChat'
import './App.css'

function App() {
  const [entered, setEntered] = useState(false)
  const [initialMessage, setInitialMessage] = useState('')

  const handleEnter = (message?: string) => {
    if (message) setInitialMessage(message)
    setEntered(true)
  }

  return entered
    ? <GroupChat initialMessage={initialMessage} onBack={() => setEntered(false)} />
    : <LandingPage onEnter={handleEnter} />
}

export default App
