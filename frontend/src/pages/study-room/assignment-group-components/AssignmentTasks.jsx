import React, { useState, useEffect, useRef } from 'react'
import { FiPlus, FiCheckCircle, FiClock, FiAlertCircle, FiUser, FiMoreVertical, FiTrash2, FiEdit3, FiFlag, FiChevronRight, FiCpu, FiLayers, FiActivity } from 'react-icons/fi'
import { groupsAPI } from '../../../api/groups'
import { useSocket } from '../../../contexts/SocketProvider'
import { useAuthStore } from '../../../store/authStore'
import './AssignmentTasks.css'

export default function AssignmentTasks({ groupId }) {
    const { user } = useAuthStore()
    const { socket, status } = useSocket()
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [activeMenuTaskId, setActiveMenuTaskId] = useState(null)

    const columns = ['To Do', 'Doing', 'Done']

    useEffect(() => {
        // Initial fetch
        groupsAPI.getAssignmentGroupTasks(groupId)
            .then(data => {
                setTasks(data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })

        if (!socket) return

        socket.emit('join_assignment_group', { groupId })

        const handleTaskUpdate = () => {
            fetchTasks()
        }

        socket.on('asg_task_updated', handleTaskUpdate)

        const handleClickOutside = () => setActiveMenuTaskId(null)
        window.addEventListener('click', handleClickOutside)

        return () => {
            socket.off('asg_task_updated', handleTaskUpdate)
            window.removeEventListener('click', handleClickOutside)
        }
    }, [groupId, socket])

    const fetchTasks = () => {
        groupsAPI.getAssignmentGroupTasks(groupId).then(setTasks)
    }

    const handleCreateTask = async (e) => {
        if (e) e.preventDefault()
        if (!newTaskTitle.trim()) {
            setIsAdding(false)
            return
        }

        try {
            const task = await groupsAPI.createAssignmentGroupTask(groupId, {
                title: newTaskTitle,
                status: 'To Do'
            })
            setTasks([task, ...tasks])
            setNewTaskTitle('')
            setIsAdding(false)
            if (socket) socket.emit('update_assignment_group_task', { groupId })
        } catch (err) {
            console.error(err)
        }
    }

    const handleUpdateStatus = async (taskId, newStatus) => {
        try {
            // Optimistic update
            const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
            setTasks(updatedTasks)

            await groupsAPI.updateAssignmentGroupTask(taskId, { status: newStatus })
            if (socket) socket.emit('update_assignment_group_task', { groupId })
        } catch (err) {
            console.error(err)
            fetchTasks() // revert
        }
    }

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm("Delete this task?")) return
        try {
            const updatedTasks = tasks.filter(t => t.id !== taskId)
            setTasks(updatedTasks)
            await groupsAPI.deleteAssignmentGroupTask(taskId)
            if (socket) socket.emit('update_assignment_group_task', { groupId })
        } catch (err) {
            console.error(err)
            fetchTasks()
        }
    }

    if (loading) return (
        <div className="nexus-loader-full">
            <div className="nexus-spinner"></div>
            <span>Synchronizing Kanban Grid...</span>
        </div>
    )

    return (
        <div className="assignment-tasks-nexus">
            <header className="tasks-header-premium">
                <div className="header-intel">
                    <FiLayers className="text-indigo-400" />
                    <h2>Logistics Command Center</h2>
                    <div className={`uplink-badge ${status}`}>
                        <span className="pulse-dot"></span>
                        {status.toUpperCase()}
                    </div>
                </div>
                <button className="add-task-nexus-btn" onClick={() => setIsAdding(true)}>
                    <FiPlus /> Deploy New Task
                </button>
            </header>

            <div className="kanban-grid-premium custom-scrollbar">
                {columns.map(col => (
                    <div key={col} className="kanban-sector">
                        <div className="sector-header">
                            <div className="sector-title">
                                <span className={`indicator ${col.toLowerCase().replace(' ', '-')}`}></span>
                                <h3>{col}</h3>
                            </div>
                            <span className="count-badge">{tasks.filter(t => t.status === col).length}</span>
                        </div>

                        <div className="sector-content">
                            {isAdding && col === 'To Do' && (
                                <form className="task-nexus-card adding" onSubmit={handleCreateTask}>
                                    <input
                                        autoFocus
                                        placeholder="Task objective..."
                                        value={newTaskTitle}
                                        onChange={e => setNewTaskTitle(e.target.value)}
                                        onBlur={handleCreateTask}
                                    />
                                    <div className="form-actions">
                                        <button type="submit">Initialize</button>
                                        <button type="button" onClick={() => setIsAdding(false)}>Abort</button>
                                    </div>
                                </form>
                            )}

                            {tasks.filter(t => t.status === col).map(task => (
                                <div key={task.id} className="task-nexus-wrapper">
                                    <div className="task-nexus-card">
                                        <div className="task-card-glow"></div>
                                        <div className="card-top">
                                            <div className="priority-marker low"></div>
                                            <div className="relative menu-container">
                                                <button
                                                    className={`nexus-more-btn ${activeMenuTaskId === task.id ? 'active' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id);
                                                    }}
                                                >
                                                    <FiMoreVertical />
                                                </button>

                                                {activeMenuTaskId === task.id && (
                                                    <div className="nexus-dropdown animate-in zoom-in">
                                                        <div className="dropdown-label">Tactical Move</div>
                                                        {columns.filter(c => c !== task.status).map(c => (
                                                            <button
                                                                key={c}
                                                                onClick={() => handleUpdateStatus(task.id, c)}
                                                                className="dropdown-item"
                                                            >
                                                                <FiChevronRight /> {c}
                                                            </button>
                                                        ))}
                                                        <div className="dropdown-divider"></div>
                                                        <button onClick={() => handleDeleteTask(task.id)} className="dropdown-item danger">
                                                            <FiTrash2 /> Purge Task
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="card-body">
                                            <h4>{task.title}</h4>
                                            <p>{task.description || 'Proceeding as planned...'}</p>
                                        </div>

                                        <div className="card-footer-nexus">
                                            <div className="agent-assignment">
                                                {task.assigned_user_name ? (
                                                    <div className="agent-avatar" title={task.assigned_user_name}>
                                                        {task.assigned_user_name[0].toUpperCase()}
                                                    </div>
                                                ) : (
                                                    <div className="agent-avatar unassigned">
                                                        <FiUser />
                                                    </div>
                                                )}
                                                <span className="agent-name">{task.assigned_user_name?.split(' ')[0] || 'Unassigned'}</span>
                                            </div>

                                            <div className="card-badges">
                                                <div className="badge-icn"><FiActivity size={12} /></div>
                                                <div className="badge-icn"><FiFlag size={12} /></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
