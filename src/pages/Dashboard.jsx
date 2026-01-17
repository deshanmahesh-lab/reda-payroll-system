import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, ShieldCheck, UserPlus, 
  LogOut, Menu, Sun, Moon, Briefcase, MapPin, BadgeCheck,
  TrendingUp, Bell, Landmark, Banknote 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <>
      <div className={`flex h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
        
        {/* 1. SIDEBAR */}
        <aside className={`relative z-20 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'} ${darkMode ? 'bg-slate-900 border-r border-slate-800' : 'bg-white border-r border-slate-200'} shadow-xl`}>
          
          {/* Logo */}
          <div className="h-20 flex items-center justify-center border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                R
              </div>
              {isSidebarOpen && (
                <span className="font-bold text-xl tracking-tight">REDA Payroll</span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <SidebarItem icon={<LayoutDashboard />} text="Dashboard" isOpen={isSidebarOpen} onClick={() => navigate('/dashboard')} active />
            
            <div className="pt-4 pb-2">
              <p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'} ${!isSidebarOpen && 'hidden'}`}>Master Data</p>
            </div>
            <SidebarItem icon={<MapPin />} text="Work Sites" isOpen={isSidebarOpen} onClick={() => navigate('/sites')} />
            <SidebarItem icon={<BadgeCheck />} text="Designations" isOpen={isSidebarOpen} onClick={() => navigate('/designations')} />
            <SidebarItem icon={<Landmark />} text="Bank Details" isOpen={isSidebarOpen} onClick={() => navigate('/banks')} />

            <div className="pt-4 pb-2">
              <p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'} ${!isSidebarOpen && 'hidden'}`}>Employees</p>
            </div>
            {/* Security Staff Button එක දැන් වැඩ */}
            <SidebarItem icon={<ShieldCheck />} text="Security Staff" isOpen={isSidebarOpen} onClick={() => navigate('/security')} />
            <SidebarItem icon={<Briefcase />} text="Cleaning Staff" isOpen={isSidebarOpen} onClick={() => navigate('/cleaning')} />
            
            <div className="pt-8 pb-2">
               <p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'} ${!isSidebarOpen && 'hidden'}`}>Admin</p>
            </div>
            <SidebarItem icon={<UserPlus />} text="User Management" isOpen={isSidebarOpen} onClick={() => alert("Coming Soon!")} />
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-100 dark:border-slate-800">
            <button 
              onClick={handleLogout}
              className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 group ${!isSidebarOpen && 'justify-center'}`}
            >
              <LogOut size={20} />
              {isSidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </aside>

        {/* 2. MAIN CONTENT */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          
          {/* Header */}
          <header className={`h-20 flex items-center justify-between px-8 shadow-sm z-10 ${darkMode ? 'bg-slate-900/50 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md'}`}>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                <Menu size={24} />
              </button>
              <h2 className="text-xl font-semibold">Overview</h2>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
              </button>
              
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-slate-700">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold">Super Admin</p>
                  <p className="text-xs text-gray-500">System Administrator</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 border-2 border-white dark:border-slate-700 shadow-md"></div>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">Dashboard Overview</h1>
              <p className="opacity-70">Welcome back! Here is what's happening in REDA today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard icon={<ShieldCheck className="text-blue-500" />} title="Security Staff" value="124" trend="+4 this month" darkMode={darkMode} />
              <StatCard icon={<Briefcase className="text-emerald-500" />} title="Cleaning Staff" value="45" trend="+2 this month" darkMode={darkMode} />
              <StatCard icon={<Users className="text-purple-500" />} title="Total Employees" value="169" trend="Stable" darkMode={darkMode} />
              <StatCard icon={<MapPin className="text-orange-500" />} title="Active Sites" value="12" trend="Action Needed" darkMode={darkMode} />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <ActionCard
                icon={<Banknote className="text-emerald-500" />}
                title="Payroll Management"
                description="Jump directly to Salary Sheets"
                darkMode={darkMode}
                onClick={() => setIsPayrollModalOpen(true)}
              />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">Recent Activity</h3>
                  <button className="text-sm text-blue-500 hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className={`flex items-start gap-4 p-3 rounded-xl transition-colors ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                      <div className={`mt-1 p-2 rounded-full ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        <TrendingUp size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">New Site Added</p>
                        <p className="text-xs opacity-60">Brandix Minuwangoda was registered.</p>
                      </div>
                      <span className="ml-auto text-xs opacity-50">2m ago</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                <h3 className="text-lg font-bold mb-6">System Health</h3>
                <div className="flex items-center justify-center h-40 opacity-50 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl">
                  <p className="text-sm">Chart / Graphs will appear here</p>
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

            <div className="p-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setIsPayrollModalOpen(false);
                  navigate('/security', { state: { initialView: 'SALARY' } });
                }}
                className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                Security
              </button>
              <button
                onClick={() => {
                  setIsPayrollModalOpen(false);
                  navigate('/cleaning', { state: { initialView: 'SALARY' } });
                }}
                className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Cleaning
              </button>
            </div>

            <div className={`p-4 border-t flex justify-end ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
              <button
                onClick={() => setIsPayrollModalOpen(false)}
                className={`px-4 py-2 rounded-xl font-bold ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper Components
const SidebarItem = ({ icon, text, active, isOpen, onClick }) => (
  <div 
    onClick={onClick}
    className={`
      flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group
      ${active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
        : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400'}
      ${!isOpen && 'justify-center'}
    `}
  >
    <div className={`${!isOpen && 'group-hover:scale-110 transition-transform'}`}>
      {icon}
    </div>
    {isOpen && <span className="font-medium whitespace-nowrap">{text}</span>}
  </div>
);

const StatCard = ({ icon, title, value, trend, darkMode }) => (
  <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {icon}
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${darkMode ? 'bg-slate-800 text-green-400' : 'bg-green-100 text-green-700'}`}>
        {trend}
      </span>
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{value}</p>
  </div>
);

const ActionCard = ({ icon, title, description, darkMode, onClick }) => (
  <div
    onClick={onClick}
    className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/60' : 'bg-white border-slate-100 shadow-sm hover:bg-slate-50'}`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {icon}
      </div>
      <div>
        <div className="text-lg font-extrabold">{title}</div>
        <div className="text-sm opacity-70">{description}</div>
      </div>
    </div>
  </div>
);

export default Dashboard;