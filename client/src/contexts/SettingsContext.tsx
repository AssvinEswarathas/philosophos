import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface Settings {
  theme: 'light' | 'dark'
  responseLength: 'short' | 'medium' | 'long'
  fontSize: 'small' | 'medium' | 'large'
  autoScroll: boolean
}

const defaults: Settings = {
  theme: 'light',
  responseLength: 'medium',
  fontSize: 'medium',
  autoScroll: true,
}

interface SettingsCtx {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  openSettings: () => void
  closeSettings: () => void
}

const SettingsContext = createContext<SettingsCtx>({
  settings: defaults,
  update: () => {},
  openSettings: () => {},
  closeSettings: () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem('philo-settings')
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults
    } catch {
      return defaults
    }
  })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('philo-settings', JSON.stringify(settings))
    document.documentElement.setAttribute('data-theme', settings.theme)
    document.documentElement.setAttribute('data-fontsize', settings.fontSize)
  }, [settings])

  const update = (patch: Partial<Settings>) => {
    // Apply DOM attributes immediately so the UI responds on the same frame
    if (patch.theme !== undefined) document.documentElement.setAttribute('data-theme', patch.theme)
    if (patch.fontSize !== undefined) document.documentElement.setAttribute('data-fontsize', patch.fontSize)
    setSettings(prev => ({ ...prev, ...patch }))
  }

  return (
    <SettingsContext.Provider value={{ settings, update, openSettings: () => setOpen(true), closeSettings: () => setOpen(false) }}>
      {children}
      {open && <SettingsModal onClose={() => setOpen(false)} settings={settings} update={update} />}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}

// ── Modal rendered inside provider so it sits above everything ──────────────

function SettingsModal({
  onClose,
  settings,
  update,
}: {
  onClose: () => void
  settings: Settings
  update: (patch: Partial<Settings>) => void
}) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <div className="settings-section-label">Appearance</div>

            <div className="settings-row">
              <div className="settings-row-info">
                <span className="settings-row-name">Theme</span>
                <span className="settings-row-sub">Light or dark interface</span>
              </div>
              <div className="settings-segment">
                {(['light', 'dark'] as const).map(v => (
                  <button
                    key={v}
                    className={`segment-btn${settings.theme === v ? ' active' : ''}`}
                    onClick={() => update({ theme: v })}
                  >
                    {v === 'light' ? 'Light' : 'Dark'}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row-info">
                <span className="settings-row-name">Font size</span>
                <span className="settings-row-sub">Text size across the app</span>
              </div>
              <div className="settings-segment">
                {(['small', 'medium', 'large'] as const).map(v => (
                  <button
                    key={v}
                    className={`segment-btn${settings.fontSize === v ? ' active' : ''}`}
                    onClick={() => update({ fontSize: v })}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-label">Behaviour</div>

            <div className="settings-row">
              <div className="settings-row-info">
                <span className="settings-row-name">Response length</span>
                <span className="settings-row-sub">How much the philosophers write per turn</span>
              </div>
              <div className="settings-segment">
                {(['short', 'medium', 'long'] as const).map(v => (
                  <button
                    key={v}
                    className={`segment-btn${settings.responseLength === v ? ' active' : ''}`}
                    onClick={() => update({ responseLength: v })}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row-info">
                <span className="settings-row-name">Auto-scroll</span>
                <span className="settings-row-sub">Follow new messages as they stream in</span>
              </div>
              <button
                className={`settings-toggle${settings.autoScroll ? ' on' : ''}`}
                onClick={() => update({ autoScroll: !settings.autoScroll })}
                aria-label="Toggle auto-scroll"
              >
                <div className="settings-toggle-thumb" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
