import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Building2, ArrowLeft, Pencil, Trash2, X, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog'; // Import

const { ipcRenderer } = window.require('electron');

const Sites = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ site_name: '', location: '', contact_number: '' });
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  // Delete Confirmation States
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [confirmMode, setConfirmMode] = useState('DEACTIVATE');

  useEffect(() => { fetchSites(); }, [statusFilter]);

  const fetchSites = async () => {
    try {
      const response = await ipcRenderer.invoke('get-sites', { status: statusFilter });
      if (response.success) setSites(response.data);
    } catch (error) { toast.error("Error loading data"); }
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({ site_name: '', location: '', contact_number: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (site) => {
    setEditingId(site.id);
    setFormData({ site_name: site.site_name, location: site.location, contact_number: site.contact_number });
    setIsModalOpen(true);
  };

  // Open Delete Dialog
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

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      const response = confirmMode === 'REACTIVATE'
        ? await ipcRenderer.invoke('reactivate-site', deleteId)
        : await ipcRenderer.invoke('delete-site', deleteId);

      if (response.success) { toast.success(response.message || 'Done'); fetchSites(); }
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
        response = await ipcRenderer.invoke('update-site', { ...formData, id: editingId });
      } else {
        response = await ipcRenderer.invoke('add-site', formData);
      }
      if (response.success) {
        toast.success(response.message);
        setIsModalOpen(false);
        fetchSites();
      } else { toast.error(response.message); }
    } catch (error) { toast.error("Something went wrong"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 transition-colors duration-300 text-slate-900 dark:text-white">
      
      {/* Custom Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={confirmMode === 'REACTIVATE' ? 'Re-activate Work Site?' : 'Deactivate Work Site?'}
        message={confirmMode === 'REACTIVATE'
          ? 'Are you sure you want to re-activate this site?'
          : 'Are you sure you want to deactivate this site? You can restore it later.'}
        confirmText={confirmMode === 'REACTIVATE' ? 'Yes, Restore' : 'Yes, Deactivate'}
        isDangerous={confirmMode !== 'REACTIVATE'}
      />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition"><ArrowLeft /></button>
          <div><h1 className="text-2xl font-bold">Site Management</h1><p className="text-sm opacity-60">Manage your locations</p></div>
        </div>
        <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg transition-all hover:scale-105">
          <Plus size={20} /> Add New Site
        </button>
      </div>

      <div className="mb-4">
        <div className="inline-flex bg-slate-200 dark:bg-slate-800 rounded-xl p-1">
          <button onClick={() => setStatusFilter('ACTIVE')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${statusFilter === 'ACTIVE' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'opacity-60'}`}>Active Sites</button>
          <button onClick={() => setStatusFilter('INACTIVE')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${statusFilter === 'INACTIVE' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'opacity-60'}`}>Inactive (Archived)</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 opacity-70">
              <th className="p-4">ID</th>
              <th className="p-4">Site Name</th>
              <th className="p-4">Location</th>
              <th className="p-4">Contact</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sites.map((site) => (
              <tr key={site.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-4 text-sm font-mono opacity-50">#{site.id}</td>
                <td className="p-4 font-medium flex items-center gap-2"><Building2 size={16} className="text-blue-500" /> {site.site_name}</td>
                <td className="p-4 text-sm"><span className="flex items-center gap-2"><MapPin size={14} /> {site.location}</span></td>
                <td className="p-4 text-sm font-mono">{site.contact_number}</td>
                <td className="p-4 flex justify-end gap-2">
                  <button onClick={() => handleEdit(site)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg dark:hover:bg-blue-900/20"><Pencil size={18} /></button>
                  {String(statusFilter).toUpperCase() === 'INACTIVE' ? (
                    <button onClick={() => handleReactivateClick(site.id)} className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg dark:hover:bg-emerald-900/20"><RefreshCcw size={18} /></button>
                  ) : (
                    <button onClick={() => handleDeactivateClick(site.id)} className="p-2 text-orange-700 hover:bg-orange-50 rounded-lg dark:hover:bg-orange-900/20"><Trash2 size={18} /></button>
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
              <h2 className="text-xl font-bold">{editingId ? 'Edit Site' : 'Add New Site'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1 opacity-70">Site Name</label><input type="text" required placeholder="e.g. Brandix" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500" value={formData.site_name} onChange={(e) => setFormData({...formData, site_name: e.target.value})} /></div>
              <div><label className="block text-sm font-medium mb-1 opacity-70">Location</label><input type="text" required placeholder="e.g. Colombo" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} /></div>
              <div><label className="block text-sm font-medium mb-1 opacity-70">Contact</label><input type="text" placeholder="e.g. 0112345678" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500" value={formData.contact_number} onChange={(e) => setFormData({...formData, contact_number: e.target.value})} /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium transition hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-medium shadow-lg shadow-blue-500/30 transition">{loading ? 'Saving...' : 'Save Site'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Sites;