// src/components/ConfirmDialog.jsx
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", cancelText = "Cancel", isDangerous = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border dark:border-slate-700 transform transition-all scale-100 overflow-hidden">
        
        {/* Header */}
        <div className={`flex items-center gap-3 p-4 border-b dark:border-slate-800 ${isDangerous ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
          <div className={`p-2 rounded-full ${isDangerous ? 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-300' : 'bg-blue-100 text-blue-600'}`}>
            <AlertTriangle size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-300">{message}</p>
        </div>

        {/* Footer (Buttons) */}
        <div className="flex justify-end gap-3 p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 rounded-xl font-medium text-white shadow-lg transition hover:scale-105 ${
              isDangerous 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
            }`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmDialog;