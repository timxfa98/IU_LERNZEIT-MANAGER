import { useState } from 'react'
import { useStore } from '../store'
import type { SixMonthPlan, MonthPlan } from '../types'
import { thisMonth, endMonth, monthPlanHours, sixMonthPlanHours, moduleOptions, percent } from '../utils'

/**
 * Auswahl eines Moduls. Module entstehen ausschliesslich im Reiter Ziele.
 *
 * Ein bereits gespeicherter Wert bleibt waehlbar, auch wenn dafuer kein Ziel
 * mehr besteht - sonst wuerde das Oeffnen des Formulars den Eintrag
 * stillschweigend einem anderen Modul zuordnen.
 */
function ModulAuswahl({ value, onChange, module, hinweis }: { value: string; onChange: (v: string) => void; module: string[]; hinweis: string }) {
  const optionen = [...new Set([...module, value].filter(Boolean))].sort()
  if (optionen.length === 0) {
    return <p className="empty-hint" style={{ margin: 0 }}>{hinweis}</p>
  }
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">– Modul auswählen –</option>
      {optionen.map((m) => <option key={m} value={m}>{m}</option>)}
    </select>
  )
}

const STATUS_LABELS = { offen: 'Offen', erreicht: 'Erreicht', verfehlt: 'Verfehlt' } as const

const HINWEIS = 'Erst ein Modul im Reiter Ziele anlegen.'
const HINWEIS_MONAT = 'Erst ein Modul in der 6-Monats-Grobplanung erfassen.'

