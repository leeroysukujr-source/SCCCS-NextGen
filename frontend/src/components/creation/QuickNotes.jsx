import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { FiPlus, FiTrash2, FiEdit3, FiSave, FiX } from 'react-icons/fi';

const QuickNotes = () => {
    const [notes, setNotes] = useState([]);
    const [activeNote, setActiveNote] = useState(null); // { id, title, content }
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/documents/?type=quick_note');
            setNotes(res.data);
        } catch (err) {
            console.error("Failed to fetch notes", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setActiveNote({ id: null, title: '', content: '' });
    };

    const handleSave = async () => {
        if (!activeNote) return;

        const payload = {
            title: activeNote.title || 'Untitled Note',
            content: activeNote.content,
            doc_type: 'quick_note',
            visibility: 'private'
        };

        try {
            if (activeNote.id) {
                await apiClient.put(`/documents/${activeNote.id}`, payload);
            } else {
                await apiClient.post('/documents/', payload);
            }
            setActiveNote(null);
            fetchNotes();
        } catch (err) {
            console.error("Failed to save note", err);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Delete this note?")) return;
        try {
            await apiClient.delete(`/documents/${id}`);
            fetchNotes();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quick Notes</h2>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-shadow shadow-lg shadow-indigo-900/20"
                >
                    <FiPlus /> New Note
                </button>
            </div>

            {activeNote ? (
                <div className="flex-1 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/30 rounded-xl p-6 relative animate-in zoom-in-95 duration-200">
                    <button
                        onClick={() => setActiveNote(null)}
                        className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-black/5 rounded-full"
                    >
                        <FiX />
                    </button>
                    <input
                        className="w-full bg-transparent text-xl font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400/70 border-b border-transparent focus:border-yellow-300 dark:focus:border-yellow-600 focus:outline-none mb-4 pb-2"
                        placeholder="Note Title"
                        value={activeNote.title}
                        onChange={e => setActiveNote({ ...activeNote, title: e.target.value })}
                        autoFocus
                    />
                    <textarea
                        className="w-full h-[calc(100%-80px)] bg-transparent resize-none focus:outline-none text-slate-700 dark:text-slate-300 leading-relaxed font-medium"
                        placeholder="Write your thoughts here..."
                        value={activeNote.content}
                        onChange={e => setActiveNote({ ...activeNote, content: e.target.value })}
                    />
                    <div className="absolute bottom-6 right-6">
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-lg shadow-sm transition-colors"
                        >
                            <FiSave /> Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[200px]">
                    {notes.map(note => (
                        <div
                            key={note.id}
                            onClick={() => setActiveNote(note)}
                            className="group bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-1">{note.title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-5 flex-1 whitespace-pre-wrap">{note.content}</p>
                            <div className="mt-4 flex justify-between items-center text-xs text-slate-400">
                                <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                                <button
                                    onClick={(e) => handleDelete(note.id, e)}
                                    className="p-2 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <FiTrash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {notes.length === 0 && !loading && (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            <FiEdit3 className="text-4xl mb-4 opacity-50" />
                            <p>No quick notes yet. Create one to get started!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuickNotes;
