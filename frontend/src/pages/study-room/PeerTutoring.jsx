import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tutoringAPI } from '../../api/tutoring'
import { useAuthStore } from '../../store/authStore'
import { FiSearch, FiUserPlus, FiCalendar, FiClock, FiStar, FiCheck, FiX, FiVideo } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import '../StudyRoom.css'
// reusing StudyRoom css, but we might add inline styles for specific tutor bits

function TutorCard({ tutor, onBook }) {
    return (
        <div className="study-group-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="group-header">
                <div className="group-avatar" style={{ background: 'var(--primary-blue)' }}>
                    {tutor.user?.first_name?.[0] || tutor.user?.username?.[0] || 'T'}
                </div>
                <div>
                    <h3>{tutor.user?.first_name} {tutor.user?.last_name}</h3>
                    <span className="sc-badge">⭐️ {tutor.rating.toFixed(1)} ({tutor.review_count})</span>
                </div>
            </div>
            <div className="group-body">
                <p>{tutor.bio || "No bio provided."}</p>
                <div className="group-tags">
                    {tutor.subjects?.map(sub => (
                        <span key={sub} className="group-tag">{sub.trim()}</span>
                    ))}
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>${tutor.hourly_rate}/hr</span>
                    <button className="join-btn" onClick={() => onBook(tutor)}>Book Session</button>
                </div>
            </div>
        </div>
    )
}

