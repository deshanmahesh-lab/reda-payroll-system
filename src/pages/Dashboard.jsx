import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, ShieldCheck, UserPlus, 
  LogOut, Menu, Sun, Moon, Briefcase, MapPin, BadgeCheck,
  TrendingUp, Landmark, Banknote, PieChart, Activity 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/logo.png'; // Logo එක Import කර ඇත

const { ipcRenderer } = window.require('electron');

const Dashboard = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);

  // Real Stats State
  const [stats, setStats] = useState({
    security: 0,
    cleaning: 0,
    office: 0,
    sites: 0,
    totalBasic: 0
  });

  useEffect(() => {
    loadDashboardStats();
    const interval = setInterval(loadDashboardStats, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadDashboardStats = async () => {
    try {
      const res = await ipcRenderer.invoke('get-dashboard-stats');
      if (res.success) {
        setStats({
          security: res.security,
          cleaning: res.cleaning,
          office: res.office,
          sites: res.sites,
          totalBasic: res.totalBasic
        });
      }
    } catch (e) { console.error("Stats Error", e); }
  };

  const handleLogout = () => { navigate('/'); };
  const formatMoney = (val) => Number(val || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  // Calculate Percentages
  const totalStaff = stats.security + stats.cleaning + stats.office;
  const secPct = totalStaff ? Math.round((stats.security / totalStaff) * 100) : 0;
  const clnPct = totalStaff ? Math.round((stats.cleaning / totalStaff) * 100) : 0;
  const offPct = totalStaff ? Math.round((stats.office / totalStaff) * 100) : 0;

  return (
    <>
      <div className={`flex h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
        
        {/* SIDEBAR */}
        <aside className={`relative z-20 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'} ${darkMode ? 'bg-slate-900 border-r border-slate-800' : 'bg-white border-r border-slate-200'} shadow-xl`}>
          
          {/* --- LOGO SECTION (UPDATED) --- */}
          <div className="h-20 flex items-center justify-center border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {/* මෙතැන තිබුණු 'R' අකුර ඉවත් කර Logo එක දැම්මා */}
              <img src={logo} alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
              
              {isSidebarOpen && <span className="font-bold text-xl tracking-tight">REDA Payroll</span>}
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <SidebarItem icon={<LayoutDashboard />} text="Dashboard" isOpen={isSidebarOpen} onClick={() => navigate('/dashboard')} active />
            
            <div className="pt-4 pb-2"><p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'} ${!isSidebarOpen && 'hidden'}`}>Master Data</p></div>
            <SidebarItem icon={<MapPin />} text="Work Sites" isOpen={isSidebarOpen} onClick={() => navigate('/sites')} />
            <SidebarItem icon={<BadgeCheck />} text="Designations" isOpen={isSidebarOpen} onClick={() => navigate('/designations')} />
            <SidebarItem icon={<Landmark />} text="Bank Details" isOpen={isSidebarOpen} onClick={() => navigate('/banks')} />

            <div className="pt-4 pb-2"><p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'} ${!isSidebarOpen && 'hidden'}`}>Employees</p></div>
            <SidebarItem icon={<ShieldCheck />} text="Security Staff" isOpen={isSidebarOpen} onClick={() => navigate('/security')} />
            <SidebarItem icon={<Briefcase />} text="Cleaning Staff" isOpen={isSidebarOpen} onClick={() => navigate('/cleaning')} />
            <SidebarItem icon={<Users />} text="Office Staff" isOpen={isSidebarOpen} onClick={() => navigate('/office-staff')} />
            
            <div className="pt-8 pb-2"><p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'} ${!isSidebarOpen && 'hidden'}`}>Admin</p></div>
            <SidebarItem icon={<UserPlus />} text="User Management" isOpen={isSidebarOpen} onClick={() => navigate('/users')} />
          </nav>

          <div className="p-4 border-t border-gray-100 dark:border-slate-800">
            <button onClick={handleLogout} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 group ${!isSidebarOpen && 'justify-center'}`}>
              <LogOut size={20} />
              {isSidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          
          {/* Header */}
          <header className={`h-20 flex items-center justify-between px-8 shadow-sm z-10 ${darkMode ? 'bg-slate-900/50 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md'}`}>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><Menu size={24} /></button>
              <h2 className="text-xl font-semibold">Overview</h2>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-slate-700">
                <div className="text-right hidden md:block"><p className="text-sm font-bold">Super Admin</p><p className="text-xs text-gray-500">System Administrator</p></div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 border-2 border-white dark:border-slate-700 shadow-md"></div>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="flex-1 overflow-y-auto p-8">
            
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">Welcome Back!</h1>
              <p className="opacity-70">Here is your company overview.</p>
            </div>

            {/* --- MAIN STATS ROW --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Financial Card */}
              <div className="md:col-span-2 p-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2 opacity-80">
                    <Banknote size={20}/> <span className="text-sm font-bold uppercase tracking-wider">Est. Basic Salary Liability</span>
                  </div>
                  <div className="text-4xl font-black tracking-tight mb-1">Rs. {formatMoney(stats.totalBasic)}</div>
                  <div className="text-sm opacity-60">Total monthly basic salary commitment for active staff.</div>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none"><Landmark size={150}/></div>
              </div>

              {/* Total Staff Card */}
              <div className={`p-6 rounded-3xl border flex flex-col justify-between ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-sm font-bold uppercase">Total Staff</p>
                    <h3 className="text-3xl font-black mt-1">{totalStaff}</h3>
                  </div>
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><Users size={24}/></div>
                </div>
                <div className="mt-4 flex gap-2 text-xs font-bold text-slate-400">
                  <span className="text-blue-500">{stats.security} Sec</span> • <span className="text-emerald-500">{stats.cleaning} Cln</span> • <span className="text-purple-500">{stats.office} Off</span>
                </div>
              </div>

              {/* Active Sites Card */}
              <div className={`p-6 rounded-3xl border flex flex-col justify-between ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-sm font-bold uppercase">Active Sites</p>
                    <h3 className="text-3xl font-black mt-1">{stats.sites}</h3>
                  </div>
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800 text-orange-400' : 'bg-orange-50 text-orange-600'}`}><MapPin size={24}/></div>
                </div>
                <div className="mt-4 text-xs font-bold text-emerald-500 flex items-center gap-1"><Activity size={12}/> Operational</div>
              </div>
            </div>

            {/* --- DISTRIBUTION & ACTIONS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              
              {/* Staff Distribution Chart */}
              <div className={`lg:col-span-2 p-6 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2"><PieChart size={18} className="text-slate-400"/> Staff Distribution</h3>
                </div>
                <div className="space-y-6">
                  {/* Security Bar */}
                  <div>
                    <div className="flex justify-between text-sm font-bold mb-1">
                      <span>Security Staff</span> <span>{secPct}% ({stats.security})</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${secPct}%`, transition: 'width 1s' }}></div>
                    </div>
                  </div>
                  {/* Cleaning Bar */}
                  <div>
                    <div className="flex justify-between text-sm font-bold mb-1">
                      <span>Cleaning Staff</span> <span>{clnPct}% ({stats.cleaning})</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${clnPct}%`, transition: 'width 1s' }}></div>
                    </div>
                  </div>
                  {/* Office Bar */}
                  <div>
                    <div className="flex justify-between text-sm font-bold mb-1">
                      <span>Office Staff</span> <span>{offPct}% ({stats.office})</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${offPct}%`, transition: 'width 1s' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Vertical */}
              <div className="flex flex-col gap-4">
                <button onClick={() => setIsPayrollModalOpen(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-6 rounded-3xl shadow-lg transition-all flex flex-col justify-center items-center gap-2 text-center group">
                  <div className="p-3 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><Banknote size={32}/></div>
                  <div>
                    <div className="font-bold text-lg">Process Payroll</div>
                    <div className="text-xs opacity-70">Generate Salary Sheets</div>
                  </div>
                </button>
                
                <div className="flex-1 grid grid-cols-2 gap-4">
                   <button onClick={() => navigate('/security')} className={`rounded-3xl p-4 flex flex-col items-center justify-center gap-2 border transition ${darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                      <ShieldCheck size={24} className="text-blue-500"/> <span className="text-xs font-bold">Security</span>
                   </button>
                   <button onClick={() => navigate('/cleaning')} className={`rounded-3xl p-4 flex flex-col items-center justify-center gap-2 border transition ${darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                      <Briefcase size={24} className="text-emerald-500"/> <span className="text-xs font-bold">Cleaning</span>
                   </button>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      {isPayrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`p-5 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="text-lg font-extrabold">Select Department</h3>
              <p className="text-sm opacity-70 mt-1">Open Salary Sheets directly</p>
            </div>
            <div className="p-5 grid grid-cols-1 gap-3">
              <button onClick={() => { setIsPayrollModalOpen(false); navigate('/security', { state: { initialView: 'SALARY' } }); }} className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold">Security Staff Salary</button>
              <button onClick={() => { setIsPayrollModalOpen(false); navigate('/cleaning', { state: { initialView: 'SALARY' } }); }} className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Cleaning Staff Salary</button>
              <button onClick={() => { setIsPayrollModalOpen(false); navigate('/office-staff', { state: { initialView: 'SALARY' } }); }} className="px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">Office Staff Salary</button>
            </div>
            <div className={`p-4 border-t flex justify-end ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
              <button onClick={() => setIsPayrollModalOpen(false)} className={`px-4 py-2 rounded-xl font-bold ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper Components
const SidebarItem = ({ icon, text, active, isOpen, onClick }) => (
  <div onClick={onClick} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400'} ${!isOpen && 'justify-center'}`}>
    <div className={`${!isOpen && 'group-hover:scale-110 transition-transform'}`}>{icon}</div>
    {isOpen && <span className="font-medium whitespace-nowrap">{text}</span>}
  </div>
);

const StatCard = ({ icon, title, value, trend, darkMode }) => (
  <div className={`p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>{icon}</div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${darkMode ? 'bg-slate-800 text-green-400' : 'bg-green-100 text-green-700'}`}>{trend}</span>
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{value}</p>
  </div>
);

export default Dashboard;