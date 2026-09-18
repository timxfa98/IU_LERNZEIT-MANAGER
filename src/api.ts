import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import type { Goal, MonthPlan, SixMonthPlan, TimerSession } from './types'

export const client = generateClient<Schema>()

/**
 * Die von Amplify erzeugten Modelltypen sind durchgängig nullable und enthalten
 * technische Felder (createdAt, owner …). Damit die UI-Komponenten unverändert
 * bleiben können, werden die Zeilen hier auf die App-Typen aus types.ts
 * abgebildet – eine bewusst dünne Schicht zwischen Datenbank und Anwendung.
 */
export const toGoal = (r: Schema['Goal']['type']): Goal => ({
  id: r.id,
  title: r.title,
  subject: r.subject ?? '',
  description: r.description ?? '',
  targetDate: r.targetDate ?? '',
  status: r.status ?? 'offen',
  category: r.category ?? 'klausur',
})

export const toSixMonthPlan = (r: Schema['SixMonthPlan']['type']): SixMonthPlan => ({
  id: r.id,
  startMonth: r.startMonth,
  subject: r.subject,
  targetHours: r.targetHours,
  note: r.note ?? '',
  status: r.status ?? 'offen',
})

export const toMonthPlan = (r: Schema['MonthPlan']['type']): MonthPlan => ({
  id: r.id,
  month: r.month,
  subject: r.subject,
  targetHours: r.targetHours,
  note: r.note ?? '',
  milestoneStatus: r.milestoneStatus ?? 'offen',
})

export const toTimerSession = (r: Schema['TimerSession']['type']): TimerSession => ({
  id: r.id,
  date: r.date,
  subject: r.subject,
  durationMinutes: r.durationMinutes,
  startedAt: r.startedAt,
})

/** Leere Datumsfelder müssen als null gespeichert werden – "" ist kein AWSDate. */
export const orNull = (v: string) => (v === '' ? null : v)

/**
 * Werte vom Typ `a.json()` werden als AWSJSON übertragen und kommen je nach
 * Aufruf als bereits geparstes Objekt oder als JSON-String zurück. Diese
 * Hilfsfunktion normalisiert beide Fälle.
 */
export const parseJson = <T>(data: unknown): T | null => {
  if (data === null || data === undefined) return null
  if (typeof data !== 'string') return data as T
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}
