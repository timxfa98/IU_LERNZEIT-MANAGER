import { useEffect, useState } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { client, parseJson } from '../api'

type CognitoUser = {
  username?: string
  email?: string
  isAdmin?: boolean
  status?: string
  enabled?: boolean
  createdAt?: string
}

type Ergebnis = { ok?: boolean; message?: string }

const STATUS_LABELS: Record<string, string> = {
  FORCE_CHANGE_PASSWORD: 'Einladung offen',
  CONFIRMED: 'Aktiv',
  RESET_REQUIRED: 'Zurücksetzen nötig',
}

export default function AdminBereich() {
  const [users, setUsers] = useState<CognitoUser[]>([])
  const [email, setEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [eigeneKennung, setEigeneKennung] = useState('')
  const [eigeneEmail, setEigeneEmail] = useState('')
  const [zeileBusy, setZeileBusy] = useState<string | null>(null)
  const [loeschKandidat, setLoeschKandidat] = useState<string | null>(null)

  const load = async () => {
    try {
      const { data, errors } = await client.queries.listUsers()
      if (errors) return setHinweis(errors[0].message)
      const list = parseJson<CognitoUser[]>(data)
      setUsers(Array.isArray(list) ? list : [])
    } catch (e) {
      setHinweis(e instanceof Error ? e.message : 'Liste konnte nicht geladen werden.')
    }
  }

  useEffect(() => {
    load()
    // Die eigene Zeile wird gesperrt: niemand entzieht sich selbst die Rechte
    // oder löscht das eigene Konto. Verglichen wird gegen sub und E-Mail aus
    // dem ID-Token, weil Cognito je nach Pool-Konfiguration das eine oder das
    // andere als Username führt.
    fetchAuthSession()
      .then((session) => {
        const claims = session.tokens?.idToken?.payload
        setEigeneKennung(typeof claims?.sub === 'string' ? claims.sub : '')
        setEigeneEmail(typeof claims?.email === 'string' ? claims.email : '')
      })
      .catch(() => {})
  }, [])

  const handleAdd = async () => {
    if (!email) return
    setBusy(true)
    setHinweis(null)
    try {
      const { data, errors } = await client.mutations.createUser({ email, isAdmin })
      if (errors) return setHinweis(errors[0].message)

      const result = parseJson<Ergebnis>(data)
      if (!result?.ok) return setHinweis(result?.message ?? 'Anlegen fehlgeschlagen.')

      setHinweis(`${email} wurde angelegt. Die Einladung mit dem Initialpasswort wurde per E-Mail verschickt.`)
      setEmail('')
      setIsAdmin(false)
      load()
    } catch (e) {
      setHinweis(e instanceof Error ? e.message : 'Anlegen fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  const handleRolle = async (u: CognitoUser, adminNeu: boolean) => {
    if (!u.username) return
    setZeileBusy(u.username)
    setHinweis(null)
    try {
      const { data, errors } = await client.mutations.updateUserRole({
        username: u.username,
        isAdmin: adminNeu,
      })
      if (errors) return setHinweis(errors[0].message)

      const result = parseJson<Ergebnis>(data)
      if (!result?.ok) return setHinweis(result?.message ?? 'Rolle konnte nicht geändert werden.')

      setHinweis(`${u.email} ist jetzt ${adminNeu ? 'Administrator' : 'Benutzer'}.`)
      load()
    } catch (e) {
      setHinweis(e instanceof Error ? e.message : 'Rolle konnte nicht geändert werden.')
    } finally {
      setZeileBusy(null)
    }
  }

  const handleLoeschen = async (u: CognitoUser) => {
    if (!u.username) return
    setZeileBusy(u.username)
    setHinweis(null)
    try {
      const { data, errors } = await client.mutations.deleteUser({ username: u.username })
      if (errors) return setHinweis(errors[0].message)

      const result = parseJson<Ergebnis>(data)
      if (!result?.ok) return setHinweis(result?.message ?? 'Löschen fehlgeschlagen.')

      setHinweis(`${u.email} wurde gelöscht und kann sich nicht mehr anmelden.`)
      load()
    } catch (e) {
      setHinweis(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.')
    } finally {
      setZeileBusy(null)
      setLoeschKandidat(null)
    }
  }

  const anzahlAdmins = users.filter((u) => u.isAdmin).length

  return (
    <div>
      <div className="card">
        <h3>Neue Person anlegen</h3>
        <p className="form-desc">
          Cognito verschickt automatisch eine Einladungsmail mit einem temporären Passwort.
          Beim ersten Login muss ein eigenes Passwort vergeben werden.
        </p>
        <div className="plan-form">
          <div className="form-field">
            <label>E-Mail-Adresse</label>
            <input
              type="email"
              placeholder="name@iu-study.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Rolle</label>
            <select value={isAdmin ? 'admin' : 'benutzer'} onChange={(e) => setIsAdmin(e.target.value === 'admin')}>
              <option value="benutzer">Benutzer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div className="form-field form-field-btn">
            <button className="btn-primary" onClick={handleAdd} disabled={busy || !email}>
              {busy ? 'Wird angelegt…' : '+ Anlegen'}
            </button>
          </div>
        </div>
        {hinweis && <p className="empty-hint">{hinweis}</p>}
      </div>

      <div className="card">
        <h3>Vorhandene Personen</h3>
        {users.length === 0 ? <p className="empty-hint">Keine Einträge.</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>E-Mail</th><th>Rolle</th><th>Status</th><th>Aktiv</th><th>Angelegt</th><th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const ichSelbst =
                  (!!eigeneKennung && u.username === eigeneKennung) ||
                  (!!eigeneEmail && u.email === eigeneEmail)
                // Ohne diese Sperre könnte sich der Nutzerkreis komplett
                // aussperren – die Lambda prüft sie zusätzlich serverseitig.
                const letzterAdmin = !!u.isAdmin && anzahlAdmins === 1
                const gesperrt = ichSelbst || letzterAdmin || zeileBusy === u.username
                const grund = ichSelbst
                  ? 'Die eigene Rolle kann nicht geändert werden.'
                  : letzterAdmin ? 'Die letzte Administration kann nicht entzogen werden.' : undefined

                return (
                  <tr key={u.username}>
                    <td>
                      {u.email}
                      {ichSelbst && <span className="eigenes-konto"> (Du)</span>}
                    </td>
                    <td>
                      <select
                        className={u.isAdmin ? 'rolle-select ist-admin' : 'rolle-select'}
                        value={u.isAdmin ? 'admin' : 'benutzer'}
                        disabled={gesperrt}
                        title={grund}
                        onChange={(e) => handleRolle(u, e.target.value === 'admin')}
                      >
                        <option value="benutzer">Benutzer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                    <td>{STATUS_LABELS[u.status ?? ''] ?? u.status}</td>
                    <td>{u.enabled ? 'Ja' : 'Nein'}</td>
                    <td>{u.createdAt?.slice(0, 10)}</td>
                    <td>
                      <div className="action-cell">
                        {ichSelbst ? (
                          <span className="eigenes-konto">eigenes Konto</span>
                        ) : loeschKandidat === u.username ? (
                          <>
                            <span className="eigenes-konto">Wirklich löschen?</span>
                            <button
                              className="btn-danger btn-klein"
                              disabled={zeileBusy === u.username}
                              onClick={() => handleLoeschen(u)}
                            >
                              {zeileBusy === u.username ? 'Wird gelöscht…' : 'Ja, löschen'}
                            </button>
                            <button className="btn-secondary btn-klein" onClick={() => setLoeschKandidat(null)}>
                              Abbrechen
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-danger btn-klein"
                            disabled={letzterAdmin || zeileBusy === u.username}
                            title={letzterAdmin ? 'Die letzte Administration kann nicht gelöscht werden.' : undefined}
                            onClick={() => setLoeschKandidat(u.username ?? null)}
                          >
                            Löschen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
