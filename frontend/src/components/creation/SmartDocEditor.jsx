import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Mention from '@tiptap/extension-mention';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Extension } from '@tiptap/core';
import tippy from 'tippy.js';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import apiClient from '../../api/client';
import {
    FiTable, FiLink, FiPercent, FiHash, FiPlus, FiCast, FiDownload,
    FiArrowLeft, FiList, FiCheckSquare, FiCode, FiBold, FiItalic, FiSave, FiMaximize2,
    FiUnderline, FiType, FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify, FiPrinter, FiRotateCcw, FiRotateCw,
    FiSearch, FiCornerDownRight, FiMoreHorizontal, FiFileText, FiCalendar, FiMail, FiLayers, FiUsers, FiMessageSquare, FiCpu,
    FiX
} from 'react-icons/fi';
import { useAuthStore } from '../../store/authStore';

// Custom FontSize Extension
const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        }
    },
    addAttributes() {
        return {
            fontSize: {
                default: null,
                parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
                renderHTML: attributes => {
                    if (!attributes.fontSize) {
                        return {}
                    }
                    return {
                        style: `font-size: ${attributes.fontSize}`,
                    }
                },
            },
        }
    },
    addCommands() {
        return {
            setFontSize: fontSize => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run()
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run()
            },
        }
    },
});

