import React, { useState } from 'react';
import { FiUpload, FiX, FiCheck, FiImage } from 'react-icons/fi';
import apiClient from '../api/client';
import { getApiBaseUrl, getFullImageUrl } from '../utils/api';

const LogoUpload = ({ initialLogo, uploadUrl, onUploadSuccess, label = "Upload Logo" }) => {
    const [preview, setPreview] = useState(initialLogo);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);

        // Upload
        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setError(null);

        try {
            const response = await apiClient.post(uploadUrl, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (onUploadSuccess) onUploadSuccess(response.data.logo_url);
        } catch (err) {
            console.error('Logo upload failed:', err);
            setError('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-3">
            <label className="text-sm font-bold text-slate-300">{label}</label>
            <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden transition-all hover:border-indigo-400 group">
                    {preview ? (
                        <img src={getFullImageUrl(preview)} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                    ) : (
                        <FiImage className="text-slate-600 text-2xl group-hover:scale-110 transition-transform group-hover:text-slate-400" />
                    )}

                    {uploading && (
                        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl cursor-pointer hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20">
                        <FiUpload />
                        {uploading ? 'Uploading...' : 'Choose File'}
                        <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={uploading} />
                    </label>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">PNG, JPG, SVG (Max 2MB)</p>
                    {error && <p className="text-xs text-red-400 flex items-center gap-1 font-bold"><FiX /> {error}</p>}
                </div>
            </div>
        </div>
    );
};

export default LogoUpload;
