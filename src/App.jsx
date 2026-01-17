import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Sun, Moon, Lock, User, ArrowRight } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useTheme } from './context/ThemeContext';

// Pages Import
import Dashboard from './pages/Dashboard';
import Sites from './pages/Sites';
import Designations from './pages/Designations';
import Banks from './pages/Banks';
import SecurityStaff from './pages/SecurityStaff'; // අලුත් පිටුව Import කළා
import CleaningStaff from './pages/CleaningStaff';

const { ipcRenderer } = window.require('electron');

// Login Page Component
const LoginPage = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await ipcRenderer.invoke('login-request', { username, password });
      setLoading(false);

      if (result.success) {
        toast.success(`Welcome, ${result.user.name}!`);
        navigate('/dashboard');
      } else {
        toast.error('Login Failed', { description: result.message });
      }
    } catch (err) {
      setLoading(false);
      toast.error('System Error');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${darkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
      <button onClick={toggleDarkMode} className={`absolute top-5 right-5 p-3 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 ${darkMode ? 'bg-slate-800 text-yellow-400' : 'bg-white text-slate-800'}`}>
        {darkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl border transition-all duration-300 ${darkMode ? 'bg-slate-900 border-slate-800 shadow-blue-900/20' : 'bg-white border-white shadow-xl'}`}>
        <div className="text-center mb-8">
           <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-4 text-3xl font-bold shadow-lg ${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-900 text-white'}`}>R</div>
           <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>REDA Payroll</h1>
           <p className={`mt-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Secure Access Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={18} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
            </div>
            <input type="text" required className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all duration-200 ${darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-900'}`} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={18} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
            </div>
            <input type="password" required className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all duration-200 ${darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-900'}`} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className={`w-full py-3.5 px-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${darkMode ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30' : 'bg-blue-900 hover:bg-blue-800 shadow-blue-900/30'} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
            {loading ? <span className="animate-pulse">Authenticating...</span> : <>Sign In <ArrowRight size={20} /></>}
          </button>
        </form>

        <div className={`mt-8 text-center text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
          <p>Protected by Nexigen Security Protocols</p>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sites" element={<Sites />} />
        <Route path="/designations" element={<Designations />} />
        <Route path="/banks" element={<Banks />} />
        {/* අලුත් Security Route එක */}
        <Route path="/security" element={<SecurityStaff />} />
        <Route path="/cleaning" element={<CleaningStaff />} />
      </Routes>
    </Router>
  );
}

export default App;