const SmartDocEditor = ({ docId, onBack, onSuccess, onShare }) => {
    const { user } = useAuthStore();
    const [title, setTitle] = useState('Untitled Document');
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [collaborators, setCollaborators] = useState([]);
    const [activeTab, setActiveTab] = useState('Tab 1');
    const [showTabs, setShowTabs] = useState(true);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [aiThinking, setAiThinking] = useState(false);
    const [aiPolicy, setAiPolicy] = useState({ enabled: true, ai_enabled: true });

    // New State for UI
    const [activeMenu, setActiveMenu] = useState(null);
    const [outline, setOutline] = useState([]);
    const [zoom, setZoom] = useState(1);
    const [fontSizeInput, setFontSizeInput] = useState('11');
    const [showColorPicker, setShowColorPicker] = useState(false);

    const handleSave = async () => {
        if (!editor) return;
        setSaving(true);
        const content = editor.getHTML();
        const payload = { title, content, doc_type: 'smart_doc', visibility: 'private' };
        try {
            if (docId && docId !== 'new') {
                await apiClient.put(`/documents/${docId}`, payload);
            } else {
                const res = await apiClient.post('/documents/', payload);
                if (onSuccess) onSuccess(res.data);
            }
            setLastSaved(new Date());
        } catch (err) {
            console.error("Failed to save", err);
        } finally {
            setSaving(false);
        }
    };

    const convertToSlides = async () => {
        if (!docId || docId === 'new') {
            alert("Please save your document first.");
            return;
        }
        setSaving(true);
        try {
            const res = await apiClient.post(`/documents/${docId}/convert/presentation`);
            alert("Successfully converted to slides! You can find it in your Library.");
            // Optionally navigate to it
        } catch (err) {
            console.error("Conversion failed", err);
            alert("Failed to convert document.");
        } finally {
            setSaving(false);
        }
    };

    const exportToPdf = () => {
        window.print();
    };

    const handleAiAction = async (task, selection = null) => {
        if (!aiPolicy.ai_enabled) {
            alert("AI features are currently disabled by your workspace administrator.");
            return;
        }
        setAiThinking(true);
        const textToProcess = selection || editor.getText();

        try {
            const endpoint = task === 'summarize' ? '/ai/summarize' : '/ai/suggest';
            const res = await apiClient.post(endpoint, { text: textToProcess });
            const result = res.data.analysis || res.data.summary || res.data.suggestions;

            if (task === 'rewrite') {
                editor.chain().focus().insertContent(`\n\nAI Suggestion:\n${result}`).run();
            } else {
                alert(`AI ${task.toUpperCase()}:\n\n${result}`);
            }
        } catch (e) {
            console.error(e);
            alert("AI service encountered an error.");
        } finally {
            setAiThinking(false);
        }
    };

    // Yjs setup
    const { ydoc, provider, ycomments } = useMemo(() => {
        const doc = new Y.Doc();
        // If we have a docId, use it. Otherwise generate a temporary ID (this case likely handled by parent creating doc first)
        const roomName = docId && docId !== 'new' ? `doc-${docId}` : `doc-new-${Math.random().toString(36).substring(7)}`;

        // Resolve host
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = import.meta.env.VITE_COLLAB_URL || (window.location.hostname === 'localhost' ? 'ws://localhost:1234' : `${protocol}//${window.location.host}/collab`);

        const wsProvider = new WebsocketProvider(host, roomName, doc);
        const commentsArray = doc.getArray('comments');

        return { ydoc: doc, provider: wsProvider, ycomments: commentsArray };
    }, [docId]);

    const [isSynced, setIsSynced] = useState(false);

    useEffect(() => {
        if (provider) {
            const handleSync = (isSynced) => setIsSynced(isSynced);
            provider.on('synced', handleSync);
            return () => provider.off('synced', handleSync);
        }
    }, [provider]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: false,
            }),
            Placeholder.configure({
                placeholder: 'Type @ to insert, or @ to tag someone',
            }),
            Typography,
            Collaboration.configure({
                document: ydoc,
            }),
            CollaborationCursor.configure({
                provider: provider,
                user: {
                    name: user?.username || 'Collaborator',
                    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
                },
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            Color,
            FontFamily,
            FontSize,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            Mention.configure({
                HTMLAttributes: {
                    class: 'mention',
                },
                suggestion: {
                    char: '@',
                    render: () => {
                        let component;
                        let popup;

                        return {
                            onStart: props => {
                                component = new ReactRenderer(CommandList, {
                                    props,
                                    editor: props.editor,
                                });

                                popup = tippy('body', {
                                    getReferenceClientRect: props.clientRect,
                                    appendTo: () => document.body,
                                    content: component.element,
                                    showOnCreate: true,
                                    interactive: true,
                                    trigger: 'manual',
                                    placement: 'bottom-start',
                                });
                            },
                            onUpdate(props) {
                                component.updateProps(props);
                                popup[0].setProps({
                                    getReferenceClientRect: props.clientRect,
                                });
                            },
                            onKeyDown(props) {
                                if (props.event.key === 'Escape') {
                                    popup[0].hide();
                                    return true;
                                }
                                return component.ref?.onKeyDown(props);
                            },
                            onExit() {
                                popup[0].destroy();
                                component.destroy();
                            },
                        };
                    },
                    items: ({ query }) => {
                        return [
                            {
                                title: 'Ask AI', icon: <FiCpu />, command: ({ editor, range }) => {
                                    editor.chain().focus().deleteRange(range).run();
                                    handleAiAction('rewrite');
                                }
                            },
                            { title: 'Heading 1', icon: <FiHash />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run() },
                            { title: 'Heading 2', icon: <FiHash />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run() },
                            { title: 'Bullet List', icon: <FiList />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
                            { title: 'Task List', icon: <FiCheckSquare />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run() },
                            { title: 'Table', icon: <FiTable />, command: ({ editor, range }) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
                            { title: 'Code Block', icon: <FiCode />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
                            { title: 'Math Equation', icon: <FiPercent />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent('$$x^2 + y^2 = z^2$$').run() },
                        ].filter(item => item.title.toLowerCase().startsWith(query.toLowerCase())).slice(0, 10);
                    },
                },
            }),
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[1056px] p-[96px] text-slate-900 dark:text-white',
            },
        },
    });

    // Extract headings for outline
    const updateOutline = useCallback(() => {
        if (!editor) return;
        const headings = [];
        editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'heading') {
                headings.push({
                    level: node.attrs.level,
                    text: node.textContent,
                    pos,
                    id: `heading-${pos}`
                });
            }
        });
        setOutline(headings);
    }, [editor]);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setActiveMenu(null);
            setShowColorPicker(false);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // Template inserters
    const insertTemplate = (type) => {
        if (!editor) return;
        const templates = {
            meeting: `
                <h1>Meeting Notes</h1>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Attendees:</strong> @</p>
                <h2>Agenda</h2>
                <ul><li>[ ] Topic 1</li><li>[ ] Topic 2</li></ul>
                <h2>Action Items</h2>
                <ul data-type="taskList"><li data-type="taskItem" data-checked="false">Task 1</li></ul>
            `,
            email: `
                <h1>Email Draft</h1>
                <p><strong>Subject:</strong> </p>
                <p>Hi [Name],</p>
                <p></p>
                <p>Best regards,</p>
            `,
            project: `
                <h1>Project Proposal</h1>
                <h2>Executive Summary</h2>
                <p></p>
                <h2>Goals</h2>
                <ul><li>Goal 1</li></ul>
            `
        };
        editor.chain().focus().insertContent(templates[type] || '').run();
        updateOutline();
    };

    const menus = {
        file: [
            { label: 'New Document', action: () => window.location.reload() }, // Simple reload for now
            { label: 'Save', action: handleSave },
            { label: 'Export PDF', action: exportToPdf },
            { label: 'Print', action: () => window.print() },
        ],
        edit: [
            { label: 'Undo', action: () => editor?.chain().focus().undo().run() },
            { label: 'Redo', action: () => editor?.chain().focus().redo().run() },
            { label: 'Select All', action: () => editor?.chain().focus().selectAll().run() },
        ],
        view: [
            { label: 'Toggle Fullscreen', action: () => document.documentElement.requestFullscreen().catch(e => console.log(e)) },
            { label: 'Zoom In (+10%)', action: () => setZoom(z => Math.min(z + 0.1, 2)) },
            { label: 'Zoom Out (-10%)', action: () => setZoom(z => Math.max(z - 0.1, 0.5)) },
            { label: 'Reset Zoom', action: () => setZoom(1) },
        ],
        insert: [
            { label: 'Image', action: () => { const url = prompt('Image URL:'); if (url) editor.chain().focus().setImage({ src: url }).run(); } },
            { label: 'Table', action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
            { label: 'Horizontal Rule', action: () => editor.chain().focus().setHorizontalRule().run() },
        ],
        format: [
            { label: 'Bold', action: () => editor.chain().focus().toggleBold().run() },
            { label: 'Italic', action: () => editor.chain().focus().toggleItalic().run() },
            { label: 'Strike', action: () => editor.chain().focus().toggleStrike().run() },
            { label: 'Highlight', action: () => editor.chain().focus().toggleHighlight().run() },
        ]
    };

    useEffect(() => {
        apiClient.get('/features/config').then(res => {
            const policy = res.data.smart_docs || {};
            const globalAi = res.data.ai_assistant?.enabled !== false;
            setAiPolicy({
                enabled: policy.enabled !== false,
                ai_enabled: (policy.config?.ai_enabled !== false) && globalAi
            });
        });
    }, []);




    useEffect(() => {
        provider.on('status', event => console.log('Collaboration status:', event.status));

        provider.awareness.on('change', () => {
            const states = Array.from(provider.awareness.getStates().values());
            setCollaborators(states.map(s => s.user).filter(Boolean));
        });

        // Initialize user awareness
        provider.awareness.setLocalStateField('user', {
            name: user?.username || 'Collaborator',
            color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        });

        // Sync comments from Yjs
        const syncComments = () => {
            setComments(ycomments.toArray());
        };
        ycomments.observe(syncComments);
        syncComments();

        // Listen for content updates to refresh outline
        if (editor) {
            editor.on('update', updateOutline);
        }

        // Initial build
        setTimeout(updateOutline, 500);

        // Sync font size input with editor selection
        const syncFontSize = () => {
            if (!editor) return;
            const size = editor.getAttributes('textStyle').fontSize || '11px';
            setFontSizeInput(size.replace('px', ''));
        };

        if (editor) {
            editor.on('selectionUpdate', syncFontSize);
            editor.on('transaction', syncFontSize);
        }

        return () => {
            if (editor) {
                editor.off('update', updateOutline);
                editor.off('selectionUpdate', syncFontSize);
                editor.off('transaction', syncFontSize);
            }
            ycomments.unobserve(syncComments);
            provider.disconnect();
            ydoc.destroy();
        };
    }, [provider, ydoc, ycomments, editor, updateOutline, user?.username]);

    useEffect(() => {
        // Load initial content from DB if Yjs room is empty/new
        if (docId && docId !== 'new' && editor && isSynced) {
            apiClient.get(`/documents/${docId}`).then(res => {
                setTitle(res.data.title);
                if (editor.isEmpty && res.data.content) {
                    console.log("Loading content from DB into empty editor session");
                    editor.commands.setContent(res.data.content);
                }
            });
        }
    }, [docId, editor, isSynced]);



    if (!editor) return null;

    return (
        <div className="flex flex-col h-full bg-[#f9fbfd] dark:bg-slate-950 font-sans overflow-hidden">
            {/* Top Navigation Bar - Google Docs Style */}
            <div className="flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 text-blue-600 cursor-pointer" onClick={onBack}>
                            <FiFileText size={32} />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="text-lg font-bold bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 min-w-[100px] text-slate-800 dark:text-white"
                                    placeholder="Untitled document"
                                />
                                <button className="p-1 hover:bg-slate-100 rounded text-slate-400">
                                    <FiMaximize2 size={14} />
                                </button>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 -mt-1 ml-1 relative">
                                {['file', 'edit', 'view', 'insert', 'format', 'tools', 'extensions', 'help'].map((menu) => (
                                    <div key={menu} className="relative">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === menu ? null : menu); }}
                                            className={`capitalize px-1.5 py-0.5 rounded cursor-pointer transition-colors text-slate-800 dark:text-slate-200 font-bold ${activeMenu === menu ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                        >
                                            {menu}
                                        </button>
                                        {activeMenu === menu && menus[menu] && (
                                            <div className="absolute top-full left-0 mt-1 min-w-[150px] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 z-50 py-1 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                                                {menus[menu].map((item, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={(e) => { e.stopPropagation(); item.action(); setActiveMenu(null); }}
                                                        className="text-left px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-700 dark:text-slate-200 text-xs"
                                                    >
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <span className="ml-2 text-[10px] text-slate-400 italic pointer-events-none">
                                    {saving ? 'Saving...' : lastSaved ? `Last edit was ${lastSaved.toLocaleTimeString()}` : 'All changes saved'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Live Collaborators List */}
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700 shadow-inner">
                            <div className="flex -space-x-2">
                                {collaborators.map((c, i) => (
                                    <div
                                        key={i}
                                        className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-white text-[10px] font-bold border-2 border-slate-200 dark:border-slate-700 transition-transform hover:-translate-y-1 cursor-pointer"
                                        title={`${c?.name || 'Anonymous'} is editing...`}
                                        style={{ backgroundColor: c?.color || '#6366f1' }}
                                    >
                                        {c?.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col ml-2 pr-1">
                                <span className="text-[10px] font-black text-slate-500 leading-none">
                                    {collaborators.length} ACTIVE
                                </span>
                                <span className="text-[10px] text-blue-500 font-bold leading-none animate-pulse">
                                    LIVE SYNC
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowComments(!showComments)}
                            className={`p-2.5 rounded-full transition-all ${showComments ? 'bg-indigo-100 text-indigo-600 shadow-md scale-110' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600'}`}
                            title="Comments"
                        >
                            <FiMessageSquare size={18} />
                        </button>

                        <button
                            onClick={onShare}
                            className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                        >
                            <FiUsers size={18} className="group-hover:rotate-12 transition-transform" /> Share Workspace
                        </button>

                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] shadow-lg">
                            <div className="h-full w-full rounded-[10px] overflow-hidden bg-white">
                                <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}`} alt="profile" className="h-full w-full object-cover" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Toolbar */}
                <div className="flex items-center gap-1 px-4 py-1.5 bg-[#edf2fa] dark:bg-slate-800/80 mx-4 mb-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-0.5">
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-30"><FiRotateCcw size={16} /></button>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-30"><FiRotateCw size={16} /></button>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => window.print()} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"><FiPrinter size={16} /></button>
                    </div>

                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                    <select
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'p') editor.chain().focus().setParagraph().run();
                            else editor.chain().focus().setHeading({ level: parseInt(val) }).run();
                        }}
                        className="bg-transparent text-[13px] font-bold focus:outline-none cursor-pointer text-slate-800 dark:text-slate-100 px-3 py-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600 appearance-none min-w-[100px]"
                        value={editor.isActive('heading', { level: 1 }) ? '1' : editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : 'p'}
                    >
                        <option value="p">Normal text</option>
                        <option value="1">Heading 1</option>
                        <option value="2">Heading 2</option>
                        <option value="3">Heading 3</option>
                    </select>

                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                    <select
                        onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                        className="bg-transparent text-[13px] font-bold focus:outline-none cursor-pointer text-slate-800 dark:text-slate-100 px-3 py-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600 appearance-none min-w-[120px]"
                        value={editor.getAttributes('textStyle').fontFamily || 'Inter'}
                    >
                        <option value="Inter">Inter (Default)</option>
                        <option value="Arial">Arial</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Tahoma">Tahoma</option>
                        <option value="Impact">Impact</option>
                    </select>

                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                    <div className="flex items-center gap-1 px-1">
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                const currentSize = parseInt(editor.getAttributes('textStyle').fontSize) || 11;
                                const newSize = Math.max(currentSize - 1, 1);
                                editor.chain().focus().setFontSize(`${newSize}px`).run();
                                setFontSizeInput(newSize.toString());
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-all active:scale-90"
                        >
                            -
                        </button>
                        <input
                            type="text"
                            className="w-10 text-center bg-transparent text-[13px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg h-8 transition-colors"
                            value={fontSizeInput}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const size = parseInt(e.target.value);
                                    if (!isNaN(size)) {
                                        editor.chain().focus().setFontSize(`${size}px`).run();
                                        setFontSizeInput(size.toString());
                                    }
                                }
                            }}
                            onChange={(e) => setFontSizeInput(e.target.value)}
                            onBlur={(e) => {
                                const size = parseInt(e.target.value);
                                if (!isNaN(size)) {
                                    editor.chain().focus().setFontSize(`${size}px`).run();
                                    setFontSizeInput(size.toString());
                                }
                            }}
                        />
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                const currentSize = parseInt(editor.getAttributes('textStyle').fontSize) || 11;
                                const newSize = currentSize + 1;
                                editor.chain().focus().setFontSize(`${newSize}px`).run();
                                setFontSizeInput(newSize.toString());
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-all active:scale-90"
                        >
                            +
                        </button>
                    </div>

                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                    <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive('bold') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : ''}`}><FiBold size={16} /></button>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive('italic') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : ''}`}><FiItalic size={16} /></button>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive('underline') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : ''}`}><FiUnderline size={16} /></button>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().unsetAllMarks().unsetFontSize().run()} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300" title="Clear formatting"><FiType size={16} /></button>
                        <div className="relative">
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowColorPicker(!showColorPicker);
                                }}
                                className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex flex-col items-center leading-none transition-all ${showColorPicker ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
                            >
                                <span className={`text-sm font-black ${editor.isActive('textStyle', { color: '#000000' }) ? 'text-black' : ''}`}>A</span>
                                <div className="w-4 h-[3px] rounded-full mt-0.5" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}></div>
                            </button>
                            {/* Color Picker Dropdown */}
                            {showColorPicker && (
                                <div onMouseDown={(e) => e.preventDefault()} className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl shadow-2xl z-50 grid grid-cols-5 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {['#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#4f46e5', '#8b5cf6', '#ec4899', '#94a3b8', '#ffffff'].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                editor.chain().focus().setColor(c).run();
                                                setShowColorPicker(false);
                                            }}
                                            className={`w-6 h-6 rounded-lg border-2 transition-transform hover:scale-110 active:scale-95 ${editor.isActive('textStyle', { color: c }) ? 'border-indigo-500 scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                    <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : ''}`}><FiAlignLeft size={16} /></button>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : ''}`}><FiAlignCenter size={16} /></button>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : ''}`}><FiAlignRight size={16} /></button>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : ''}`}><FiAlignJustify size={16} /></button>
                    </div>

                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                    <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : ''}`}><FiList size={16} /></button>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleTaskList?.().run()} className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive('taskList') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : ''}`}><FiCheckSquare size={16} /></button>
                    </div>

                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                    <button
                        type="button"
                        onClick={() => handleAiAction('summarize')}
                        disabled={aiThinking}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 transition-all font-bold text-[10px] uppercase tracking-wider shadow-sm active:scale-95"
                    >
                        <FiCpu className={aiThinking ? 'animate-spin' : ''} /> {aiThinking ? 'Thinking...' : 'Summarize'}
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        className="ml-auto flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        <FiSave size={14} /> {saving ? 'SYNCING' : 'SYNCED'}
                    </button>
                </div>
            </div>

            {/* Layout Body */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar - Navigation / Outline */}
                <div className={`transition-all duration-300 overflow-hidden border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col ${showTabs ? 'w-64' : 'w-0'}`}>
                    <div className="p-6 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-slate-800 dark:text-white font-medium text-sm">Document tabs</h3>
                            <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"><FiPlus size={16} /></button>
                        </div>

                        <div className="space-y-1">
                            {outline.length === 0 ? (
                                <div className="px-4 py-2 text-xs text-slate-500 font-medium italic">
                                    No headings yet.
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {outline.map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                // Scroll to item
                                                editor.commands.setTextSelection(item.pos);
                                                const element = editor.view.dom.querySelector(`h${item.level}`); // Simple approximation
                                                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }}
                                            className={`w-full text-left px-3 py-1.5 rounded-r-full text-xs font-bold transition-all truncate hover:bg-slate-50 dark:hover:bg-slate-800 ${activeTab === item.id ? 'bg-[#c2e7ff] text-[#001d35]' : 'text-slate-700 dark:text-slate-300'}`}
                                            style={{ paddingLeft: `${item.level * 8 + 4}px` }}
                                        >
                                            {item.text}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="text-[11px] text-slate-400 leading-relaxed italic mt-4 pl-3">
                            Headings you add to the document will appear here.
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto flex flex-col items-center bg-[#f9fbfd] dark:bg-slate-950 px-4 relative custom-scrollbar group">
                    {/* Floating toggle for tabs */}
                    <button
                        onClick={() => setShowTabs(!showTabs)}
                        className={`absolute left-0 top-1/2 -translate-y-1/2 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-r-lg shadow-sm z-10 transition-transform ${showTabs ? 'rotate-180' : 'translate-x-0'}`}
                    >
                        <FiArrowLeft size={16} className="text-slate-400" />
                    </button>

                    {/* Canvas Wrapper */}
                    <div className="max-w-[816px] w-full my-4 flex flex-col gap-4">
                        {/* Quick Templates Buttons */}
                        <div className="flex items-center gap-3 mb-2 animate-in fade-in slide-in-from-top-4 duration-700">
                            <button onClick={() => insertTemplate('project')} className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95">
                                <FiLayers className="text-blue-500" /> Templates
                            </button>
                            <button onClick={() => insertTemplate('meeting')} className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95">
                                <FiCalendar className="text-indigo-500" /> Meeting notes
                            </button>
                            <button onClick={() => insertTemplate('email')} className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95">
                                <FiMail className="text-green-500" /> Email draft
                            </button>
                            <button onClick={() => insertTemplate('project')} className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95">
                                More
                            </button>
                        </div>

                        {/* The "Paper" */}
                        <div
                            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                            className="w-full bg-white dark:bg-slate-900 shadow-[0_1px_3px_rgba(60,64,67,.3),0_4px_8px_3px_rgba(60,64,67,.15)] min-h-[1056px] relative overflow-hidden transition-all duration-200"
                        >
                            {/* Ruler (Decorative) */}
                            <div className="absolute top-0 left-0 right-0 h-8 border-b border-slate-100 flex items-center px-[96px] text-[8px] text-slate-300 font-mono pointer-events-none">
                                <div className="flex-1 flex justify-between">
                                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
                                </div>
                            </div>

                            <EditorContent editor={editor} />
                        </div>
                        <div className="h-20"></div>
                    </div>
                </div>

                {/* Right Sidebar - Logic/AI - Optional? Image doesn't show it but we have it in code */}
                {/* We'll skip it for now to stay close to the image, but keep the space for future */}
                {/* Comments Sidebar (Right) */}
                <div className={`transition-all duration-300 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${showComments ? 'w-80' : 'w-0'} overflow-hidden h-full shrink-0`}>
                    <div className="w-80 h-full flex flex-col p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Comments</h3>
                            <button onClick={() => setShowComments(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"><FiX /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4">
                            {comments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3 opacity-60">
                                    <FiMessageSquare size={40} />
                                    <p className="text-xs font-bold uppercase tracking-widest text-center px-10">Collaborate with context. Select text to add comments.</p>
                                </div>
                            ) : (
                                comments.map(c => (
                                    <div key={c.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-sm transition-all group">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-xs font-black dark:text-white">{c.user}</p>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">Just now</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{c.text}</p>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const input = e.target.elements.commentInput;
                                    if (!input.value.trim()) return;

                                    const newComment = {
                                        id: Date.now(),
                                        user: user?.username || 'Collaborator',
                                        text: input.value,
                                        timestamp: new Date().toISOString()
                                    };

                                    ycomments.push([newComment]);
                                    input.value = '';
                                }}
                                className="flex items-center gap-2"
                            >
                                <input
                                    name="commentInput"
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="Reply or add note..."
                                />
                                <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:scale-105 transition-all">
                                    <FiPlus />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bubble Menu for formatting shortcuts */}
            {editor && (
                <BubbleMenu editor={editor} className="flex bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[20px] p-1.5 shadow-2xl gap-1 border border-white/20 items-center animate-in zoom-in-95 duration-200">
                    <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2.5 rounded-xl hover:bg-white/20 dark:hover:bg-slate-100 transition-all ${editor.isActive('bold') ? 'text-indigo-400' : ''}`}><FiBold /></button>
                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2.5 rounded-xl hover:bg-white/20 dark:hover:bg-slate-100 transition-all ${editor.isActive('italic') ? 'text-indigo-400' : ''}`}><FiItalic /></button>
                    <div className="w-[1px] h-4 bg-white/20 dark:bg-slate-200 mx-1"></div>
                    <button onClick={() => setShowComments(true)} className="p-2.5 rounded-xl hover:bg-white/20 dark:hover:bg-slate-100 transition-all text-orange-400"><FiMessageSquare /></button>
                    <div className="w-[1px] h-4 bg-white/20 dark:bg-slate-200 mx-1"></div>
                    <button onClick={() => alert("AI: Enhancing selection...")} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all font-bold text-[10px] uppercase tracking-widest group">
                        <FiCpu className="group-hover:animate-spin" /> AI Assist
                    </button>
                </BubbleMenu>
            )}
        </div>
    );
};

// Command List Component for Slash Commands
const CommandList = React.forwardRef((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = index => {
        const item = props.items[index];
        if (item) {
            item.command({ editor: props.editor, range: props.range });
        }
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    React.useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === 'ArrowUp') {
                setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
                return true;
            }
            if (event.key === 'ArrowDown') {
                setSelectedIndex((selectedIndex + 1) % props.items.length);
                return true;
            }
            if (event.key === 'Enter') {
                selectItem(selectedIndex);
                return true;
            }
            return false;
        },
    }));

    return (
        <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-2xl p-2 min-w-[220px] overflow-hidden z-[9999]">
            <div className="text-[10px] font-black text-slate-400 p-2 uppercase tracking-widest flex items-center justify-between">
                <span>Quick Blocks</span>
                <span className="text-[8px] bg-slate-100 dark:bg-slate-700 px-1 rounded">ESC to close</span>
            </div>
            {props.items.map((item, index) => (
                <button
                    key={index}
                    onClick={() => selectItem(index)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg text-left transition-all ${index === selectedIndex ? 'bg-indigo-600 text-white shadow-lg scale-105 z-10' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-[1.02]'}`}
                >
                    <div className={`flex items-center justify-center w-6 h-6 rounded ${index === selectedIndex ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{item.icon}</div>
                    <span className="font-bold">{item.title}</span>
                </button>
            ))}
            {props.items.length === 0 && <div className="p-4 text-xs text-slate-400 italic">No matching blocks...</div>}
        </div>
    );
});

export default SmartDocEditor;
