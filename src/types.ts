export type GoalStatus = 'offen' | 'erreicht' | 'verfehlt'

export interface Goal {
  id: string
  title: string
  subject: string
  description: string
  targetDate: string
  status: GoalStatus
  category: 'klausur' | 'hausarbeit' | 'projektarbeit' | 'bachelorarbeit'
}

export interface MonthPlan {
  id: string
  month: string       // YYYY-MM
  subject: string
  targetHours: number
  note: string        // Zwischenziel
  milestoneStatus: GoalStatus
}

export interface SixMonthPlan {
  id: string
  startMonth: string  // YYYY-MM
  subject: string
  targetHours: number
  note: string
  status: GoalStatus
}

export interface TimerSession {
  id: string
  date: string
  subject: string
  durationMinutes: number
  startedAt: string
}

// Warnungen weisen auf eine Abweichung von der Planung hin und werden in der
// Glocke hervorgehoben. Optional, damit vor dieser Erweiterung gespeicherte
// Benachrichtigungen weiterhin gelesen werden koennen.
export type NotificationLevel = 'hinweis' | 'warnung'

export interface Notification {
  id: string
  message: string
  createdAt: string
  read: boolean
  level?: NotificationLevel
}

export interface AppState {
  goals: Goal[]
  monthPlans: MonthPlan[]
  sixMonthPlans: SixMonthPlan[]
  timerSessions: TimerSession[]
  notifications: Notification[]
  notifiedKeys: string[]
  activeTab: 'ziele' | 'planung' | 'timer' | 'statistik' | 'admin'
  loading: boolean
  error: string | null
  setError: (e: string | null) => void
  loadAll: () => Promise<void>
  clearUserData: () => void
  addGoal: (g: Omit<Goal, 'id'>) => Promise<void>
  updateGoal: (id: string, g: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  addMonthPlan: (p: Omit<MonthPlan, 'id'>) => Promise<void>
  updateMonthPlan: (id: string, p: Partial<MonthPlan>) => Promise<void>
  deleteMonthPlan: (id: string) => Promise<void>
  addSixMonthPlan: (p: Omit<SixMonthPlan, 'id'>) => Promise<void>
  updateSixMonthPlan: (id: string, p: Partial<SixMonthPlan>) => Promise<void>
  deleteSixMonthPlan: (id: string) => Promise<void>
  addTimerSession: (s: Omit<TimerSession, 'id'>) => Promise<void>
  updateTimerSession: (id: string, s: Partial<Omit<TimerSession, 'id'>>) => Promise<void>
  timerRunning: boolean
  timerElapsed: number
  timerSubject: string
  timerStartedAt: number
  setTimerRunning: (v: boolean) => void
  setTimerElapsed: (v: number) => void
  setTimerSubject: (v: string) => void
  setTimerStartedAt: (v: number) => void
  resetTimer: () => void
  addNotificationOnce: (key: string, message: string, level?: NotificationLevel) => void
  markAllRead: () => void
  clearNotifications: () => void
  setActiveTab: (tab: AppState['activeTab']) => void
}
