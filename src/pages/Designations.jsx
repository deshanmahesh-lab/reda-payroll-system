import React, { useState, useEffect } from 'react';
import { Plus, Star, ArrowLeft, Pencil, Trash2, X, RefreshCcw, Briefcase, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';

const { ipcRenderer } = window.require('electron');

const Designations = () => {
  const navigate = useNavigate();
  const [designations, setDesignations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', department: 'SECURITY', daily_rate: '' });
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  
  // Tabs for Departments (New Update)
  const [activeTab, setActiveTab] = useState('SECURITY'); 

  // Delete Confirmation State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [confirmMode, setConfirmMode] = useState('DEACTIVATE');

  // Reload data when Tab or Status changes
  useEffect(() => { fetchDesignations(); }, [statusFilter, activeTab]);

  const fetchDesignations = async () => {
    try {
      const response = await ipcRenderer.invoke('get-designations', { status: statusFilter });
      if (response.success) {
        // Filter designations based on the Active Tab
        const filtered = response.data.filter(d => d.department === activeTab);
        setDesignations(filtered);
      }
    } catch (error) { toast.error("Error loading data"); }
  };

  const handleAddNew = () => {
    setEditingId(null);
    // Set default department based on active tab
    setFormData({ title: '', department: activeTab, daily_rate: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ title: item.title, department: item.department, daily_rate: item.daily_rate ?? '' });
    setIsModalOpen(true);
  };

  // Delete Handlers
  const handleDeactivateClick = (id) => {
    setDeleteId(id);
    setConfirmMode('DEACTIVATE');
    setIsDeleteConfirmOpen(true);
  };

  const handleReactivateClick = (id) => {
    setDeleteId(id);
    setConfirmMode('REACTIVATE');
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      const response = confirmMode === 'REACTIVATE'
        ? await ipcRenderer.invoke('reactivate-designation', deleteId)
        : await ipcRenderer.invoke('delete-designation', deleteId);

      if (response.success) { toast.success(response.message || 'Done'); fetchDesignations(); }
      else { toast.error(response.message || 'Failed'); }
    } catch(err) { toast.error("Error deleting"); }
    setDeleteId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Ensure department matches active tab logic if needed, or trust user input
      const payload = {
        ...formData,
        department: activeTab, // Force department to current tab to avoid errors
        daily_rate: activeTab === 'OFFICE' ? 0 : Number(formData.daily_rate || 0)
      };

      let response;
      if (editingId) {
        response = await ipcRenderer.invoke('update-designation', { ...payload, id: editingId });
      } else {
        response = await ipcRenderer.invoke('add-designation', payload);
      }
      if (response.success) {
        toast.success(response.message);
        setIsModalOpen(false);
        fetchDesignations();
      } else { toast.error(response.message); }
    } catch (error) { toast.error("Error saving"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 transition-colors duration-300 text-slate-900 dark:text-white font-sans">
      
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={confirmMode === 'REACTIVATE' ? 'Re-activate Designation?' : 'Deactivate Designation?'}
        message={confirmMode === 'REACTIVATE'
          ? 'Are you sure you want to re-activate this designation?'
          : 'Are you sure you want to deactivate this designation? You can restore it later.'}
        confirmText={confirmMode === 'REACTIVATE' ? 'Yes, Restore' : 'Yes, Deactivate'}
        isDangerous={confirmMode !== 'REACTIVATE'}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition"><ArrowLeft /></button>
          <div><h1 className="text-2xl font-bold">Designations</h1><p className="text-sm opacity-60">Manage Job Titles & Rates</p></div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[80vh]">
        
        {/* TABS (New Feature) */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
            {[
                { id: 'SECURITY', label: 'Security Staff', icon: <Shield size={16}/>, color: 'text-blue-600' },
                { id: 'CLEANING', label: 'Cleaning Staff', icon: <Briefcase size={16}/>, color: 'text-emerald-600' },
                { id: 'OFFICE', label: 'Office Staff', icon: <Users size={16}/>, color: 'text-purple-600' }
            ].map(tab => (
                <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all 
                    ${activeTab === tab.id 
                        ? `${tab.color} border-current bg-slate-50 dark:bg-slate-800` 
                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>

        {/* Filters & Add Button */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
          <div className="flex gap-2">
             <button onClick={() => setStatusFilter('ACTIVE')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${statusFilter === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>Active</button>
             <button onClick={() => setStatusFilter('INACTIVE')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${statusFilter === 'INACTIVE' ? 'bg-red-100 text-red-700' : 'text-slate-400'}`}>Inactive</button>
          </div>
          <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg transition-all">
            <Plus size={18} /> New {activeTab === 'OFFICE' ? 'Position' : 'Designation'}
          </button>
        </div>

        {/* Table List */}
        <div className="overflow-y-auto flex-1 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {designations.length === 0 && (
                    <div className="col-span-full text-center py-10 text-slate-400">No designations found for {activeTab}</div>
                )}
                {designations.map((item) => (
                <div key={item.id} className={`p-4 rounded-xl border transition-all hover:shadow-md ${item.status === 'ACTIVE' ? 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700' : 'bg-red-50 dark:bg-red-900/10 border-red-100 opacity-70'}`}>
                    <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${activeTab === 'SECURITY' ? 'bg-blue-50 text-blue-600' : activeTab === 'CLEANING' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                            <Star size={20}/>
                        </div>
                        <div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-200">{item.title}</h3>
                        {activeTab !== 'OFFICE' ? (
                            <p className="text-xs text-slate-500">Rate: {item.daily_rate} LKR</p>
                        ) : (
                            <p className="text-xs text-slate-500">Monthly Salary Based</p>
                        )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil size={16}/></button>
                        {statusFilter === 'INACTIVE' ? (
                            <button onClick={() => handleReactivateClick(item.id)} className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"><RefreshCcw size={16}/></button>
                        ) : (
                            <button onClick={() => handleDeactivateClick(item.id)} className="p-1.5 text-orange-700 hover:bg-orange-50 rounded-lg"><Trash2 size={16}/></button>
                        )}
                    </div>
                    </div>
                </div>
                ))}
            </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 border dark:border-slate-700">
            <div className="flex items-center justify-between mb-4 border-b dark:border-slate-800 pb-4">
              <h2 className="text-xl font-bold">{editingId ? 'Edit' : 'Add'} {activeTab} Position</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Title</label>
                <input className="w-full mt-1 p-3 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} autoFocus placeholder="Ex: Supervisor" />
              </div>
              
              {/* Hide Daily Rate input for Office Staff */}
              {activeTab !== 'OFFICE' && (
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Daily Rate (LKR)</label>
                    <input type="number" className="w-full mt-1 p-3 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.daily_rate} onChange={e => setFormData({ ...formData, daily_rate: e.target.value })} />
                  </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium transition hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl text-white bg-blue-900 hover:bg-blue-800 font-medium shadow-lg transition">{loading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Designations;