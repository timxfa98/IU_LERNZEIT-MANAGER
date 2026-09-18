import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { today, thisMonth, daysBetween, monthProgress, endMonth, monthPlanHours, sixMonthPlanHours } from '../utils'

// Ab so vielen Tagen ohne erfasste Lernzeit gilt die Pause als ungeplante
// Inaktivität und es wird erinnert (höchstens einmal pro Tag).
const INACTIVITY_DAYS = 3

// Ab diesem Rueckstand gegenueber dem verstrichenen Monat wird an die
// geplante Zeit erinnert. 25 Prozentpunkte sind bewusst grosszuegig: Ein
// geringerer Wert wuerde schon bei normalen Schwankungen im Lernrhythmus
// ausloesen und die Glocke entwerten.
const RUECKSTAND_SCHWELLE = 0.25

export default function NotificationBell() {
  const { notifications, goals, monthPlans, sixMonthPlans, timerSessions, addNotificationOnce, markAllRead, clearNotifications } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifications.filter((n) => !n.read).length

  // Schließen bei Klick außerhalb
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Automatische Erinnerungen (prüft beim Öffnen und danach jede Minute).
  // Jede Erinnerung hat einen festen Schlüssel und wird daher nur einmal
  // erzeugt – auch über einen Reload hinweg.
  useEffect(() => {
    const check = () => {
      const todayStr = today()

      // 1. Geplante Zeiten: Erinnerung an das Stundenkontingent des Monats,
      //    einmal je Monatsplan
      const monat = thisMonth()
      monthPlans.filter((p) => p.month === monat).forEach((p) => {
        addNotificationOnce(
          `plan-start-${p.id}`,
          `Diesen Monat geplant: ${p.targetHours} h für ${p.subject}`,
        )
      })

      // 2. Geplante Zeiten: Rückstand im laufenden Monat, höchstens einmal
      //    täglich je Monatsplan
      const anteilMonat = monthProgress(monat, todayStr)
      monthPlans.filter((p) => p.month === monat && p.targetHours > 0).forEach((p) => {
        const ist = monthPlanHours(timerSessions, p)
        const anteilStunden = ist / p.targetHours
        if (anteilMonat - anteilStunden >= RUECKSTAND_SCHWELLE) {
          addNotificationOnce(
            `plan-behind-${p.id}-${todayStr}`,
            `${p.subject}: ${ist} von ${p.targetHours} geplanten Stunden – der Monat ist zu ${Math.round(anteilMonat * 100)} % vorbei.`,
          )
        }
      })

      // 3. Geplante Zeiten: Soll erreicht oder überschritten. Gilt für
      //    Monats- und 6-Monats-Pläne gleichermaßen.
      //
      //    Genau erreicht  -> einmalige Bestätigung.
      //    Darüber         -> Warnung mit der Differenz. Läuft der Zeitraum
      //                       noch, wird sie täglich wiederholt, weil die
      //                       Abweichung weiter wachsen kann. Ist er vorbei,
      //                       lässt sich nichts mehr ändern und es bleibt bei
      //                       einer einzigen Meldung.
      const meldeSoll = (
        id: string, subject: string, soll: number, ist: number,
        zeitraum: string, laufend: boolean,
      ) => {
        if (ist < soll) return
        const diff = Math.round((ist - soll) * 10) / 10
        if (diff === 0) {
          addNotificationOnce(
            `plan-done-${id}`,
            `${subject}: geplante ${soll} h für ${zeitraum} erreicht.`,
          )
          return
        }
        addNotificationOnce(
          laufend ? `plan-over-${id}-${todayStr}` : `plan-over-${id}`,
          `${subject}: ${diff} h über der Planung für ${zeitraum} – ${ist} statt ${soll} geplanten Stunden.`,
          'warnung',
        )
      }

      monthPlans.filter((p) => p.targetHours > 0).forEach((p) => {
        meldeSoll(p.id, p.subject, p.targetHours, monthPlanHours(timerSessions, p),
          p.month, p.month === monat)
      })
      sixMonthPlans.filter((p) => p.targetHours > 0).forEach((p) => {
        const letzter = endMonth(p.startMonth)
        meldeSoll(p.id, p.subject, p.targetHours, sixMonthPlanHours(timerSessions, p),
          `${p.startMonth} – ${letzter}`, p.startMonth <= monat && monat <= letzter)
      })

      // 4. Ziele: heute oder bereits früher fällig und noch offen
      goals.forEach((g) => {
        if (g.status === 'offen' && g.targetDate && g.targetDate <= todayStr) {
          const overdue = daysBetween(g.targetDate, todayStr)
          addNotificationOnce(
            `goal-due-${g.id}-${g.targetDate}`,
            overdue > 0 ? `Ziel überfällig seit ${overdue} Tag(en): "${g.title}"` : `Ziel fällig heute: "${g.title}"`,
          )
        }
      })

      // 5. Ungeplante Inaktivität: längere Zeit gar keine Lernzeit erfasst,
      //    obwohl eine Planung oder ein offenes Ziel existiert
      const hasPlanning = monthPlans.length > 0 || sixMonthPlans.length > 0 ||
        goals.some((g) => g.status === 'offen')
      if (hasPlanning && timerSessions.length > 0) {
        const lastDate = timerSessions.reduce((max, s) => (s.date > max ? s.date : max), '')
        const days = daysBetween(lastDate, todayStr)
        if (days >= INACTIVITY_DAYS) {
          addNotificationOnce(`inactive-${todayStr}`, `Seit ${days} Tagen keine Lernzeit erfasst – zurück zum Lernplan?`)
        }
      }
    }

    check()
    const interval = setInterval(check, 60 * 1000)
    return () => clearInterval(interval)
  }, [goals, monthPlans, sixMonthPlans, timerSessions])

  const handleOpen = () => {
    setOpen((v) => !v)
    if (!open) markAllRead()
  }

  const fmt = (iso: string) => {
    const d = new Date(iso)
    return `${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className="bell-wrapper" ref={ref}>
      <button className="bell-btn" onClick={handleOpen} title="Benachrichtigungen">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="bell-dropdown">
          <div className="bell-dropdown-header">
            <span>Benachrichtigungen</span>
            {notifications.length > 0 && (
              <button className="bell-clear" onClick={clearNotifications}>Alle löschen</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="bell-empty">Keine Benachrichtigungen</p>
          ) : (
            <ul className="bell-list">
              {notifications.map((n) => (
                <li key={n.id} className={`bell-item${n.read ? '' : ' unread'}${n.level === 'warnung' ? ' warnung' : ''}`}>
                  <span className="bell-msg">
                    {n.level === 'warnung' && <strong className="bell-warn-label">Warnung: </strong>}
                    {n.message}
                  </span>
                  <span className="bell-time">{fmt(n.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
