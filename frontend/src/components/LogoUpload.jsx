import React, { useState, useRef } from 'react';
import { FiUpload, FiX, FiCheck, FiImage, FiSave, FiInfo } from 'react-icons/fi';
import apiClient from '../api/client';
import { getFullImageUrl } from '../utils/api';

const LogoUpload = ({ initialLogo, uploadUrl, onUploadSuccess, label = "Upload Logo" }) => {
    const [preview, setPreview] = useState(initialLogo);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setError('File too large (Max 2MB)');
            return;
        }

        setSelectedFile(file);
        setError(null);

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setError(null);

        try {
            // Step 1: Direct Upload to Supabase Storage
            // We determine the type based on the uploadUrl pattern
            let uploadType = 'workspace-logo';
            let id = null;
            
            if (uploadUrl.includes('/system/logo')) {
                uploadType = 'system-logo';
            } else if (uploadUrl.includes('/workspaces/')) {
                const parts = uploadUrl.split('/');
                id = parts[parts.indexOf('workspaces') + 1];
                uploadType = 'workspace-logo';
            } else if (uploadUrl.includes('/profile/avatar')) {
                uploadType = 'avatar';
            }

            const { uploadToSupabase } = await import('../utils/supabase');
            const publicUrl = await uploadToSupabase(selectedFile, uploadType, id);
            
            // Step 2: Synchronize URL with Backend API
            const response = await apiClient.post(uploadUrl, {
                logo_url: publicUrl
            });
            
            if (onUploadSuccess) {
                onUploadSuccess(response.data.logo_url);
            }
            setSelectedFile(null);
            
            if (response.data.logo_url) {
                setPreview(response.data.logo_url);
            }
        } catch (err) {
            console.error('Logo upload failed:', err);
            setError(err.response?.data?.error || err.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const cancelSelection = () => {
        setSelectedFile(null);
        setPreview(initialLogo);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-3">
            <label className="text-sm font-bold text-slate-300">{label}</label>
            <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden transition-all hover:border-indigo-400 group shadow-xl">
                    {preview ? (
                        <img 
                            src={getFullImageUrl(preview, true)} 
                            alt="Logo Preview" 
                            className="w-full h-full object-contain p-2" 
                        />
                    ) : (
                        <FiImage className="text-slate-600 text-2xl group-hover:scale-110 transition-transform group-hover:text-slate-400" />
                    )}

                    {uploading && (
                        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-4">
                    <div className="flex gap-2">
                        {!selectedFile ? (
                            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl cursor-pointer hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                                <FiUpload />
                                Choose New Logo
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    className="hidden" 
                                    onChange={handleFileChange} 
                                    accept="image/*" 
                                    disabled={uploading} 
                                />
                            </label>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    <FiSave />
                                    {uploading ? 'Saving Branding...' : 'Save & Apply to Platform'}
                                </button>
                                <button 
                                    onClick={cancelSelection}
                                    disabled={uploading}
                                    className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 transition-colors"
                                    title="Cancel"
                                >
                                    <FiX />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Recommended: 512×512px SVG or PNG</p>
                        {error && <p className="text-xs text-red-400 mt-2 flex items-center gap-1 font-bold animate-pulse"><FiX /> {error}</p>}
                        {selectedFile && !uploading && (
                            <p className="text-xs text-amber-400 mt-1 font-medium flex items-center gap-1">
                                <FiInfo size={12} /> Click Save to change logo globally
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogoUpload;

