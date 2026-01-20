import React, { useState, useEffect } from 'react';
import { Users, Activity, Plus, Pencil, Trash2, ArrowLeft, User, Clock, CheckCircle, AlertTriangle, X, ShieldAlert, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';

const { ipcRenderer } = window.require('electron');

const UserManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('USERS'); 
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', username: '', password: '', role: 'EDITOR', status: 'ACTIVE' });

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, username: '' });

  useEffect(() => {
    if (activeTab === 'USERS') fetchUsers();
    if (activeTab === 'LOGS') fetchLogs();
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const res = await ipcRenderer.invoke('get-system-users');
      if (res.success && Array.isArray(res.data)) setUsers(res.data);
      else setUsers([]);
    } catch (e) { console.error("User Fetch Error:", e); setUsers([]); }
  };

  const fetchLogs = async () => {
    try {
      const res = await ipcRenderer.invoke('get-activity-logs');
      if (res.success && Array.isArray(res.data)) setLogs(res.data);
      else setLogs([]);
    } catch (e) { console.error("Log Fetch Error:", e); setLogs([]); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    let res;
    try {
        if (editingId) res = await ipcRenderer.invoke('update-system-user', { ...formData, id: editingId });
        else res = await ipcRenderer.invoke('add-system-user', formData);

        if (res.success) {
            toast.success(res.message);
            setIsModalOpen(false);
            fetchUsers();
            ipcRenderer.invoke('log-system-activity', { 
                type: editingId ? 'EDIT_USER' : 'ADD_USER', 
                description: `User: ${formData.username} - ${editingId ? 'Updated' : 'Created'}`, 
                user_name: 'Admin' 
            });
        } else {
            toast.error(res.message);
        }
    } catch (error) { toast.error("System Error"); }
  };

  const handleDeleteClick = (id, username) => {
      setDeleteConfirm({ open: true, id, username });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    const res = await ipcRenderer.invoke('delete-system-user', deleteConfirm.id);
    if(res.success) {
      toast.success("User Deleted Successfully");
      fetchUsers();
      ipcRenderer.invoke('log-system-activity', { type: 'DELETE_USER', description: `Deleted user: ${deleteConfirm.username}`, user_name: 'Admin' });
    } else {
        toast.error("Failed to delete user");
    }
    setDeleteConfirm({ open: false, id: null, username: '' });
  };

  const openAdd = () => { setEditingId(null); setFormData({ full_name: '', username: '', password: '', role: 'EDITOR', status: 'ACTIVE' }); setIsModalOpen(true); };
  
  const openEdit = (u) => {
    setEditingId(u.id);
    setFormData({ full_name: u.full_name, username: u.username, password: '', role: u.role, status: u.status });
    setIsModalOpen(true);
  };

  const formatTimeSafe = (dateString) => {
    try { if (!dateString) return 'No Date'; return new Date(dateString).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' }); } catch (error) { return 'Invalid Date'; }
  };

  // --- NEW: PRINT LOGS FUNCTION ---
  const handlePrintLogs = () => {
    if (logs.length === 0) { toast.error("No logs available to print"); return; }
    
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <html>
      <head>
        <title>System Audit Report</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; }
          h1, h3 { text-align: center; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; text-transform: uppercase; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .timestamp { white-space: nowrap; width: 150px; }
          .type { font-weight: bold; width: 120px; }
        </style>
      </head>
      <body>
        <h1>REGIONAL ECONOMIC DEVELOPMENT AGENCY</h1>
        <h3>SYSTEM AUDIT TRAIL REPORT</h3>
        <p style="text-align:center; font-size:10px;">Generated on: ${new Date().toLocaleString()}</p>
        
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Action Type</th>
              <th>Performed By</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(log => `
              <tr>
                <td class="timestamp">${formatTimeSafe(log.timestamp)}</td>
                <td class="type">${log.action_type}</td>
                <td>${log.user_name || 'System'}</td>
                <td>${log.description}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; text-align: center;">
            This is a computer-generated document. No signature required.
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-white flex flex-col h-screen font-sans">
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all border border-slate-100 dark:border-slate-800 group">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"/>
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">User Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Control system access and monitor activity logs.</p>
          </div>
        </div>
        
        <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <button onClick={() => setActiveTab('USERS')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${activeTab==='USERS' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <Users size={18}/> Users
          </button>
          <button onClick={() => setActiveTab('LOGS')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${activeTab==='LOGS' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <Activity size={18}/> Tracking
          </button>
        </div>
      </div>

      {/* USERS TAB CONTENT */}
      {activeTab === 'USERS' && (
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">Registered Users</h2>
            <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all">
                <Plus size={20}/> New User
            </button>
          </div>
          <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur sticky top-0 z-10 text-xs font-bold uppercase text-slate-500 tracking-wider">
                  <tr>
                      <th className="p-5">User Details</th>
                      <th className="p-5">Role Permission</th>
                      <th className="p-5">Account Status</th>
                      <th className="p-5 text-right">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-medium italic">No users found in the system.</td></tr>
                ) : (
                    users.map(u => (
                    <tr key={u.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors duration-200 group">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                 {u.full_name.charAt(0).toUpperCase()}
                             </div>
                             <div>
                                <div className="font-bold text-slate-800 dark:text-slate-100">{u.full_name}</div>
                                <div className="text-sm font-medium text-slate-400 group-hover:text-blue-500 transition-colors">@{u.username}</div>
                             </div>
                          </div>
                        </td>
                        <td className="p-5">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold border ${u.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : u.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                {u.role.replace('_', ' ')}
                            </span>
                        </td>
                        <td className="p-5">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                <span className={`w-2 h-2 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                {u.status}
                            </div>
                        </td>
                        <td className="p-5 text-right">
                         <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(u)} className="p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"><Pencil size={16}/></button>
                            {u.role !== 'SUPER_ADMIN' && (
                                <button onClick={() => handleDeleteClick(u.id, u.username)} className="p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl hover:border-red-500 hover:text-red-600 transition-all shadow-sm"><Trash2 size={16}/></button>
                            )}
                         </div>
                        </td>
                    </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LOGS TAB CONTENT */}
      {activeTab === 'LOGS' && (
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 overflow-hidden flex flex-col relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><Clock size={20} className="text-orange-500"/> System Audit Trail</h2>
            {logs.length > 0 && (
                <button onClick={handlePrintLogs} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                    <Printer size={16}/> Print Report
                </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto pr-4 relative">
            {logs.length > 0 && <div className="absolute left-6 top-2 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 z-0"></div>}

            {(!logs || logs.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 italic gap-2">
                    <ShieldAlert size={40} className="opacity-50"/>
                    <span>No activity logs recorded yet.</span>
                </div>
            ) : (
                <div className="space-y-6 relative z-10">
                {logs.map((log, idx) => {
                     const isDelete = ['DELETE', 'DELETE_USER'].includes(log.action_type);
                     return (
                    <div key={log.id || idx} className="flex items-start gap-4 group">
                        <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm transition-transform group-hover:scale-110 ${isDelete ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isDelete ? <AlertTriangle size={20} strokeWidth={2.5}/> : <CheckCircle size={20} strokeWidth={2.5}/>}
                        </div>
                        <div className="flex-1 bg-slate-50/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${isDelete ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                    {log.action_type}
                                </span>
                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-full border dark:border-slate-700">
                                    <Clock size={12} className="text-orange-400"/> {formatTimeSafe(log.timestamp)}
                                </span>
                            </div>
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed">{log.description || 'No Description'}</div>
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-bold text-slate-500">
                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><User size={12}/></div>
                                Performed by: <span className="text-blue-600 dark:text-blue-400">{log.user_name || 'System'}</span>
                            </div>
                        </div>
                    </div>
                )})}
                </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[450px] p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 relative scale-in-95 animate-in duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800 p-1 rounded-full"><X size={20}/></button>
            
            <div className="mb-6">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                    {editingId ? <Pencil size={24}/> : <Plus size={24}/>}
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{editingId ? 'Edit User Details' : 'Add New User'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Fill in the information below to manage system access.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Full Name</label>
                  <input className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required placeholder="e.g. John Doe"/>
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Username</label>
                  <input className={`w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none font-medium transition-all ${editingId ? 'bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'}`} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required disabled={!!editingId} placeholder="e.g. johnd"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block flex justify-between">Password {editingId && <span className="text-orange-500 text-[10px] normal-case font-bold bg-orange-50 px-2 rounded-full">Optional: Leave empty to keep current</span>}</label>
                <input type="password" className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold tracking-widest" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingId} placeholder={editingId ? "••••••••" : "Set a secure password"}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Role</label>
                  <select className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium cursor-pointer" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="ADMIN">Admin</option><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Status</label>
                  <select className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all">{editingId ? 'Update User' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={deleteConfirm.open} 
        onClose={() => setDeleteConfirm({ open: false, id: null, username: '' })} 
        onConfirm={confirmDelete}
        title="Delete User?"
        message={`Are you sure you want to permanently delete the user @${deleteConfirm.username}? This action cannot be undone.`}
        confirmText="Yes, Delete User"
        isDangerous={true}
      />

    </div>
  );
};

export default UserManagement;