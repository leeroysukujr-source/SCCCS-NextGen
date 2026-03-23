import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import client from '../../api/client'
import './Admin.css'

export default function TwoFactorAudits() {
  const [page, setPage] = useState(1)
  const [perPage] = useState(25)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [successFilter, setSuccessFilter] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async (p = 1) => {
    setLoading(true)
    try {
      let url = `/admin/twofactor/audits?page=${p}&per_page=${perPage}`
      if (start) url += `&start=${encodeURIComponent(start)}`
      if (end) url += `&end=${encodeURIComponent(end)}`
      if (actionFilter) url += `&action=${encodeURIComponent(actionFilter)}`
      if (successFilter) url += `&success=${encodeURIComponent(successFilter)}`
      const res = await client.get(url)
      setItems(res.data.items)
      setTotal(res.data.total)
      setPage(res.data.page)
    } catch (err) {
      console.error('Failed to load audits', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [])

  return (
    <div style={{ padding: 20 }}>
      <h2>Two-Factor Audit Logs</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        <input placeholder="Action (setup, verify_attempt, verify_confirm, disable_attempt)" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
        <select value={successFilter} onChange={(e) => setSuccessFilter(e.target.value)}>
          <option value="">All</option>
          <option value="1">Success</option>
          <option value="0">Failure</option>
        </select>
        <button onClick={() => load(1)}>Apply</button>
        <button onClick={async () => {
          // trigger CSV export
          try {
            let url = `/admin/twofactor/audits/export?per_page=100000`
            if (start) url += `&start=${encodeURIComponent(start)}`
            if (end) url += `&end=${encodeURIComponent(end)}`
            if (actionFilter) url += `&action=${encodeURIComponent(actionFilter)}`
            if (successFilter) url += `&success=${encodeURIComponent(successFilter)}`
            const res = await client.get(url, { responseType: 'blob' })
            const blob = new Blob([res.data], { type: 'text/csv' })
            const urlObj = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = urlObj
            a.download = 'twofactor_audits.csv'
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(urlObj)
          } catch (err) {
            console.error('Export failed', err)
          }
        }}>Export CSV</button>
      </div>
      {loading ? <div>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>User</th>
              <th>Action</th>
              <th>Success</th>
              <th>IP</th>
              <th>User Agent</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id}>
                <td>{it.user_id || '—'}</td>
                <td>{it.action}</td>
                <td>{it.success ? 'Yes' : 'No'}</td>
                <td>{it.ip_address}</td>
                <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.user_agent}</td>
                <td>{new Date(it.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 12 }}>
        <button onClick={() => load(Math.max(1, page - 1))} disabled={page <= 1}>Prev</button>
        <span style={{ margin: '0 8px' }}>Page {page}</span>
        <button onClick={() => load(page + 1)} disabled={items.length < perPage}>Next</button>
      </div>
    </div>
  )
}
