import React, { useState, useEffect } from 'react';
import { Plus, Landmark, GitBranch, Trash2, ArrowLeft, ChevronRight, Building, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';

const { ipcRenderer } = window.require('electron');

const Banks = () => {
  const navigate = useNavigate();
  
  // States
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: '', bank_code: '' });
  
  const [branches, setBranches] = useState([]);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({ branch_name: '', branch_code: '' });
  
  const [deleteData, setDeleteData] = useState({ open: false, type: '', id: null });

  useEffect(() => { fetchBanks(); }, []);

  // --- Bank Functions ---
  const fetchBanks = async () => {
    try {
      const response = await ipcRenderer.invoke('get-banks');
      if (response.success) setBanks(response.data);
    } catch (error) { toast.error("Error loading banks"); }
  };

  const handleAddBank = async (e) => {
    e.preventDefault();
    try {
      const response = await ipcRenderer.invoke('add-bank', bankForm);
      if (response.success) {
        toast.success("Bank Added");
        setIsBankModalOpen(false);
        setBankForm({ bank_name: '', bank_code: '' });
        fetchBanks();
      } else { toast.error("Failed to add bank"); }
    } catch (error) { toast.error("Error saving bank"); }
  };

  // --- Branch Functions ---
  const handleBankSelect = async (bank) => {
    setSelectedBank(bank);
    fetchBranches(bank.id);
  };

  const fetchBranches = async (bankId) => {
    try {
      const response = await ipcRenderer.invoke('get-branches', bankId);
      if (response.success) setBranches(response.data);
    } catch (error) { toast.error("Error loading branches"); }
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (!selectedBank) return;
    try {
      const response = await ipcRenderer.invoke('add-branch', { ...branchForm, bank_id: selectedBank.id });
      if (response.success) {
        toast.success("Branch Added");
        setIsBranchModalOpen(false);
        setBranchForm({ branch_name: '', branch_code: '' });
        fetchBranches(selectedBank.id);
      } else { toast.error("Failed to add branch"); }
    } catch (error) { toast.error("Error saving branch"); }
  };

  // --- Delete Logic ---
  const confirmDelete = async () => {
    const { type, id } = deleteData;
    try {
      const endpoint = type === 'BANK' ? 'delete-bank' : 'delete-branch';
      const response = await ipcRenderer.invoke(endpoint, id);
      if (response.success) {
        toast.success(`${type === 'BANK' ? 'Bank' : 'Branch'} Deleted`);
        if (type === 'BANK') {
          fetchBanks();
          setSelectedBank(null);
          setBranches([]);
        } else {
          fetchBranches(selectedBank.id);
        }
      } else { toast.error("Delete failed"); }
    } catch (error) { toast.error("Error deleting"); }
    setDeleteData({ open: false, type: '', id: null });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 transition-colors duration-300 text-slate-900 dark:text-white flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition"><ArrowLeft /></button>
          <div><h1 className="text-2xl font-bold">Bank Management</h1><p className="text-sm opacity-60">Manage Banks & Branches</p></div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* BANKS LIST */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h2 className="font-bold flex items-center gap-2"><Landmark size={18} /> All Banks</h2>
            <button onClick={() => setIsBankModalOpen(true)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"><Plus size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {banks.map((bank) => (
              <div 
                key={bank.id} 
                onClick={() => handleBankSelect(bank)}
                className={`p-3 rounded-xl cursor-pointer flex items-center justify-between group transition-all ${
                  selectedBank?.id === bank.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div>
                  <p className="font-semibold">{bank.bank_name}</p>
                  <p className={`text-xs ${selectedBank?.id === bank.id ? 'text-blue-200' : 'text-slate-500'}`}>Code: {bank.bank_code}</p>
                </div>
                {selectedBank?.id === bank.id ? <ChevronRight size={18} /> : (
                  <button onClick={(e) => { e.stopPropagation(); setDeleteData({ open: true, type: 'BANK', id: bank.id }); }} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-100 rounded-lg"><Trash2 size={16}/></button>
                )}
              </div>
            ))}
            {banks.length === 0 && <p className="text-center text-slate-400 p-4 text-sm">No banks added yet.</p>}
          </div>
        </div>

        {/* BRANCHES LIST */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h2 className="font-bold flex items-center gap-2">
              <GitBranch size={18} /> 
              {selectedBank ? `${selectedBank.bank_name} - Branches` : 'Select a Bank to View Branches'}
            </h2>
            {selectedBank && (
              <button onClick={() => setIsBranchModalOpen(true)} className="flex items-center gap-2 text-sm bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Plus size={16} /> Add Branch
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedBank ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Landmark size={48} className="mb-4 opacity-20" />
                <p>Select a bank from the left list to manage branches.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {branches.map((branch) => (
                  <div key={branch.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 transition flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500"><Building size={16} /></div>
                      <div>
                        <p className="font-semibold text-sm">{branch.branch_name}</p>
                        <p className="text-xs text-slate-500 font-mono">Code: {branch.branch_code}</p>
                      </div>
                    </div>
                    <button onClick={() => setDeleteData({ open: true, type: 'BRANCH', id: branch.id })} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                  </div>
                ))}
                {branches.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <p>No branches found for this bank.</p>
                    <button onClick={() => setIsBranchModalOpen(true)} className="text-blue-500 text-sm mt-2 hover:underline">Add First Branch</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add Bank Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl w-full max-w-sm border dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold">Add New Bank</h3>
               <button onClick={() => setIsBankModalOpen(false)}><X size={20} className="text-slate-400 hover:text-red-500"/></button>
            </div>
            <form onSubmit={handleAddBank} className="space-y-3">
              <input type="text" required placeholder="Bank Name (e.g. BOC)" className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none" value={bankForm.bank_name} onChange={e => setBankForm({...bankForm, bank_name: e.target.value})} />
              <input type="text" required placeholder="Bank Code (e.g. 7010)" className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none" value={bankForm.bank_code} onChange={e => setBankForm({...bankForm, bank_code: e.target.value})} />
              <button type="submit" className="w-full py-2 rounded-lg bg-blue-600 text-white mt-2">Save Bank</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl w-full max-w-sm border dark:border-slate-700">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold">Add Branch</h3>
               <button onClick={() => setIsBranchModalOpen(false)}><X size={20} className="text-slate-400 hover:text-red-500"/></button>
            </div>
            <form onSubmit={handleAddBranch} className="space-y-3">
              <input type="text" required placeholder="Branch Name (e.g. Colombo)" className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none" value={branchForm.branch_name} onChange={e => setBranchForm({...branchForm, branch_name: e.target.value})} />
              <input type="text" required placeholder="Branch Code (e.g. 001)" className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none" value={branchForm.branch_code} onChange={e => setBranchForm({...branchForm, branch_code: e.target.value})} />
              <button type="submit" className="w-full py-2 rounded-lg bg-emerald-600 text-white mt-2">Save Branch</button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog 
        isOpen={deleteData.open} 
        onClose={() => setDeleteData({ ...deleteData, open: false })}
        onConfirm={confirmDelete}
        title={`Delete ${deleteData.type === 'BANK' ? 'Bank' : 'Branch'}?`}
        message="Are you sure? This cannot be undone."
        isDangerous={true}
      />
    </div>
  );
};

export default Banks;