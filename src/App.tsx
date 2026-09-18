import { useEffect, useState } from 'react'
import { Authenticator, translations } from '@aws-amplify/ui-react'
import { I18n } from 'aws-amplify/utils'
import { fetchAuthSession } from 'aws-amplify/auth'
import '@aws-amplify/ui-react/styles.css'
import { useStore } from './store'
import Planung from './components/Planung'
import Timer from './components/Timer'
import Ziele from './components/Ziele'
import Statistik from './components/Statistik'
import AdminBereich from './components/AdminBereich'
import NotificationBell from './components/NotificationBell'
import ErrorBoundary from './components/ErrorBoundary'

I18n.putVocabularies(translations)
I18n.setLanguage('de')

const TABS = [
  { id: 'ziele', label: 'Ziele' },
  { id: 'planung', label: 'Planung' },
  { id: 'timer', label: 'Timer' },
  { id: 'statistik', label: 'Statistik' },
  { id: 'admin', label: 'Administration' },
] as const

function MainApp({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const { activeTab, setActiveTab, loading, error, setError, loadAll } = useStore()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    loadAll()
    fetchAuthSession().then((session) => {
      const groups = session.tokens?.accessToken.payload['cognito:groups']
      setIsAdmin(Array.isArray(groups) && groups.includes('ADMIN'))
    })
  }, [])

  const tabs = TABS.filter((t) => t.id !== 'admin' || isAdmin)

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">IU Lernzeit-Manager</span>
        <span className="app-user">
          {email}
          <button className="btn-secondary" style={{ marginLeft: 12 }} onClick={onSignOut}>Abmelden</button>
        </span>
      </header>

      <nav className="app-nav">
        <div className="nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <NotificationBell />
      </nav>

      <main className="app-main">
        {error && (
          <div className="warning-banner">
            {error}
            <button className="btn-secondary" onClick={() => setError(null)}>Schließen</button>
          </div>
        )}

        {loading ? <p className="empty-hint">Daten werden geladen…</p> : (
          // key sorgt dafür, dass ein Fehler beim Tab-Wechsel zurückgesetzt wird
          <ErrorBoundary key={activeTab}>
            {activeTab === 'planung' && <Planung />}
            <div style={{ display: activeTab === 'timer' ? 'block' : 'none' }}><Timer /></div>
            {activeTab === 'ziele' && <Ziele />}
            {activeTab === 'statistik' && <Statistik />}
            {activeTab === 'admin' && isAdmin && <AdminBereich />}
          </ErrorBoundary>
        )}
      </main>
    </div>
  )
}

// Titel ueber der Login-Karte, auf allen Auth-Schritten sichtbar
const authComponents = {
  Header: () => <div className="auth-title">IU Lernzeit-Manager</div>,
}

export default function App() {
  const clearUserData = useStore((s) => s.clearUserData)

  return (
    <Authenticator hideSignUp components={authComponents}>
      {({ signOut, user }) => (
        <MainApp
          email={user?.signInDetails?.loginId ?? ''}
          onSignOut={() => { clearUserData(); signOut?.() }}
        />
      )}
    </Authenticator>
  )
}
