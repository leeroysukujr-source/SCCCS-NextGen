import React, { useState, useMemo } from 'react'
import '../../pages/VideoBuddy.css'
import './VideoCalendar.css'
import { useQuery } from '@tanstack/react-query'
import { roomsAPI } from '../../api/rooms'

function getMonthMatrix(year, month) {
  // returns array of weeks, each week is array of Date or null
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const matrix = []
  let week = []
  // pad start
  for (let i = 0; i < first.getDay(); i++) week.push(null)
  for (let d = 1; d <= last.getDate(); d++) {
    week.push(new Date(year, month, d))
    if (week.length === 7) { matrix.push(week); week = [] }
  }
  while (week.length < 7) { week.push(null) }
  matrix.push(week)
  return matrix
}

export default function VideoCalendar(){
  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ['rooms', 'calendar'],
    queryFn: roomsAPI.getRooms,
  })

  const now = new Date()
  const [displayYear, setDisplayYear] = useState(now.getFullYear())
  const [displayMonth, setDisplayMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)

  const eventsByDate = useMemo(() => {
    const map = {}
    ;(rooms || []).forEach(r => {
      if (!r.start_time) return
      const d = new Date(r.start_time)
      const key = d.toISOString().slice(0,10)
      map[key] = map[key] || []
      map[key].push(r)
    })
    return map
  }, [rooms])

  const monthMatrix = useMemo(() => getMonthMatrix(displayYear, displayMonth), [displayYear, displayMonth])

  const goPrev = () => {
    if (displayMonth === 0) { setDisplayMonth(11); setDisplayYear(displayYear - 1) }
    else setDisplayMonth(displayMonth - 1)
  }
  const goNext = () => {
    if (displayMonth === 11) { setDisplayMonth(0); setDisplayYear(displayYear + 1) }
    else setDisplayMonth(displayMonth + 1)
  }

  const joinEvent = async (ev) => {
    try {
      if (ev && (ev.id || ev.room_code)) {
        try { await roomsAPI.joinRoom(ev.id || ev.room_code) } catch(e){ /* ignore */ }
        window.location.href = `/meeting/${ev.id || ev.room_code}`
      }
    } catch (err) { console.error(err) }
  }

  return (
    <div className="vb-calendar-root">
      <div className="vb-calendar-header">
        <div className="vb-calendar-title">Calendar</div>
        <div className="vb-calendar-controls">
          <button className="vb-btn" onClick={goPrev}>&larr;</button>
          <div className="vb-calendar-month">{new Date(displayYear, displayMonth).toLocaleString(undefined,{month:'long',year:'numeric'})}</div>
          <button className="vb-btn" onClick={goNext}>&rarr;</button>
        </div>
      </div>

      <div className="vb-calendar-body card">
        {isLoading ? (
          <div className="vb-center">Loading calendar...</div>
        ) : error ? (
          <div className="vb-center">Error loading calendar</div>
        ) : (
          <div className="vb-calendar-grid">
            <div className="vb-weekdays">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="vb-weekday">{d}</div>)}
            </div>
            <div className="vb-dates">
              {monthMatrix.map((week, wi) => (
                <div key={wi} className="vb-week">
                  {week.map((date, di) => {
                    const key = date ? date.toISOString().slice(0,10) : `n-${wi}-${di}`
                    const events = date ? (eventsByDate[key] || []) : []
                    return (
                      <div key={key} className={`vb-day ${date && date.toDateString() === new Date().toDateString() ? 'today' : ''} ${selectedDate === key ? 'selected' : ''}`} onClick={() => date && setSelectedDate(key)}>
                        <div className="vb-day-num">{date ? date.getDate() : ''}</div>
                        <div className="vb-day-events">
                          {events.slice(0,3).map(ev => (
                            <div key={ev.id || ev.room_code} className="vb-event-pill" onClick={(e)=>{e.stopPropagation(); joinEvent(ev)}}>{ev.name || ev.title} <span className="vb-event-time">{ev.start_time ? new Date(ev.start_time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : 'All day'}</span></div>
                          ))}
                          {events.length > 3 && <div className="vb-more">+{events.length-3} more</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="vb-calendar-side card">
        <h4>{selectedDate ? new Date(selectedDate).toDateString() : 'Upcoming events'}</h4>
        {selectedDate ? (
          (eventsByDate[selectedDate] || []).length === 0 ? <div className="vb-empty">No events</div> : (
            (eventsByDate[selectedDate] || []).map(ev => (
              <div key={ev.id || ev.room_code} className="vb-side-event">
                <div className="vb-side-title">{ev.name || ev.title}</div>
                <div className="vb-side-time">{ev.start_time ? new Date(ev.start_time).toLocaleString() : 'All day'}</div>
                <div className="vb-side-actions">
                  <button className="vb-action" onClick={() => joinEvent(ev)}>Join</button>
                  <button className="vb-action" onClick={() => window.location.href = `/meeting/${ev.id || ev.room_code}`}>Open</button>
                </div>
              </div>
            ))
          )
        ) : (
          <div>
            {(rooms || []).slice(0,8).map(ev => (
              <div key={ev.id || ev.room_code} className="vb-side-event">
                <div className="vb-side-title">{ev.name || ev.title}</div>
                <div className="vb-side-time">{ev.start_time ? new Date(ev.start_time).toLocaleString() : 'All day'}</div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}
