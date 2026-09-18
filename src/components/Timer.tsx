import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useStore } from '../store'
import { today, toISODate } from '../utils'

const INACTIVITY_THRESHOLD = 5 * 60 * 1000
// Kürzere Sitzungen werden verworfen, damit ein versehentlicher Start keine
// Lernzeit erzeugt.
const MIN_SESSION_SECONDS = 30

export default function Timer() {
  const {
    timerSessions, addTimerSession, updateTimerSession,
    sixMonthPlans, monthPlans,
    timerRunning, timerElapsed, timerSubject, timerStartedAt,
    setTimerRunning, setTimerElapsed, setTimerSubject, setTimerStartedAt, resetTimer,
  } = useStore()

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [inactiveWarning, setInactiveWarning] = useState(false)

  // Nachtraegliche Korrektur einer Sitzung: id der Zeile plus die geaenderten
  // Felder. Gleiches Bearbeitungsmuster wie in der Planung.
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ subject?: string; durationMinutes?: number }>({})

  // Messbar ist nur, was zuvor geplant wurde. Die Auswahl speist sich daher
   // aus beiden Planungsebenen, nicht aus den Zielen: Ein Modul kann im Reiter
   // Ziele definiert sein, ohne dass dafuer Lernzeit eingeplant waere.
  const subjectOptions = useMemo(() => {
    const alle = [...sixMonthPlans.map((p) => p.subject), ...monthPlans.map((p) => p.subject)]
    return [...new Set(alle.filter(Boolean))].sort()
  }, [sixMonthPlans, monthPlans])

  // Startet die Inaktivitätsüberwachung neu. Wird bei jeder Nutzerinteraktion
  // aufgerufen, das State-Update greift nur beim tatsächlichen Wechsel.
  const resetInactivityTimer = useCallback(() => {
    setInactiveWarning((v) => (v ? false : v))
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    if (timerRunning) {
      inactivityTimerRef.current = setTimeout(() => setInactiveWarning(true), INACTIVITY_THRESHOLD)
    }
  }, [timerRunning])

  useEffect(() => {
    resetInactivityTimer()
    const events = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach((e) => window.addEventListener(e, resetInactivityTimer))
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactivityTimer))
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    }
  }, [resetInactivityTimer])

  useEffect(() => {
    if (!timerRunning) return
    const id = setInterval(() => {
      setTimerElapsed(Math.floor((Date.now() - useStore.getState().timerStartedAt) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [timerRunning])

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const handleStart = () => {
    const now = Date.now() - timerElapsed * 1000
    setTimerStartedAt(now)
    setTimerRunning(true)
  }

  const handleStop = () => {
    setTimerRunning(false)
    if (timerElapsed >= MIN_SESSION_SECONDS) {
      addTimerSession({
        date: today(),
        subject: timerSubject,
        durationMinutes: Math.max(1, Math.round(timerElapsed / 60)),
        // Nach einem Reload ist timerStartedAt nicht mehr bekannt und wird
        // aus der bereits gemessenen Zeit zurückgerechnet.
        startedAt: new Date(timerStartedAt || Date.now() - timerElapsed * 1000).toISOString(),
      })
    }
    resetTimer()
  }

  const todayMinutes = timerSessions
    .filter((s) => s.date === today())
    .reduce((acc, s) => acc + s.durationMinutes, 0)

  const weekMinutes = (() => {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    return timerSessions
      .filter((s) => s.date >= toISODate(monday))
      .reduce((acc, s) => acc + s.durationMinutes, 0)
  })()

  return (
    <div>
      <div className="card">
        <h3>Lernzeit-Stoppuhr</h3>
        {inactiveWarning && (
          <div className="warning-banner">
            Keine Aktivität erkannt – bist du noch am Lernen?
            <button className="btn-secondary" style={{ marginLeft: 12 }} onClick={resetInactivityTimer}>Ja, weiter</button>
          </div>
        )}
        <div className="timer-display">{fmt(timerElapsed)}</div>
        <div className="timer-subject-row">
          <div className="form-field" style={{ width: 280 }}>
            <label>Modul</label>
            {subjectOptions.length === 0 ? (
              <p className="empty-hint" style={{ margin: 0 }}>Erst ein Modul im Reiter Planung erfassen.</p>
            ) : (
              <select value={timerSubject} onChange={(e) => setTimerSubject(e.target.value)} disabled={timerRunning}>
                <option value="">– Modul auswählen –</option>
                {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="row-gap" style={{ marginTop: 16, justifyContent: 'center' }}>
          {timerRunning ? (
            <>
              <button className="btn-secondary btn-lg" onClick={() => setTimerRunning(false)}>⏸ Pause</button>
              <button className="btn-danger btn-lg" onClick={handleStop}>⏹ Stopp & Speichern</button>
            </>
          ) : (
            <>
              <button className="btn-primary btn-lg" onClick={handleStart} disabled={!timerSubject}>
                {timerElapsed > 0 ? '▶ Weiter' : '▶ Start'}
              </button>
              {timerElapsed > 0 && (
                <button className="btn-danger btn-lg" onClick={handleStop}>⏹ Stopp & Speichern</button>
              )}
            </>
          )}
        </div>
        <div className="timer-stats">
          <div className="stat-box"><span>Heute</span><strong>{todayMinutes} min</strong></div>
          <div className="stat-box"><span>Diese Woche</span><strong>{weekMinutes} min</strong></div>
        </div>
      </div>

      <div className="card">
        <h3>Letzte Sitzungen</h3>
        {timerSessions.length === 0 ? (
          <p className="empty-hint">Noch keine Sitzungen aufgezeichnet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Datum</th><th>Modul</th><th>Dauer</th><th></th></tr>
            </thead>
            <tbody>
              {[...timerSessions].reverse().slice(0, 20).map((s) => editing === s.id ? (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>
                    <select
                      value={editData.subject ?? s.subject}
                      onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                    >
                      {/* Das bisherige Modul bleibt waehlbar, auch wenn dafuer
                          keine Planung mehr besteht. */}
                      {[...new Set([...subjectOptions, s.subject])].sort().map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      style={{ width: 80 }}
                      value={editData.durationMinutes ?? s.durationMinutes}
                      onChange={(e) => setEditData({ ...editData, durationMinutes: +e.target.value })}
                    /> min
                  </td>
                  <td className="action-cell">
                    <button
                      className="btn-primary"
                      disabled={(editData.durationMinutes ?? s.durationMinutes) < 1}
                      onClick={() => { updateTimerSession(s.id, editData); setEditing(null) }}
                    >✓</button>
                    <button className="btn-secondary" onClick={() => setEditing(null)}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>{s.subject}</td>
                  <td>{s.durationMinutes} min</td>
                  <td className="action-cell">
                    <button className="btn-secondary" onClick={() => { setEditing(s.id); setEditData({}) }}>Bearbeiten</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
