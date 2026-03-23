import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FiSave, FiArrowLeft, FiPlus, FiDownload, FiGrid, FiTrash2, FiUsers, FiCpu,
    FiPrinter, FiRotateCcw, FiRotateCw, FiSearch, FiDollarSign, FiPercent,
    FiChevronDown, FiBold, FiItalic, FiAlignLeft, FiAlignCenter, FiAlignRight,
    FiFilter, FiMoreVertical, FiMenu, FiTable, FiFileText, FiHash, FiMaximize2
} from 'react-icons/fi';
import apiClient from '../../api/client';
import * as XLSX from 'xlsx';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useAuthStore } from '../../store/authStore';

const DataSheetEditor = ({ docId, onBack, onSuccess, onShare }) => {
    const { user } = useAuthStore();
    const [title, setTitle] = useState('Untitled spreadsheet');
    const [data, setData] = useState([
        ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
        ['1', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['2', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['3', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['4', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['5', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['6', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['7', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['8', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['9', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['10', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['11', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['12', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['13', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['14', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['15', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['16', '', '', '', '', '', '', '', '', '', '', '', ''],
    ]);
    const [saving, setSaving] = useState(false);
    const [collaborators, setCollaborators] = useState([]);
    const [activeCell, setActiveCell] = useState(null); // { r, c }
    const [lastSaved, setLastSaved] = useState(null);

    // Yjs Collaboration
    const { ydoc, provider, yArray } = useMemo(() => {
        const doc = new Y.Doc();
        const roomName = docId ? `sheet-${docId}` : `sheet-new-${user?.id}-${Date.now()}`;
        const wsProvider = new WebsocketProvider('ws://localhost:1234', roomName, doc);
        const array = doc.getArray('sheet-data');
        return { ydoc: doc, provider: wsProvider, yArray: array };
    }, [docId, user?.id]);

    useEffect(() => {
        const observeHandler = () => {
            const currentData = yArray.toArray();
            if (currentData.length > 0) setData(currentData);
        };
        yArray.observe(observeHandler);

        provider.awareness.on('change', () => {
            const states = Array.from(provider.awareness.getStates().values());
            setCollaborators(states.map(s => s.user));
        });

        provider.awareness.setLocalStateField('user', {
            name: user?.username || 'Collaborator',
            color: '#' + Math.floor(Math.random() * 16777215).toString(16)
        });

        return () => {
            yArray.unobserve(observeHandler);
            provider.disconnect();
            ydoc.destroy();
        };
    }, [yArray, provider, ydoc, user?.username]);

    // Initial seed if empty
    useEffect(() => {
        if (yArray.length === 0) yArray.push(data);
    }, []);

    useEffect(() => {
        if (docId && docId !== 'new') {
            apiClient.get(`/documents/${docId}`).then(res => setTitle(res.data.title || 'Untitled spreadsheet'));
        }
    }, [docId]);

    // Simple Formula Evaluator
    const evaluateValue = useCallback((val) => {
        if (typeof val !== 'string' || !val.startsWith('=')) return val;

        try {
            const formula = val.substring(1).toUpperCase();

            // Handle SUM(A1:A5) style
            if (formula.startsWith('SUM(')) {
                const range = formula.match(/\((.*)\)/)?.[1];
                if (!range) return '#ERROR!';
                const values = getRangeValues(range);
                return values.reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
            }

            // Handle AVG(A1:A5)
            if (formula.startsWith('AVG(')) {
                const range = formula.match(/\((.*)\)/)?.[1];
                if (!range) return '#ERROR!';
                const values = getRangeValues(range);
                const sum = values.reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
                return values.length > 0 ? (sum / values.length).toFixed(2) : 0;
            }

            return '#FORMULA!';
        } catch (e) {
            return '#ERR';
        }
    }, [data]);

    const getRangeValues = (range) => {
        const [start, end] = range.split(':');
        if (!end) { // Single cell
            return [getCellValue(start)];
        }

        const startMatch = start.match(/([A-Z]+)(\d+)/);
        const endMatch = end.match(/([A-Z]+)(\d+)/);
        if (!startMatch || !endMatch) return [];

        const startCol = startMatch[1].charCodeAt(0) - 64;
        const startRow = parseInt(startMatch[2]);
        const endCol = endMatch[1].charCodeAt(0) - 64;
        const endRow = parseInt(endMatch[2]);

        const values = [];
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                values.push(data[r]?.[c] || 0);
            }
        }
        return values;
    };

    const getCellValue = (ref) => {
        const match = ref.match(/([A-Z]+)(\d+)/);
        if (!match) return 0;
        const col = match[1].charCodeAt(0) - 64;
        const row = parseInt(match[2]);
        return data[row]?.[col] || 0;
    };

    const handleCellChange = (rIdx, cIdx, value) => {
        const newData = [...data];
        newData[rIdx] = [...newData[rIdx]];
        newData[rIdx][cIdx] = value;
        setData(newData);

        ydoc.transact(() => {
            yArray.delete(0, yArray.length);
            yArray.push(newData);
        });
    };

    const addRow = () => {
        const newRow = [data.length.toString(), ...Array(data[0].length - 1).fill('')];
        const newData = [...data, newRow];
        setData(newData);
        ydoc.transact(() => {
            yArray.delete(0, yArray.length);
            yArray.push(newData);
        });
    };

    const addCol = () => {
        const nextLetter = String.fromCharCode(64 + data[0].length);
        const newData = data.map((row, idx) => {
            if (idx === 0) return [...row, nextLetter];
            return [...row, ''];
        });
        setData(newData);
        ydoc.transact(() => {
            yArray.delete(0, yArray.length);
            yArray.push(newData);
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { title, content: JSON.stringify(data), doc_type: 'data_sheet' };
            if (docId && docId !== 'new') {
                await apiClient.put(`/documents/${docId}`, payload);
            } else {
                const res = await apiClient.post('/documents/', payload);
                if (onSuccess) onSuccess(res.data);
            }
            setLastSaved(new Date());
        } catch (err) { console.error(err); } finally { setSaving(false); }
    };

    const exportToXLSX = () => {
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${title}.xlsx`);
    };

    return (
        <div className="flex flex-col h-full bg-[#f9fbfd] dark:bg-slate-950 font-sans overflow-hidden text-[#444746]">
            {/* Header Section */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-all">
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 text-green-600 cursor-pointer" onClick={onBack}>
                            <FiTable size={32} />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="text-lg font-normal bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1 min-w-[200px]"
                                    placeholder="Untitled spreadsheet"
                                />
                                <button className="p-1 hover:bg-slate-100 rounded text-slate-400">
                                    <FiMaximize2 size={14} />
                                </button>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 -mt-1 ml-1">
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">File</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Edit</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">View</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Insert</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Format</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Data</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Tools</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Extensions</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Help</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-1 mr-2">
                            {collaborators.map((c, i) => (
                                <div key={i} className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-white text-[10px] font-bold border-2 border-white dark:border-slate-900 shadow-sm" title={c?.name} style={{ backgroundColor: c?.color || '#10b981' }}>
                                    {c?.name?.charAt(0).toUpperCase()}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={onShare}
                            className="flex items-center gap-2 bg-[#c2e7ff] hover:bg-[#b3d9f2] text-[#001d35] px-6 py-2 rounded-full font-semibold text-sm transition-all shadow-sm"
                        >
                            <FiUsers size={18} /> Share
                        </button>
                        <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden">
                            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}`} alt="profile" className="h-full w-full object-cover" />
                        </div>
                    </div>
                </div>

                {/* Sub-toolbar */}
                <div className="flex items-center gap-1 px-4 py-1.5 bg-[#edf2fa] dark:bg-slate-800/50 mx-4 mb-2 rounded-full border border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar shadow-sm">
                    <button onClick={() => { }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300"><FiRotateCcw size={16} /></button>
                    <button onClick={() => { }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300"><FiRotateCw size={16} /></button>
                    <button onClick={exportToXLSX} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300"><FiPrinter size={16} /></button>
                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                    <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300"><FiDollarSign size={16} /></button>
                    <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300"><FiPercent size={16} /></button>
                    <button className="flex items-center gap-0.5 px-2 py-1 text-xs font-bold hover:bg-slate-200 rounded-full text-slate-600">.0 <FiHash size={10} /></button>
                    <button className="flex items-center gap-0.5 px-2 py-1 text-xs font-bold hover:bg-slate-200 rounded-full text-slate-600">.00 <FiHash size={10} /></button>
                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                    <button className="flex items-center gap-2 px-3 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-sm font-medium">Default <FiChevronDown size={14} /></button>
                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                    <div className="flex items-center gap-1 px-1">
                        <button className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded">-</button>
                        <input className="w-8 text-center bg-transparent text-sm font-bold focus:outline-none" defaultValue="10" />
                        <button className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded">+</button>
                    </div>

                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                    <div className="flex items-center gap-1">
                        <button className="p-2 rounded-lg hover:bg-slate-200 dark:active:bg-slate-700 transition-colors"><FiBold size={16} /></button>
                        <button className="p-2 rounded-lg hover:bg-slate-200 dark:active:bg-slate-700 transition-colors"><FiItalic size={16} /></button>
                        <button className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex flex-col items-center leading-none">
                            <span className="text-sm font-bold">A</span>
                            <div className="w-3 h-[2px] bg-black"></div>
                        </button>
                    </div>

                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><FiGrid size={16} /></button>
                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><FiAlignCenter size={16} /></button>
                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><FiChevronDown size={14} /></button>

                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1 ml-auto"></div>
                    <button onClick={handleSave} className="flex items-center gap-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">
                        <FiSave size={14} /> {saving ? 'SYNCING' : 'SYNCED'}
                    </button>
                </div>

                {/* Formula Bar */}
                <div className="flex items-center px-2 py-1 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-all font-mono">
                    <div className="w-10 text-center text-xs text-slate-400 font-bold border-r border-slate-100 pr-2">
                        {activeCell ? `${String.fromCharCode(64 + activeCell.c)}${activeCell.r}` : ''}
                    </div>
                    <div className="px-3 flex items-center text-slate-300 hover:text-green-600 cursor-pointer">
                        <span className="text-lg italic font-serif">fx</span>
                    </div>
                    <input
                        value={activeCell ? data[activeCell.r][activeCell.c] : ''}
                        onChange={(e) => activeCell && handleCellChange(activeCell.r, activeCell.c, e.target.value)}
                        placeholder=""
                        className="flex-1 bg-transparent px-3 py-1 text-sm focus:outline-none dark:text-slate-200"
                    />
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-auto bg-[#f9fbfd] dark:bg-slate-950 relative custom-scrollbar select-none">
                <div className="inline-block min-w-full">
                    <div className="flex flex-col">
                        {data.map((row, rIdx) => (
                            <div key={rIdx} className="flex">
                                {row.map((cell, cIdx) => {
                                    const isHeader = rIdx === 0 || cIdx === 0;
                                    const displayValue = isHeader ? cell : evaluateValue(cell);
                                    const isActive = activeCell?.r === rIdx && activeCell?.c === cIdx;

                                    return (
                                        <div key={`${rIdx}-${cIdx}`} className="relative border-r border-b border-[#e1e3e1] dark:border-slate-800">
                                            {isHeader ? (
                                                <div className={`
                                                    w-32 h-6 flex items-center justify-center text-[11px] font-medium transition-colors
                                                    ${rIdx === 0 ? 'bg-[#f8f9fa] dark:bg-slate-800 text-slate-500' : 'w-10 bg-[#f8f9fa] dark:bg-slate-800 text-slate-500'}
                                                    ${(activeCell?.r === rIdx && rIdx !== 0) || (activeCell?.c === cIdx && cIdx !== 0) ? 'bg-[#e7f0fe] text-blue-600' : ''}
                                                `}>
                                                    {cell}
                                                </div>
                                            ) : (
                                                <input
                                                    value={isActive ? cell : displayValue}
                                                    onFocus={() => setActiveCell({ r: rIdx, c: cIdx })}
                                                    onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                                    className={`
                                                        w-32 h-6 px-2 text-[13px] focus:outline-none transition-all
                                                        ${isActive ? 'ring-2 ring-blue-500 z-10 shadow-sm relative b-white dark:bg-slate-900' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'}
                                                        ${!isActive && cell?.toString().startsWith('=') ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}
                                                    `}
                                                />
                                            )}
                                            {isActive && !isHeader && (
                                                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white z-20 cursor-nwse-resize"></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Tabs */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-1 flex items-center px-4 gap-4 shadow-inner">
                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-600">
                    <FiPlus size={16} />
                </button>
                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-600">
                    <FiMenu size={16} />
                </button>
                <div className="flex items-center gap-1">
                    <div className="bg-[#e7f0fe] text-blue-700 px-4 py-1.5 rounded-t-lg text-xs font-bold flex items-center gap-2 border-b-2 border-blue-600 cursor-pointer shadow-sm translate-y-[2px]">
                        Sheet1 <FiChevronDown size={14} />
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-4 text-slate-400">
                    <FiArrowLeft size={16} className="cursor-not-allowed opacity-50" />
                </div>
            </div>
        </div>
    );
};

export default DataSheetEditor;
