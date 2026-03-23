import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaPlus, FaTrash, FaDownload, FaUpload, FaSave } from 'react-icons/fa'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import '../index.css'
import './GpaCalculator.css'
import { gradeToPoints, calculateGPA, SCALES } from '../utils/gpa'
import { gpaAPI } from '../api/gpa'
import { useNotify } from '../components/NotificationProvider'

function blankCourse(id) {
  return { id, name: '', credits: 3, grade: '', planned: false }
}

export default function GpaCalculator() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [scaleKey, setScaleKey] = useState('4.0')
  const [nextId, setNextId] = useState(1)
  const storageKey = 'gpa_calculator_data_v1'
  const notify = useNotify()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        setCourses(parsed.courses || [])
        setScaleKey(parsed.scaleKey || '4.0')
        setNextId((parsed.courses || []).reduce((m, c) => Math.max(m, c.id), 0) + 1)
      } else {
        setCourses([blankCourse(1)])
        setNextId(2)
      }
    } catch (err) {
      setCourses([blankCourse(1)])
      setNextId(2)
    }
  }, [])

  // Load saved GPA from server if available
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await gpaAPI.getGpa()
        if (!mounted) return
        if (res && res.data) {
          const payload = res.data
          // payload may be object with courses/scaleKey
          const coursesFromServer = payload.courses || payload.data?.courses || []
          const scaleFromServer = payload.scaleKey || payload.data?.scaleKey || '4.0'
          if (Array.isArray(coursesFromServer) && coursesFromServer.length) {
            setCourses(coursesFromServer)
            setScaleKey(scaleFromServer)
            setNextId(coursesFromServer.reduce((m, c) => Math.max(m, c.id || 0), 0) + 1)
            notify('success', 'Loaded saved GPA data')
          }
        }
      } catch (err) {
        // ignore errors (user may be offline/not logged in)
        console.warn('[GPA] Failed to load server data', err)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const payload = { courses, scaleKey }
    localStorage.setItem(storageKey, JSON.stringify(payload))
  }, [courses, scaleKey])

  const addCourse = () => {
    setCourses((s) => [...s, blankCourse(nextId)])
    setNextId((n) => n + 1)
  }

  const removeCourse = (id) => {
    setCourses((s) => s.filter(c => c.id !== id))
  }

  const updateCourse = (id, patch) => {
    setCourses((s) => s.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  const resetAll = () => {
    if (!confirm('Clear all courses and reset calculator?')) return
    setCourses([blankCourse(1)])
    setNextId(2)
    setScaleKey('4.0')
    localStorage.removeItem(storageKey)
  }

  const exportJSON = () => {
    const data = { courses, scaleKey }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gpa-data.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const saveToServer = async () => {
    setSaving(true)
    try {
      const payload = { courses, scaleKey }
      await gpaAPI.saveGpa(payload)
      notify('success', 'GPA data saved')
    } catch (err) {
      console.error('[GPA] Save failed', err)
      notify('error', 'Failed to save GPA data')
    } finally {
      setSaving(false)
    }
  }

  const importJSON = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = (file.name || '').toLowerCase()

    // If Excel file, parse as binary then using XLSX
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
          // Map JSON rows to courses using keys heuristics
          const parsedCourses = json.map((row, idx) => {
            const keys = Object.keys(row).reduce((acc, k) => { acc[k.trim().toLowerCase()] = k; return acc }, {})
            const name = row[keys['name'] || keys['course'] || keys['title']] || ''
            const credits = Number(row[keys['credits'] || keys['credit'] || keys['cr']] || 3)
            const grade = row[keys['grade'] || keys['score'] || keys['mark']] || ''
            const plannedRaw = row[keys['planned'] || keys['is_planned'] || keys['planned?']] || ''
            const planned = String(plannedRaw).toLowerCase() === 'true' || String(plannedRaw) === '1' || String(plannedRaw).toLowerCase() === 'yes'
            return { id: nextId + idx, name, credits, grade, planned }
          })
          if (parsedCourses.length) {
            setCourses(parsedCourses)
            setNextId(nextId + parsedCourses.length)
            notify('success', 'Imported Excel file')
            return
          }
        } catch (err) {
          console.error('[GPA] Excel import failed', err)
          alert('Failed to parse Excel file')
        }
      }
      reader.readAsArrayBuffer(file)
      e.target.value = null
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result

      // 1) Try parse as JSON (object with `courses` or array of courses)
      try {
        const parsed = JSON.parse(text)
        let coursesArr = []
        if (Array.isArray(parsed)) {
          coursesArr = parsed
        } else if (parsed && Array.isArray(parsed.courses)) {
          coursesArr = parsed.courses
        }

        if (coursesArr.length) {
          setCourses(coursesArr)
          setScaleKey(parsed?.scaleKey || '4.0')
          setNextId(coursesArr.reduce((m, c) => Math.max(m, c.id || 0), 0) + 1)
          return
        }
      } catch (err) {
        // not JSON - continue to next strategies
      }

      // 2) Try to extract an embedded JSON snippet (object or array) from the text
      const firstBracket = text.indexOf('[')
      const firstBrace = text.indexOf('{')
      if (firstBracket !== -1 || firstBrace !== -1) {
        try {
          const start = firstBracket !== -1 ? firstBracket : firstBrace
          const end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'))
          if (end > start) {
            const snippet = text.substring(start, end + 1)
            const parsed2 = JSON.parse(snippet)
            if (Array.isArray(parsed2)) {
              setCourses(parsed2)
              setNextId(parsed2.reduce((m, c) => Math.max(m, c.id || 0), 0) + 1)
              return
            }
            if (parsed2 && Array.isArray(parsed2.courses)) {
              setCourses(parsed2.courses)
              setScaleKey(parsed2?.scaleKey || '4.0')
              setNextId(parsed2.courses.reduce((m, c) => Math.max(m, c.id || 0), 0) + 1)
              return
            }
          }
        } catch (err) {
          // ignore and continue
        }
      }

      // 3) CSV parsing fallback using PapaParse for robust CSV handling
      try {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
        if (parsed && parsed.data && parsed.data.length) {
          const parsedCourses = parsed.data.map((row, idx) => {
            const keys = Object.keys(row).reduce((acc, k) => { acc[k.trim().toLowerCase()] = k; return acc }, {})
            const name = row[keys['name'] || keys['course'] || keys['title']] || ''
            const credits = Number(row[keys['credits'] || keys['credit'] || keys['cr']] || 3)
            const grade = row[keys['grade'] || keys['score'] || keys['mark']] || ''
            const plannedRaw = row[keys['planned'] || keys['is_planned'] || keys['planned?']] || ''
            const planned = String(plannedRaw).toLowerCase() === 'true' || String(plannedRaw) === '1' || String(plannedRaw).toLowerCase() === 'yes'
            return { id: nextId + idx, name, credits, grade, planned }
          })
          if (parsedCourses.length) {
            setCourses(parsedCourses)
            setNextId(nextId + parsedCourses.length)
            notify('success', 'Imported CSV file')
            return
          }
        }
      } catch (err) {
        // fall back to earlier simple parsing if Papa fails
        console.warn('[GPA] PapaParse failed, falling back to simple CSV parse', err)
      }

      // If all strategies fail, notify the user
      alert('Failed to import file: unsupported or unrecognized format. The importer attempted JSON, embedded JSON, and CSV parsing.')
    }

    // Always read as text to allow broad compatibility
    reader.readAsText(file)
    // reset input so same file can be selected again
    e.target.value = null
  }

  const totals = calculateGPA(courses, scaleKey)

  return (
    <div className="gpa-page">
      <header className="gpa-header">
        <h1>GPA Calculator</h1>
        <div className="gpa-actions">
          <button className="btn" onClick={() => navigate(-1)}>Back</button>
          <button className="btn btn-primary" onClick={addCourse}><FaPlus /> Add Course</button>
          <button className="btn" onClick={exportJSON}><FaDownload /> Export</button>
          <label className="btn" title="Import GPA file (any type)">
            <FaUpload /> Import <input type="file" onChange={importJSON} style={{ display: 'none' }} />
          </label>
          <button className="btn" onClick={saveToServer} title="Save to server"><FaSave /> {saving ? 'Saving...' : 'Save'}</button>
          <button className="btn btn-danger" onClick={resetAll}><FaTrash /> Reset</button>
        </div>
      </header>

      <section className="gpa-controls">
        <div className="control-row">
          <label>Grading Scale:</label>
          <select value={scaleKey} onChange={(e) => setScaleKey(e.target.value)}>
            {Object.keys(SCALES).map(k => (
              <option key={k} value={k}>{k} scale</option>
            ))}
          </select>
          <div className="spacer" />
          <div className="summary">
            <div>Credits: <strong>{totals.totalCredits}</strong></div>
            <div>GPA: <strong>{isNaN(totals.gpa) ? '—' : totals.gpa.toFixed(3)}</strong></div>
          </div>
        </div>
      </section>

      <section className="gpa-table">
        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Credits</th>
              <th>Grade (letter or number)</th>
              <th>Points</th>
              <th>Planned</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => {
              const points = gradeToPoints(course.grade, scaleKey)
              return (
                <tr key={course.id} className={course.planned ? 'planned' : ''}>
                  <td>
                    <input type="text" value={course.name} onChange={(e) => updateCourse(course.id, { name: e.target.value })} placeholder="Course name" />
                  </td>
                  <td>
                    <input type="number" min="0" step="0.5" value={course.credits} onChange={(e) => updateCourse(course.id, { credits: Number(e.target.value) || 0 })} />
                  </td>
                  <td>
                    <input type="text" value={course.grade} onChange={(e) => updateCourse(course.id, { grade: e.target.value.trim() })} placeholder="A, A-, 92" />
                  </td>
                  <td>{isNaN(points) ? '—' : points.toFixed(2)}</td>
                  <td>
                    <input type="checkbox" checked={!!course.planned} onChange={(e) => updateCourse(course.id, { planned: e.target.checked })} />
                  </td>
                  <td>
                    <button className="btn btn-icon" onClick={() => removeCourse(course.id)} title="Remove"><FaTrash /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="gpa-results">
        <div className="results-left">
          <h3>Results</h3>
          <div className="result-row"><span>Total Credits</span><strong>{totals.totalCredits}</strong></div>
          <div className="result-row"><span>Earned Credits</span><strong>{totals.earnedCredits}</strong></div>
          <div className="result-row"><span>GPA</span><strong>{isNaN(totals.gpa) ? '—' : totals.gpa.toFixed(3)}</strong></div>
          <div className="result-row"><span>Planned GPA (if counted)</span><strong>{isNaN(totals.gpaWithPlanned) ? '—' : totals.gpaWithPlanned.toFixed(3)}</strong></div>
        </div>
        <div className="results-right">
          <h3>GPA Distribution</h3>
          <div className="chart">
            {/* Simple bars for points */}
            {courses.map(c => {
              const p = gradeToPoints(c.grade, scaleKey)
              const height = isNaN(p) ? 4 : Math.max(4, (p / 4.3) * 100)
              return (
                <div key={c.id} className="chart-bar" title={`${c.name || '-'}: ${isNaN(p) ? '—' : p.toFixed(2)}`} style={{ height: `${height}px` }}>
                  <div className="bar-label">{c.name || 'Course'}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
