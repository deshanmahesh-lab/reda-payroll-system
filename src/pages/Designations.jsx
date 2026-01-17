import React, { useState, useEffect } from 'react';
import { Plus, Star, ArrowLeft, Pencil, Trash2, X, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog'; // අලුත් Component එක Import කිරීම

const { ipcRenderer } = window.require('electron');

const Designations = () => {
  const navigate = useNavigate();
  const [designations, setDesignations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', department: 'SECURITY', daily_rate: '' });
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  
  // Delete Confirmation සඳහා State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [confirmMode, setConfirmMode] = useState('DEACTIVATE');

  useEffect(() => { fetchDesignations(); }, [statusFilter]);

  const fetchDesignations = async () => {
    try {
      const response = await ipcRenderer.invoke('get-designations', { status: statusFilter });
      if (response.success) setDesignations(response.data);
    } catch (error) { toast.error("Error loading data"); }
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({ title: '', department: 'SECURITY', daily_rate: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ title: item.title, department: item.department, daily_rate: item.daily_rate ?? '' });
    setIsModalOpen(true);
  };

  // Delete බොත්තම එබූ විට Dialog එක විවෘත කිරීම
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

  // ඇත්තටම Delete කිරීම (Confirm කළ පසු)
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
      let response;
      if (editingId) {
        response = await ipcRenderer.invoke('update-designation', { ...formData, id: editingId });
      } else {
        response = await ipcRenderer.invoke('add-designation', formData);
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 transition-colors duration-300 text-slate-900 dark:text-white">
      
      {/* අලුත් Custom Confirm Dialog එක මෙතනට එකතු කිරීම */}
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

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition"><ArrowLeft /></button>
          <div><h1 className="text-2xl font-bold">Designations</h1><p className="text-sm opacity-60">Manage job titles</p></div>
        </div>
        <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg transition-all hover:scale-105">
          <Plus size={20} /> Add Designation
        </button>
      </div>

      <div className="mb-4">
        <div className="inline-flex bg-slate-200 dark:bg-slate-800 rounded-xl p-1">
          <button onClick={() => setStatusFilter('ACTIVE')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${statusFilter === 'ACTIVE' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'opacity-60'}`}>Active Designations</button>
          <button onClick={() => setStatusFilter('INACTIVE')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${statusFilter === 'INACTIVE' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'opacity-60'}`}>Inactive (Archived)</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 opacity-70">
              <th className="p-4">ID</th>
              <th className="p-4">Job Title</th>
              <th className="p-4">Department</th>
              <th className="p-4 text-right">Daily Rate (LKR)</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {designations.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-4 text-sm font-mono opacity-50">#{item.id}</td>
                <td className="p-4 font-medium flex items-center gap-2"><Star size={16} className="text-yellow-500" /> {item.title}</td>
                <td className="p-4"><span className={`px-2 py-1 text-xs font-bold rounded-full ${item.department === 'SECURITY' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.department}</span></td>
                <td className="p-4 text-right font-mono text-sm">{Number(item.daily_rate || 0) ? Number(item.daily_rate || 0).toFixed(2) : '-'}</td>
                <td className="p-4 flex justify-end gap-2">
                  <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg dark:hover:bg-blue-900/20"><Pencil size={18} /></button>
                  {String(statusFilter).toUpperCase() === 'INACTIVE' ? (
                    <button onClick={() => handleReactivateClick(item.id)} className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg dark:hover:bg-emerald-900/20"><RefreshCcw size={18} /></button>
                  ) : (
                    <button onClick={() => handleDeactivateClick(item.id)} className="p-2 text-orange-700 hover:bg-orange-50 rounded-lg dark:hover:bg-orange-900/20"><Trash2 size={18} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl p-6 border dark:border-slate-700">
            <div className="flex items-center justify-between mb-4 border-b dark:border-slate-800 pb-4">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Designation' : 'Add Designation'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Job Title</label>
                <input type="text" required placeholder="e.g. Security Officer" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Department</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500 dark:text-white" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})}>
                  <option value="SECURITY">Security Department</option><option value="CLEANING">Cleaning Department</option><option value="OFFICE">Office Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Daily Rate (LKR)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 1050"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500"
                  value={formData.daily_rate}
                  onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium transition hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-medium shadow-lg shadow-blue-500/30 transition">{loading ? 'Saving...' : 'Save Designation'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Designations;