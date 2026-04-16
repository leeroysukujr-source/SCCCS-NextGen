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
import Highlight from '@tiptap/extension-highlight';
import { Extension } from '@tiptap/core';

// Custom FontSize Extension
export const FontSize = Extension.create({
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

export const getExtensions = (ydoc, provider, user) => [
    StarterKit.configure({
        history: false, // Yjs handles history
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
            color: user?.color || '#' + Math.floor(Math.random() * 16777215).toString(16),
        },
    }),
    Underline,
    TextAlign.configure({
        types: ['heading', 'paragraph'],
    }),
    TextStyle, // Essential for Color and FontSize
    Color.configure({
        types: ['textStyle'],
    }),
    FontFamily.configure({
        types: ['textStyle'],
    }),
    FontSize,
    Highlight.configure({
        multicolor: true,
    }),
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
];
