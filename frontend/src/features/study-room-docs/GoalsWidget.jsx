
import React, { useState, useEffect } from 'react';
import { FiCheckSquare, FiPlus, FiTrash, FiTarget } from 'react-icons/fi';
import './StudyDocsPanel.css'; // Reuse existing styles

export default function GoalsWidget({ roomId }) {
    const [goals, setGoals] = useState([]);
    const [newGoal, setNewGoal] = useState('');

    // Load from local storage (Session Memory)
    useEffect(() => {
        const saved = localStorage.getItem(`study-goals-${roomId}`);
        if (saved) {
            try { setGoals(JSON.parse(saved)); } catch (e) { }
        }
    }, [roomId]);

    useEffect(() => {
        localStorage.setItem(`study-goals-${roomId}`, JSON.stringify(goals));
    }, [goals, roomId]);

    const addGoal = (e) => {
        e.preventDefault();
        if (!newGoal.trim()) return;
        setGoals([...goals, { id: Date.now(), text: newGoal, done: false }]);
        setNewGoal('');
    };

    const toggleGoal = (id) => {
        setGoals(goals.map(g => g.id === id ? { ...g, done: !g.done } : g));
    };

    const deleteGoal = (id) => {
        setGoals(goals.filter(g => g.id !== id));
    };

    return (
        <div className="goals-widget" style={{ padding: '1rem', borderTop: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                <FiTarget style={{ marginRight: '8px', color: '#6366f1' }} />
                Session Goals
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '150px', overflowY: 'auto' }}>
                {goals.map(g => (
                    <li key={g.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', opacity: g.done ? 0.6 : 1 }}>
                        <input
                            type="checkbox"
                            checked={g.done}
                            onChange={() => toggleGoal(g.id)}
                            style={{ marginRight: '8px' }}
                        />
                        <span style={{ flex: 1, textDecoration: g.done ? 'line-through' : 'none', fontSize: '0.9rem' }}>{g.text}</span>
                        <button onClick={() => deleteGoal(g.id)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
                            <FiTrash size={12} />
                        </button>
                    </li>
                ))}
            </ul>

            <form onSubmit={addGoal} style={{ display: 'flex', marginTop: '8px' }}>
                <input
                    type="text"
                    value={newGoal}
                    onChange={e => setNewGoal(e.target.value)}
                    placeholder="Add goal..."
                    style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.9rem' }}
                />
                <button type="submit" style={{ background: 'none', border: 'none', color: '#6366f1', marginLeft: '4px' }}>
                    <FiPlus />
                </button>
            </form>
        </div>
    );
}
