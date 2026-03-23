
import React, { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket' // For future Segment 5
import { FiMessageSquare, FiPrinter } from 'react-icons/fi'
import './CollaborativeEditor.css'
import DocumentComments from './DocumentComments'

// Generates a random color for the cursor
const getRandomColor = () => {
    const colors = ['#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D']
    return colors[Math.floor(Math.random() * colors.length)]
}

export default function CollaborativeEditor({
    docId,
    initialContent,
    onSave,
    currentUser,
    roomId
}) {
    const [status, setStatus] = useState('disconnected')
    const [showComments, setShowComments] = useState(true)

    // Segment 5: Real-time Collaboration
    // We create a new Y.Doc simply for the editor instance, or better, 
    // we use a persistent Ydoc bound to the room/docId.
    // For TipTap, we usually create the provider inside the component or a wrapper.
    const [provider, setProvider] = useState(null)
    const [ydoc, setYdoc] = useState(null)

    useEffect(() => {
        if (!docId) return

        const ydoc = new Y.Doc()
        // Connect to the collab server
        const wsProvider = new WebsocketProvider(
            'ws://localhost:1234',
            `study-doc-${docId}`,
            ydoc
        )

        wsProvider.on('status', event => {
            setStatus(event.status)
        })

        setYdoc(ydoc)
        setProvider(wsProvider)

        return () => {
            wsProvider.destroy()
            ydoc.destroy()
        }
    }, [docId])

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: false, // History handled by Yjs
            }),
            provider && ydoc ? Collaboration.configure({
                document: ydoc,
            }) : undefined,
            provider ? CollaborationCursor.configure({
                provider: provider,
                user: {
                    name: currentUser?.username || 'Student',
                    color: getRandomColor(),
                },
            }) : undefined,
        ].filter(Boolean), // Filter out undefined if provider is null
        content: null, // Let Yjs handle content
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            onSave(html)
        },
        editorProps: {
            attributes: {
                class: 'editor-content-area',
            },
        },
    }, [provider]) // Re-create editor when provider is ready

    // Handling initial content loading for existing docs is complex with Yjs.
    // Usually Yjs supercedes 'content' prop. 
    // If Yjs doc is empty, we might want to inject `initialContent`.
    // We can do this via a small effect once connected.
    useEffect(() => {
        if (provider && ydoc && initialContent && status === 'connected') {
            // Check if doc is empty (simple check)
            if (ydoc.getText('default').length === 0 && initialContent !== '<p>Start typing...</p>') {
                // In theory we could inject content here, but it's risky for race conditions.
                // For V1, we trust Yjs state. If Yjs is empty but DB has content (from prev edits), 
                // we might lose data if we are not careful.
                // A robust system would load DB content into YDoc on SERVER side or first client.
                // For now, let's assume collaboration starts fresh or persists via Y-server memory/leveldb if configured.
            }
        }
    }, [provider, status, initialContent]) // Simplified for this implementation

    // Update content if docId changes (and we are not in collab mode)
    useEffect(() => {
        if (editor && initialContent && !editor.isFocused) {
            // Only set content if completely clean or doc switched
            // This is tricky with autosave. 
            // Ideally for V1 (Segment 4), we just unmount/remount on doc switch
            editor.commands.setContent(initialContent)
        }
    }, [docId, initialContent, editor])

    if (!editor) {
        return <div className="editor-loading">Loading Editor...</div>
    }

    return (
        <div className="collab-editor-layout">
            <div className="collab-editor-main">
                <div className="collaborative-editor">
                    <div className="editor-menubar">
                        <button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={editor.isActive('bold') ? 'is-active' : ''}
                        >
                            Bold
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={editor.isActive('italic') ? 'is-active' : ''}
                        >
                            Italic
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
                        >
                            H2
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            className={editor.isActive('bulletList') ? 'is-active' : ''}
                        >
                            List
                        </button>
                        <button
                            onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/${docId}/export?format=pdf`, '_blank')}
                            title="Download PDF"
                        >
                            <FiPrinter /> PDF
                        </button>
                        <button
                            onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/${docId}/export?format=docx`, '_blank')}
                            title="Download DOCX"
                            style={{ fontSize: '0.8em', fontWeight: 'bold' }}
                        >
                            DOCX
                        </button>
                        <div style={{ flex: 1 }} />
                        <button
                            onClick={() => setShowComments(!showComments)}
                            className={showComments ? 'is-active' : ''}
                            title="Toggle Comments"
                        >
                            <FiMessageSquare />
                        </button>
                    </div>
                    <EditorContent editor={editor} className="editor-content-area" />
                </div>
            </div>
            {showComments && <DocumentComments docId={docId} />}
        </div>
    )
}
