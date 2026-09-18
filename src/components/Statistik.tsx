import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { useStore } from '../store'
import { toISODate, monthPlanHours } from '../utils'

const COLORS = ['#4a9eff', '#51cf66', '#ff6b6b', '#ffd43b', '#cc5de8', '#20c997', '#ff922b', '#74c0fc']
const GOAL_COLORS: Record<string, string> = { Offen: '#4a9eff', Erreicht: '#2f9e44', Verfehlt: '#e03131' }

const TICK_STYLE = { fontSize: 13, fill: '#444' }
const TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid #dde1e7', borderRadius: 6, fontSize: 13 }

export default function Statistik() {
  const { timerSessions, goals, monthPlans } = useStore()

  const weeklyData = useMemo(() => {
    const map: Record<string, number> = {}
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = toISODate(d)
      map[key] = 0
    }
    timerSessions.forEach((s) => { if (map[s.date] !== undefined) map[s.date] += s.durationMinutes })
    return Object.entries(map).map(([date, minutes]) => ({ date: date.slice(5), minuten: minutes }))
  }, [timerSessions])

  const subjectData = useMemo(() => {
    const map: Record<string, number> = {}
    timerSessions.forEach((s) => { map[s.subject] = (map[s.subject] || 0) + s.durationMinutes })
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value / 60 * 10) / 10 })).sort((a, b) => b.value - a.value)
  }, [timerSessions])

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {}
    timerSessions.forEach((s) => {
      const m = s.date.slice(0, 7)
      map[m] = (map[m] || 0) + s.durationMinutes
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, minutes]) => ({ month: month.slice(5), stunden: Math.round(minutes / 60 * 10) / 10 }))
  }, [timerSessions])

  const planVsActual = useMemo(() => {
    return monthPlans.slice(-6).map((p) => ({
      name: `${p.month.slice(5)} ${p.subject.slice(0, 8)}`,
      geplant: p.targetHours,
      erreicht: monthPlanHours(timerSessions, p),
    }))
  }, [monthPlans, timerSessions])

  const goalStats = useMemo(() => [
    { name: 'Offen', value: goals.filter((g) => g.status === 'offen').length },
    { name: 'Erreicht', value: goals.filter((g) => g.status === 'erreicht').length },
    { name: 'Verfehlt', value: goals.filter((g) => g.status === 'verfehlt').length },
  ].filter((x) => x.value > 0), [goals])

  const totalMinutes = timerSessions.reduce((a, s) => a + s.durationMinutes, 0)
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10
  const avgPerDay = timerSessions.length > 0
    ? Math.round(totalMinutes / new Set(timerSessions.map((s) => s.date)).size)
    : 0

  return (
    <div>
      <div className="stats-summary">
        <div className="stat-box"><span>Gesamt Lernzeit</span><strong>{totalHours} h</strong></div>
        <div className="stat-box"><span>Ø pro Lerntag</span><strong>{avgPerDay} min</strong></div>
        <div className="stat-box"><span>Ziele erreicht</span><strong>{goals.filter((g) => g.status === 'erreicht').length} / {goals.length}</strong></div>
        <div className="stat-box"><span>Lerntage gesamt</span><strong>{new Set(timerSessions.map((s) => s.date)).size}</strong></div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <h3>Lernzeit letzte 7 Tage (Minuten)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" tick={TICK_STYLE} />
              <YAxis tick={TICK_STYLE} width={40} />
              <Tooltip formatter={(v) => [`${v} min`, 'Lernzeit']} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="minuten" fill="#4a9eff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Monatliche Lernzeit (Stunden)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" tick={TICK_STYLE} />
              <YAxis tick={TICK_STYLE} width={40} />
              <Tooltip formatter={(v) => [`${v} h`, 'Lernzeit']} contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="stunden" stroke="#4a9eff" strokeWidth={2} dot={{ r: 4, fill: '#4a9eff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {subjectData.length > 0 && (
          <div className="card">
            <h3>Lernzeit nach Modul (Stunden)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={subjectData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={false}
                >
                  {subjectData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v} h`, 'Lernzeit']} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 13, color: '#333' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {planVsActual.length > 0 && (
          <div className="card">
            <h3>Plan vs. Ist (Stunden)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={planVsActual} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={TICK_STYLE} />
                <YAxis tick={TICK_STYLE} width={40} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 13, color: '#333' }} />
                <Bar dataKey="geplant" name="Geplant" fill="#adb5bd" radius={[4, 4, 0, 0]} />
                <Bar dataKey="erreicht" name="Erreicht" fill="#4a9eff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {goalStats.length > 0 && (
          <div className="card">
            <h3>Zielstatus</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={goalStats}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={false}
                >
                  {goalStats.map((g) => <Cell key={g.name} fill={GOAL_COLORS[g.name]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 13, color: '#333' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
