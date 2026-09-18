import type { Goal, MonthPlan, SixMonthPlan, TimerSession } from './types'

// Lokales Datum als YYYY-MM-DD. toISOString() liefert UTC und verschiebt in
// Deutschland nach Mitternacht das Datum um einen Tag.
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const today = () => toISODate(new Date())
export const thisMonth = () => today().slice(0, 7)

// Verschiebt einen Monat (YYYY-MM) um n Monate.
export const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Anteil des bereits verstrichenen Monats, zwischen 0 und 1.
 *
 * Grundlage der Erinnerung an geplante Zeiten: Erst im Verhaeltnis zum
 * verstrichenen Monat laesst sich beurteilen, ob ein Rueckstand besteht.
 * Zwei von zehn Stunden sind am Monatsanfang unauffaellig und drei Tage vor
 * Monatsende ein deutlicher Rueckstand.
 */
export const monthProgress = (month: string, heute: string) => {
  if (heute.slice(0, 7) !== month) return heute.slice(0, 7) > month ? 1 : 0
  const [y, m] = month.split('-').map(Number)
  const tageImMonat = new Date(y, m, 0).getDate()
  return Number(heute.slice(8, 10)) / tageImMonat
}

// Ganze Tage zwischen zwei YYYY-MM-DD-Daten (beide werden als UTC geparst).
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86400000)

/**
 * Die im Reiter Ziele definierten Module, alphabetisch und ohne Duplikate.
 *
 * Ziele sind die einzige Stelle, an der ein Modul entsteht. Planung und Timer
 * bieten ausschliesslich diese Liste an, damit keine abweichenden
 * Schreibweisen desselben Moduls nebeneinander existieren.
 */
export const moduleOptions = (goals: Goal[]) =>
  [...new Set(goals.map((g) => g.subject).filter(Boolean))].sort()

// Fortschritt in Prozent, gedeckelt auf 100. Fängt Ziel-Stunden von 0 ab.
export const percent = (actual: number, target: number) =>
  target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0

// Erfasste Lernstunden eines Moduls, gefiltert über ein Datums-Prädikat.
// Der Modulname muss exakt übereinstimmen, damit sich Module mit ähnlichem
// Namen (z. B. "BWL" und "BWL Grundlagen") nicht gegenseitig mitzählen.
export const hoursFor = (
  sessions: TimerSession[],
  subject: string,
  inRange: (date: string) => boolean,
) =>
  Math.round(
    sessions
      .filter((s) => s.subject === subject && inRange(s.date))
      .reduce((a, s) => a + s.durationMinutes, 0) / 60 * 10,
  ) / 10

// Letzter Monat eines 6-Monats-Zeitraums (Startmonat eingeschlossen).
export const endMonth = (startMonth: string) => shiftMonth(startMonth, 5)

// Erfasste Lernstunden eines Monatsplans.
export const monthPlanHours = (sessions: TimerSession[], plan: MonthPlan) =>
  hoursFor(sessions, plan.subject, (date) => date.startsWith(plan.month))

// Erfasste Lernstunden eines 6-Monats-Plans über dessen gesamten Zeitraum.
export const sixMonthPlanHours = (sessions: TimerSession[], plan: SixMonthPlan) => {
  const last = endMonth(plan.startMonth)
  return hoursFor(sessions, plan.subject, (date) => {
    const month = date.slice(0, 7)
    return month >= plan.startMonth && month <= last
  })
}
