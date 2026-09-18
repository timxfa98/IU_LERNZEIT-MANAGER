import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState } from './types'
import {
  client, orNull,
  toGoal, toSixMonthPlan, toMonthPlan, toTimerSession,
} from './api'

const uid = () => Math.random().toString(36).slice(2, 10)

const message = (e: unknown) => (e instanceof Error ? e.message : 'Unbekannter Fehler')

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      goals: [],
      monthPlans: [],
      sixMonthPlans: [],
      timerSessions: [],
      notifications: [],
      notifiedKeys: [],
      activeTab: 'ziele',
      timerRunning: false,
      timerElapsed: 0,
      timerSubject: '',
      timerStartedAt: 0,
      loading: false,
      error: null,

      setError: (error) => set({ error }),

      /** Lädt nach dem Login alle Daten der angemeldeten Person. */
      loadAll: async () => {
        set({ loading: true, error: null })
        try {
          const [goals, sixMonthPlans, monthPlans, timerSessions] =
            await Promise.all([
              client.models.Goal.list(),
              client.models.SixMonthPlan.list(),
              client.models.MonthPlan.list(),
              client.models.TimerSession.list(),
            ])
          set({
            goals: goals.data.map(toGoal),
            sixMonthPlans: sixMonthPlans.data.map(toSixMonthPlan),
            monthPlans: monthPlans.data.map(toMonthPlan),
            timerSessions: timerSessions.data.map(toTimerSession),
            loading: false,
          })
        } catch (e) {
          set({ loading: false, error: `Daten konnten nicht geladen werden: ${message(e)}` })
        }
      },

      /** Beim Abmelden: Daten des vorherigen Kontos aus dem Browser entfernen. */
      clearUserData: () => set({
        goals: [], monthPlans: [], sixMonthPlans: [],
        timerSessions: [], notifications: [], notifiedKeys: [],
        timerRunning: false, timerElapsed: 0, timerSubject: '', timerStartedAt: 0,
        activeTab: 'ziele', error: null,
      }),

      addGoal: async (g) => {
        try {
          const { data } = await client.models.Goal.create({ ...g, targetDate: orNull(g.targetDate) })
          if (data) set((s) => ({ goals: [...s.goals, toGoal(data)] }))
        } catch (e) { set({ error: message(e) }) }
      },
      updateGoal: async (id, g) => {
        try {
          const { data } = await client.models.Goal.update({
            id, ...g, ...(g.targetDate !== undefined && { targetDate: orNull(g.targetDate) }),
          })
          if (data) set((s) => ({ goals: s.goals.map((x) => x.id === id ? toGoal(data) : x) }))
        } catch (e) { set({ error: message(e) }) }
      },
      deleteGoal: async (id) => {
        try {
          await client.models.Goal.delete({ id })
          set((s) => ({ goals: s.goals.filter((x) => x.id !== id) }))
        } catch (e) { set({ error: message(e) }) }
      },

      addMonthPlan: async (p) => {
        try {
          const { data } = await client.models.MonthPlan.create(p)
          if (data) set((s) => ({ monthPlans: [...s.monthPlans, toMonthPlan(data)] }))
        } catch (e) { set({ error: message(e) }) }
      },
      updateMonthPlan: async (id, p) => {
        try {
          const { data } = await client.models.MonthPlan.update({ id, ...p })
          if (data) set((s) => ({ monthPlans: s.monthPlans.map((x) => x.id === id ? toMonthPlan(data) : x) }))
        } catch (e) { set({ error: message(e) }) }
      },
      deleteMonthPlan: async (id) => {
        try {
          await client.models.MonthPlan.delete({ id })
          set((s) => ({ monthPlans: s.monthPlans.filter((x) => x.id !== id) }))
        } catch (e) { set({ error: message(e) }) }
      },

      addSixMonthPlan: async (p) => {
        try {
          const { data } = await client.models.SixMonthPlan.create(p)
          if (data) set((s) => ({ sixMonthPlans: [...s.sixMonthPlans, toSixMonthPlan(data)] }))
        } catch (e) { set({ error: message(e) }) }
      },
      updateSixMonthPlan: async (id, p) => {
        try {
          const { data } = await client.models.SixMonthPlan.update({ id, ...p })
          if (data) set((s) => ({ sixMonthPlans: s.sixMonthPlans.map((x) => x.id === id ? toSixMonthPlan(data) : x) }))
        } catch (e) { set({ error: message(e) }) }
      },
      deleteSixMonthPlan: async (id) => {
        try {
          await client.models.SixMonthPlan.delete({ id })
          set((s) => ({ sixMonthPlans: s.sixMonthPlans.filter((x) => x.id !== id) }))
        } catch (e) { set({ error: message(e) }) }
      },

      addTimerSession: async (t) => {
        try {
          const { data } = await client.models.TimerSession.create(t)
          if (data) set((s) => ({ timerSessions: [...s.timerSessions, toTimerSession(data)] }))
        } catch (e) { set({ error: message(e) }) }
      },
      updateTimerSession: async (id, t) => {
        try {
          const { data } = await client.models.TimerSession.update({ id, ...t })
          if (data) set((s) => ({ timerSessions: s.timerSessions.map((x) => x.id === id ? toTimerSession(data) : x) }))
        } catch (e) { set({ error: message(e) }) }
      },


      setTimerRunning: (v) => set({ timerRunning: v }),
      setTimerElapsed: (v) => set({ timerElapsed: v }),
      setTimerSubject: (v) => set({ timerSubject: v }),
      setTimerStartedAt: (v) => set({ timerStartedAt: v }),
      resetTimer: () => set({ timerRunning: false, timerElapsed: 0, timerSubject: '', timerStartedAt: 0 }),

      // Benachrichtigungen bleiben bewusst lokal im Browser: sie sind
      // Anzeigezustand, kein fachliches Datum, und müssen nicht
      // geräteübergreifend synchron sein.
      addNotificationOnce: (key, msg, level = 'hinweis') => set((s) => s.notifiedKeys.includes(key) ? s : ({
        notifiedKeys: [...s.notifiedKeys, key],
        notifications: [{ id: uid(), message: msg, createdAt: new Date().toISOString(), read: false, level }, ...s.notifications],
      })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      clearNotifications: () => set({ notifications: [] }),

      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'lernzeit-manager',
      // Fachdaten liegen jetzt in DynamoDB. Lokal bleiben nur Anzeigezustand
      // und die laufende Messung. timerRunning/timerStartedAt werden bewusst
      // nicht gespeichert, damit eine geschlossene App keine Lernzeit zählt.
      partialize: (s) => ({
        notifications: s.notifications,
        notifiedKeys: s.notifiedKeys,
        activeTab: s.activeTab,
        timerElapsed: s.timerElapsed,
        timerSubject: s.timerSubject,
      }),
    },
  ),
)
