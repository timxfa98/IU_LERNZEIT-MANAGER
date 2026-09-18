import { useState } from 'react'
import { useStore } from '../store'
import type { Goal } from '../types'

const CATEGORIES: Goal['category'][] = ['klausur', 'hausarbeit', 'projektarbeit', 'bachelorarbeit']
const STATUS_LABELS: Record<Goal['status'], string> = { offen: 'Offen', erreicht: 'Erreicht', verfehlt: 'Verfehlt' }
const CAT_LABELS: Record<Goal['category'], string> = { klausur: 'Klausur', hausarbeit: 'Hausarbeit', projektarbeit: 'Projektarbeit', bachelorarbeit: 'Bachelorarbeit' }

export default function Ziele() {
  const { goals, addGoal, updateGoal, deleteGoal } = useStore()
  const [form, setForm] = useState<Omit<Goal, 'id'>>({ title: '', subject: '', description: '', targetDate: '', status: 'offen', category: 'klausur' })
  const [filter, setFilter] = useState<Goal['status'] | 'alle'>('alle')

  const handleAdd = () => {
    if (!form.title) return
    addGoal(form)
    setForm({ title: '', subject: '', description: '', targetDate: '', status: 'offen', category: 'klausur' })
  }

  const filtered = filter === 'alle' ? goals : goals.filter((g) => g.status === filter)
  const counts = { offen: goals.filter((g) => g.status === 'offen').length, erreicht: goals.filter((g) => g.status === 'erreicht').length, verfehlt: goals.filter((g) => g.status === 'verfehlt').length }

  return (
    <div>
      <div className="card">
        <h3>Neues Lernziel</h3>
        <div className="plan-form">
          <div className="form-field">
            <label>Ziel</label>
            <input placeholder="z.B. Klausur Statistik bestehen" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Modul</label>
            <input placeholder="z.B. Statistik" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Beschreibung (optional)</label>
            <input placeholder="z.B. Note 1,7 erreichen" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Kategorie</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Goal['category'] })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Zieldatum (optional)</label>
            <input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} style={{ maxWidth: 180 }} />
          </div>
          <div className="form-field form-field-btn">
            <button className="btn-primary" onClick={handleAdd}>+ Ziel hinzufügen</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="goals-header">
          <h3>Meine Lernziele</h3>
          <div className="goal-stats">
            <span className="stat-chip offen" onClick={() => setFilter('offen')}>{counts.offen} Offen</span>
            <span className="stat-chip erreicht" onClick={() => setFilter('erreicht')}>{counts.erreicht} Erreicht</span>
            <span className="stat-chip verfehlt" onClick={() => setFilter('verfehlt')}>{counts.verfehlt} Verfehlt</span>
            <span className="stat-chip" onClick={() => setFilter('alle')}>Alle</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="empty-hint">Keine Ziele vorhanden.</p>
        ) : (
          <div className="goals-grid">
            {filtered.map((g) => {
              const overdue = g.status === 'offen' && g.targetDate && new Date(g.targetDate) < new Date()
              return (
                <div key={g.id} className={`goal-card ${g.status} ${overdue ? 'overdue' : ''}`}>
                  <div className="goal-card-top">
                    <span className="goal-cat">{CAT_LABELS[g.category]}</span>
                    {overdue && <span className="overdue-badge">Überfällig</span>}
                  </div>
                  <div className="goal-title">{g.title}</div>
                  {g.subject && <div className="goal-subject">{g.subject}</div>}
                  {g.description && <div className="goal-desc">{g.description}</div>}
                  {g.targetDate && <div className="goal-date">Zieldatum: {g.targetDate}</div>}
                  <div className="goal-actions">
                    <select value={g.status} onChange={(e) => updateGoal(g.id, { status: e.target.value as Goal['status'] })} className="status-select">
                      {(['offen', 'erreicht', 'verfehlt'] as Goal['status'][]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <button className="btn-danger" onClick={() => deleteGoal(g.id)}>Löschen</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