function SixMonthSection() {
  const { sixMonthPlans, addSixMonthPlan, updateSixMonthPlan, deleteSixMonthPlan, timerSessions, goals } = useStore()
  const module = moduleOptions(goals)
  const [form, setForm] = useState<Omit<SixMonthPlan, 'id'>>({ startMonth: thisMonth(), subject: '', targetHours: 10, note: '', status: 'offen' })
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<SixMonthPlan>>({})

  const actualHours = (plan: SixMonthPlan) => sixMonthPlanHours(timerSessions, plan)

  return (
    <div className="card">
      <h3>6-Monats-Grobplanung</h3>
      <div className="plan-form">
        <div className="form-field">
          <label>Modul</label>
          <ModulAuswahl value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} module={module} hinweis={HINWEIS} />
        </div>
        <div className="form-field">
          <label>Startmonat</label>
          <input type="month" value={form.startMonth} onChange={(e) => setForm({ ...form, startMonth: e.target.value })} />
        </div>
        <div className="form-field">
          <label>Ziel-Stunden</label>
          <input type="number" placeholder="z.B. 40" value={form.targetHours} min={1} onChange={(e) => setForm({ ...form, targetHours: +e.target.value })} style={{ maxWidth: 130 }} />
        </div>
        <div className="form-field">
          <label>Notiz (optional)</label>
          <input placeholder="z.B. Fokus auf Lektion 3-5" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <div className="form-field form-field-btn">
          <button className="btn-primary" onClick={() => { if (form.subject) { addSixMonthPlan(form); setForm({ startMonth: thisMonth(), subject: '', targetHours: 10, note: '', status: 'offen' }) } }}>+ Hinzufügen</button>
        </div>
      </div>
      {sixMonthPlans.length === 0 ? <p className="empty-hint">Noch keine Grobplanung vorhanden.</p> : (
        <table className="data-table" style={{ marginTop: 12 }}>
          <thead><tr><th>Modul</th><th>Zeitraum (6 Monate)</th><th>Ziel (h)</th><th>Ist (h)</th><th>Fortschritt</th><th>Notiz</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {sixMonthPlans.map((p) => {
              const actual = actualHours(p)
              const pct = percent(actual, p.targetHours)
              return editing === p.id ? (
                <tr key={p.id}>
                  <td><ModulAuswahl value={editData.subject ?? p.subject} onChange={(v) => setEditData({ ...editData, subject: v })} module={module} hinweis={HINWEIS} /></td>
                  <td><input type="month" value={editData.startMonth ?? p.startMonth} onChange={(e) => setEditData({ ...editData, startMonth: e.target.value })} /></td>
                  <td><input type="number" value={editData.targetHours ?? p.targetHours} onChange={(e) => setEditData({ ...editData, targetHours: +e.target.value })} /></td>
                  <td>{actual}</td>
                  <td>–</td>
                  <td><input value={editData.note ?? p.note} onChange={(e) => setEditData({ ...editData, note: e.target.value })} /></td>
                  <td>–</td>
                  <td className="action-cell">
                    <button className="btn-primary" onClick={() => { updateSixMonthPlan(p.id, editData); setEditing(null) }}>✓</button>
                    <button className="btn-secondary" onClick={() => setEditing(null)}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <td>{p.subject}</td>
                  <td>{p.startMonth} – {endMonth(p.startMonth)}</td>
                  <td>{p.targetHours}</td>
                  <td>{actual}</td>
                  <td>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--positive)' : 'var(--accent)' }} /></div>
                    <span style={{ fontSize: '0.8rem' }}>{pct}%</span>
                  </td>
                  <td>{p.note}</td>
                  <td>
                    <select
                      value={p.status}
                      onChange={(e) => updateSixMonthPlan(p.id, { status: e.target.value as SixMonthPlan['status'] })}
                    >
                      {(['offen', 'erreicht', 'verfehlt'] as const).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="action-cell">
                    <button className="btn-secondary" onClick={() => { setEditing(p.id); setEditData({}) }}>Bearbeiten</button>
                    <button className="btn-danger" onClick={() => deleteSixMonthPlan(p.id)}>Löschen</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function MonthSection() {
  const { monthPlans, addMonthPlan, updateMonthPlan, deleteMonthPlan, timerSessions, sixMonthPlans } = useStore()
  // Die Monatsplanung verfeinert die Grobplanung. Waehlbar ist deshalb nur,
  // was dort bereits erfasst ist - nicht jedes im Reiter Ziele angelegte Modul.
  const module = [...new Set(sixMonthPlans.map((p) => p.subject).filter(Boolean))].sort()
  const emptyForm: Omit<MonthPlan, 'id'> = { month: thisMonth(), subject: '', targetHours: 10, note: '', milestoneStatus: 'offen' }
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<MonthPlan>>({})

  const actualHours = (plan: MonthPlan) => monthPlanHours(timerSessions, plan)

  return (
    <div className="card">
      <h3>Monatsplanung (Detailplanung)</h3>
      <div className="plan-form">
        <div className="form-field">
          <label>Modul</label>
          <ModulAuswahl value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} module={module} hinweis={HINWEIS_MONAT} />
        </div>
        <div className="form-field">
          <label>Monat</label>
          <input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
        </div>
        <div className="form-field">
          <label>Ziel-Stunden</label>
          <input type="number" placeholder="z.B. 20" value={form.targetHours} min={1} onChange={(e) => setForm({ ...form, targetHours: +e.target.value })} style={{ maxWidth: 130 }} />
        </div>
        <div className="form-field">
          <label>Zwischenziel</label>
          <input placeholder="z.B. Lektion 4 abschließen" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <div className="form-field form-field-btn">
          <button className="btn-primary" onClick={() => { if (form.subject) { addMonthPlan(form); setForm(emptyForm) } }}>+ Hinzufügen</button>
        </div>
      </div>
      {monthPlans.length === 0 ? <p className="empty-hint">Noch keine Monatsplanung vorhanden.</p> : (
        <table className="data-table" style={{ marginTop: 12 }}>
          <thead><tr><th>Monat</th><th>Modul</th><th>Ziel (h)</th><th>Ist (h)</th><th>Fortschritt</th><th>Zwischenziel</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {[...monthPlans].sort((a, b) => b.month.localeCompare(a.month)).map((p) => {
              const actual = actualHours(p)
              const pct = percent(actual, p.targetHours)
              return editing === p.id ? (
                <tr key={p.id}>
                  <td><input type="month" value={editData.month ?? p.month} onChange={(e) => setEditData({ ...editData, month: e.target.value })} /></td>
                  <td><ModulAuswahl value={editData.subject ?? p.subject} onChange={(v) => setEditData({ ...editData, subject: v })} module={module} hinweis={HINWEIS_MONAT} /></td>
                  <td><input type="number" value={editData.targetHours ?? p.targetHours} onChange={(e) => setEditData({ ...editData, targetHours: +e.target.value })} /></td>
                  <td>{actual}</td>
                  <td>–</td>
                  <td><input value={editData.note ?? p.note} onChange={(e) => setEditData({ ...editData, note: e.target.value })} /></td>
                  <td>–</td>
                  <td className="action-cell">
                    <button className="btn-primary" onClick={() => { updateMonthPlan(p.id, editData); setEditing(null) }}>✓</button>
                    <button className="btn-secondary" onClick={() => setEditing(null)}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <td>{p.month}</td>
                  <td>{p.subject}</td>
                  <td>{p.targetHours}</td>
                  <td>{actual}</td>
                  <td>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--positive)' : 'var(--accent)' }} /></div>
                    <span style={{ fontSize: '0.8rem' }}>{pct}%</span>
                  </td>
                  <td>{p.note}</td>
                  <td>
                    <select
                      value={p.milestoneStatus}
                      disabled={!p.note}
                      title={p.note ? undefined : 'Erst ein Zwischenziel eintragen'}
                      onChange={(e) => updateMonthPlan(p.id, { milestoneStatus: e.target.value as MonthPlan['milestoneStatus'] })}
                    >
                      {(['offen', 'erreicht', 'verfehlt'] as const).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="action-cell">
                    <button className="btn-secondary" onClick={() => { setEditing(p.id); setEditData({}) }}>Bearbeiten</button>
                    <button className="btn-danger" onClick={() => deleteMonthPlan(p.id)}>Löschen</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function Planung() {
  return (
    <div>
      <SixMonthSection />
      <MonthSection />
    </div>
  )
}