function SessionCard({ session, isTutor, onUpdateStatus }) {
    const navigate = useNavigate()
    const isConfirmed = session.status === 'confirmed'

    return (
        <div className="study-feature-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
                <span className={`sc-badge ${session.status === 'confirmed' ? 'active' : ''}`}>
                    {session.status.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                    {new Date(session.scheduled_at).toLocaleString()}
                </span>
            </div>

            <h4>{session.subject}</h4>
            <p>
                {isTutor ? `Student: ${session.student_name}` : `Tutor: ${session.tutor_name}`}
            </p>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                {isConfirmed && session.meeting_link && (
                    <button className="join-btn" onClick={() => navigate(session.meeting_link)}>
                        <FiVideo /> Join Room
                    </button>
                )}

                {isTutor && session.status === 'pending' && (
                    <>
                        <button className="icon-btn" style={{ color: '#10b981' }} onClick={() => onUpdateStatus(session.id, 'confirmed')} title="Confirm">
                            <FiCheck />
                        </button>
                        <button className="icon-btn" style={{ color: '#ef4444' }} onClick={() => onUpdateStatus(session.id, 'cancelled')} title="Decline">
                            <FiX />
                        </button>
                    </>
                )}

                {session.status !== 'cancelled' && session.status !== 'completed' && (
                    <button className="icon-btn" style={{ color: '#ef4444' }} onClick={() => onUpdateStatus(session.id, 'cancelled')} title="Cancel">
                        <FiX />
                    </button>
                )}
            </div>
        </div>
    )
}

function BookingModal({ tutor, onClose }) {
    const [subject, setSubject] = useState('')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: (data) => tutoringAPI.bookSession(tutor.id, data),
        onSuccess: () => {
            alert('Session requested successfully!')
            queryClient.invalidateQueries(['my-sessions'])
            onClose()
        },
        onError: (err) => alert(err.response?.data?.error || 'Failed to book session')
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!subject || !date || !time) return

        const scheduled_at = new Date(`${date}T${time}`).toISOString()
        mutation.mutate({ subject, scheduled_at })
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '1rem', width: '400px', maxWidth: '90%' }}>
                <h3>Book Session with {tutor.user?.first_name}</h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <input
                        placeholder="Subject (e.g. Calculus I)"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className="modal-input" // Assuming basic styling or standard html input style
                        style={{ padding: '0.5rem', borderRadius: '0.5rem' }}
                    />
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '0.5rem' }}
                    />
                    <input
                        type="time"
                        value={time}
                        onChange={e => setTime(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '0.5rem' }}
                    />
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" className="join-btn" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Booking...' : 'Confirm Request'}
                        </button>
                        <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid #475569', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function PeerTutoring() {
    const [view, setView] = useState('find') // find, become, sessions
    const [search, setSearch] = useState('')
    const [selectedTutor, setSelectedTutor] = useState(null)
    const { user } = useAuthStore()
    const queryClient = useQueryClient()

    // Queries
    const { data: tutors, isLoading: loadingTutors } = useQuery({
        queryKey: ['tutors', search],
        queryFn: () => tutoringAPI.getTutors({ subject: search })
    })

    const { data: sessions, isLoading: loadingSessions } = useQuery({
        queryKey: ['my-sessions'],
        queryFn: () => tutoringAPI.getMySessions(),
        enabled: view === 'sessions'
    })

    // Mutations
    const registerMutation = useMutation({
        mutationFn: tutoringAPI.registerTutor,
        onSuccess: () => {
            alert('Welcome! You are now a tutor.')
            setView('sessions')
        },
        onError: (err) => alert(err.response?.data?.error || 'Registration failed')
    })

    const updateSessionMutation = useMutation({
        mutationFn: ({ id, status }) => tutoringAPI.updateSession(id, status),
        onSuccess: () => queryClient.invalidateQueries(['my-sessions'])
    })

    // Become Tutor Form State
    const [regForm, setRegForm] = useState({ bio: '', subjects: '', hourly_rate: 0 })

    return (
        <div className="study-room-container" style={{ paddingBottom: '3rem' }}>
            <header className="study-room-header">
                <h1>Peer Tutoring</h1>
                <p>Collaborate, teach, and learn from your peers.</p>

                <div className="nav-pills" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
                    <button className={view === 'find' ? 'active' : ''} onClick={() => setView('find')}>
                        <FiSearch /> Find a Tutor
                    </button>
                    <button className={view === 'sessions' ? 'active' : ''} onClick={() => setView('sessions')}>
                        <FiCalendar /> My Sessions
                    </button>
                    <button className={view === 'become' ? 'active' : ''} onClick={() => setView('become')}>
                        <FiUserPlus /> Become a Tutor
                    </button>
                </div>
            </header>

            {view === 'find' && (
                <>
                    <div className="search-bar" style={{ maxWidth: '600px', margin: '0 auto 2rem auto' }}>
                        <FiSearch />
                        <input
                            placeholder="Search by subject (e.g. Physics, Math)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {loadingTutors ? <div className="loading-spinner"></div> : (
                        <div className="study-groups-grid">
                            {tutors?.map(tutor => (
                                <TutorCard
                                    key={tutor.id}
                                    tutor={tutor}
                                    onBook={(t) => setSelectedTutor(t)}
                                />
                            ))}
                            {tutors?.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', opacity: 0.6 }}>No tutors found matching request.</p>}
                        </div>
                    )}
                </>
            )}

            {view === 'become' && (
                <div style={{ maxWidth: '600px', margin: '0 auto', background: '#1e293b99', padding: '2rem', borderRadius: '1rem' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Register as a Tutor</h2>
                    <form onSubmit={(e) => { e.preventDefault(); registerMutation.mutate(regForm); }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Bio</label>
                            <textarea
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                                rows={4}
                                placeholder="Tell students about your expertise..."
                                value={regForm.bio}
                                onChange={e => setRegForm({ ...regForm, bio: e.target.value })}
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Subjects (comma separated)</label>
                            <input
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                                placeholder="Math, Physics, Chemistry"
                                value={regForm.subjects}
                                onChange={e => setRegForm({ ...regForm, subjects: e.target.value })}
                            />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Hourly Rate ($)</label>
                            <input
                                type="number"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                                value={regForm.hourly_rate}
                                onChange={e => setRegForm({ ...regForm, hourly_rate: parseFloat(e.target.value) })}
                            />
                        </div>
                        <button type="submit" className="join-btn" style={{ width: '100%' }} disabled={registerMutation.isPending}>
                            {registerMutation.isPending ? 'Registering...' : 'Submit Application'}
                        </button>
                    </form>
                </div>
            )}

            {view === 'sessions' && (
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    {loadingSessions ? <div className="loading-spinner"></div> : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>Active Learning (Student)</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {sessions?.learning?.length === 0 && <p style={{ opacity: 0.6 }}>No sessions booked yet.</p>}
                                    {sessions?.learning?.map(s => (
                                        <SessionCard
                                            key={s.id}
                                            session={s}
                                            isTutor={false}
                                            onUpdateStatus={(id, status) => updateSessionMutation.mutate({ id, status })}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>Tutoring Requests (Tutor)</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {sessions?.tutoring?.length === 0 && <p style={{ opacity: 0.6 }}>No incoming requests.</p>}
                                    {sessions?.tutoring?.map(s => (
                                        <SessionCard
                                            key={s.id}
                                            session={s}
                                            isTutor={true}
                                            onUpdateStatus={(id, status) => updateSessionMutation.mutate({ id, status })}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectedTutor && (
                <BookingModal
                    tutor={selectedTutor}
                    onClose={() => setSelectedTutor(null)}
                />
            )}
        </div>
    )
}
