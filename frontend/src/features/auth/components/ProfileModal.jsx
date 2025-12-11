import React, { useState, useRef } from 'react';
import { 
    X, User, Phone, Save, Loader2, Camera, Lock, 
    ShieldCheck, AlertCircle, Upload 
} from 'lucide-react';
import api from '../../../api';
import { changePassword } from '../services/authService';

export default function ProfileModal({ isOpen, onClose, user }) {
    const [activeTab, setActiveTab] = useState('details'); // details, photo, security
    const [loading, setLoading] = useState(false);
    
    // Details State
    const [formData, setFormData] = useState({
        full_name: user?.name || '',
        phone_number: user?.phone_number || '',
        next_of_kin_name: user?.next_of_kin_name || '',
        next_of_kin_phone: user?.next_of_kin_phone || '',
        next_of_kin_relation: user?.next_of_kin_relation || ''
    });

    // Password State
    const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    
    // Image State
    const [preview, setPreview] = useState(user?.profile_image || null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    // --- HANDLERS ---

    const handleUpdateDetails = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Include profile image in the update if changed
            const payload = { ...formData, profile_image: preview };
            await api.put('/api/auth/profile', payload);
            alert("Profile Details Updated Successfully!");
            window.location.reload();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passForm.newPassword !== passForm.confirmPassword) return alert("New passwords do not match!");
        if (passForm.newPassword.length < 6) return alert("Password must be at least 6 characters.");
        
        setLoading(true);
        try {
            await changePassword({ 
                oldPassword: passForm.currentPassword, 
                newPassword: passForm.newPassword 
            });
            alert("Password Changed Successfully! Please login again.");
            onClose();
            window.location.href = '/'; // Force logout
        } catch (err) {
            alert(err.response?.data?.error || "Failed to change password.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) return alert("Image too large. Max 2MB.");
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    // --- RENDER ---

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <User className="text-indigo-600" size={20}/> Manage Profile
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20} className="text-slate-500"/></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                    <button onClick={() => setActiveTab('details')} className={`flex-1 py-3 text-sm font-bold transition ${activeTab === 'details' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>Personal Details</button>
                    <button onClick={() => setActiveTab('photo')} className={`flex-1 py-3 text-sm font-bold transition ${activeTab === 'photo' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>Profile Picture</button>
                    <button onClick={() => setActiveTab('security')} className={`flex-1 py-3 text-sm font-bold transition ${activeTab === 'security' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>Security</button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    
                    {/* 1. DETAILS TAB */}
                    {activeTab === 'details' && (
                        <form onSubmit={handleUpdateDetails} className="space-y-4">
                            <div className="space-y-3">
                                <div><label className="text-xs font-bold text-slate-500 uppercase">Full Name</label><input className="w-full border p-2.5 rounded-xl text-sm" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} /></div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label><input className="w-full border p-2.5 rounded-xl text-sm" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} /></div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-100">
                                <p className="text-xs font-bold text-indigo-600 mb-3 uppercase flex items-center gap-1"><Phone size={14}/> Next of Kin</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2"><input placeholder="Full Name" className="w-full border p-2.5 rounded-xl text-sm" value={formData.next_of_kin_name} onChange={e => setFormData({...formData, next_of_kin_name: e.target.value})} /></div>
                                    <div><input placeholder="Phone" className="w-full border p-2.5 rounded-xl text-sm" value={formData.next_of_kin_phone} onChange={e => setFormData({...formData, next_of_kin_phone: e.target.value})} /></div>
                                    <div><input placeholder="Relation" className="w-full border p-2.5 rounded-xl text-sm" value={formData.next_of_kin_relation} onChange={e => setFormData({...formData, next_of_kin_relation: e.target.value})} /></div>
                                </div>
                            </div>

                            <button disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 mt-4">
                                {loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Save Changes</>}
                            </button>
                        </form>
                    )}

                    {/* 2. PHOTO TAB */}
                    {activeTab === 'photo' && (
                        <div className="flex flex-col items-center justify-center space-y-6 py-4">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full border-4 border-indigo-100 overflow-hidden shadow-xl">
                                    {preview ? (
                                        <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400"><User size={48}/></div>
                                    )}
                                </div>
                                <button onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2.5 rounded-full shadow-lg hover:bg-indigo-700 transition border-2 border-white">
                                    <Camera size={18} />
                                </button>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                            
                            <div className="text-center max-w-xs">
                                <h4 className="font-bold text-slate-800">Change Profile Photo</h4>
                                <p className="text-xs text-slate-500 mt-1">Click the camera icon to upload a new photo. Max size 2MB.</p>
                            </div>

                            <button onClick={handleUpdateDetails} disabled={loading || !preview} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-black transition flex items-center gap-2">
                                {loading ? <Loader2 className="animate-spin" size={16}/> : <><Upload size={16}/> Update Photo</>}
                            </button>
                        </div>
                    )}

                    {/* 3. SECURITY TAB */}
                    {activeTab === 'security' && (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 mb-4">
                                <div className="text-amber-600"><AlertCircle size={20} /></div>
                                <p className="text-xs text-amber-800 leading-relaxed">For security, you will be logged out after changing your password. Use a strong password with at least 6 characters.</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Current Password</label>
                                <div className="relative">
                                    <input type="password" required className="w-full border p-2.5 pl-10 rounded-xl text-sm" placeholder="••••••" value={passForm.currentPassword} onChange={e => setPassForm({...passForm, currentPassword: e.target.value})} />
                                    <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">New Password</label>
                                    <input type="password" required className="w-full border p-2.5 rounded-xl text-sm" placeholder="••••••" value={passForm.newPassword} onChange={e => setPassForm({...passForm, newPassword: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Confirm New</label>
                                    <input type="password" required className="w-full border p-2.5 rounded-xl text-sm" placeholder="••••••" value={passForm.confirmPassword} onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})} />
                                </div>
                            </div>

                            <button disabled={loading} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200 flex justify-center items-center gap-2 mt-4">
                                {loading ? <Loader2 className="animate-spin" size={18}/> : <><ShieldCheck size={18}/> Update Password</>}
                            </button>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}