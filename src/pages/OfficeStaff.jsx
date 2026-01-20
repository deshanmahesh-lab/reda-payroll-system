import React, { useState, useEffect } from 'react';
import { Plus, Search, Pencil, ArrowLeft, X, User, Printer, Save, FileText, CheckCircle, AlertCircle, Power, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import PayslipModal from '../components/PayslipModal';
import ConfirmDialog from '../components/ConfirmDialog';

const { ipcRenderer } = window.require('electron');

const OfficeStaff = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('EMPLOYEES'); // EMPLOYEES, INPUT, REPORTS
  const [loading, setLoading] = useState(false);

  // --- TAB 1: EMPLOYEES DATA ---
  const [employees, setEmployees] = useState([]);
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [empEditingId, setEmpEditingId] = useState(null);
  const [empForm, setEmpForm] = useState({ 
    full_name: '', epf_number: '', nic_number: '', gender: 'M', designation: '', 
    basic_salary: '', mobile_number: '', 
    bank_id: '', branch_id: '', account_number: '' 
  });
  
  const [statusConfirm, setStatusConfirm] = useState({ open: false, id: null, currentStatus: '' });
  
  // Master Data
  const [designations, setDesignations] = useState([]);
  const [banks, setBanks] = useState([]);
  const [branches, setBranches] = useState([]);

  // --- TAB 2: MONTHLY INPUT DATA ---
  const [inputMonth, setInputMonth] = useState(new Date().toISOString().slice(0, 7));
  const [pendingList, setPendingList] = useState([]);
  const [completedList, setCompletedList] = useState([]);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [selectedEmpInput, setSelectedEmpInput] = useState(null);
  const [monthlyForm, setMonthlyForm] = useState({});
  const [monthlySaving, setMonthlySaving] = useState(false);

  // --- TAB 3: REPORTS DATA ---
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportData, setReportData] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [payslipData, setPayslipData] = useState(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    loadMasterData();
    if (location.state?.initialView) {
        setActiveTab(location.state.initialView);
    }
  }, [location]);

  useEffect(() => {
    if(activeTab === 'EMPLOYEES') fetchEmployees();
    if(activeTab === 'INPUT') fetchMonthlyInput();
    if(activeTab === 'REPORTS') generateReport();
  }, [activeTab, inputMonth, reportMonth, employeeStatusFilter]);

  // Branch Loader
  useEffect(() => {
    if (empForm.bank_id) {
      const loadBranches = async () => {
        try { const res = await ipcRenderer.invoke('get-branches', empForm.bank_id); if (res.success) setBranches(res.data); } catch (e) {}
      };
      loadBranches();
    } else { setBranches([]); }
  }, [empForm.bank_id]);

  const loadMasterData = async () => {
    const b = await ipcRenderer.invoke('get-banks');
    if (b.success) setBanks(b.data);
    const d = await ipcRenderer.invoke('get-designations');
    if (d.success) setDesignations(d.data.filter(item => item.department === 'OFFICE'));
  };

  // --- FETCH FUNCTIONS ---
  const fetchEmployees = async () => {
    const res = await ipcRenderer.invoke('get-office-employees'); 
    if(res.success) setEmployees(res.data);
  };

  const fetchMonthlyInput = async () => {
    const res = await ipcRenderer.invoke('get-office-monthly-input', { month_year: inputMonth });
    if(res.success) {
      setPendingList(res.pending);
      setCompletedList(res.completed);
    }
  };

  const generateReport = async () => {
    if(activeTab !== 'REPORTS') return;
    setSalaryLoading(true);
    const res = await ipcRenderer.invoke('calculate-office-salary-report', { month_year: reportMonth });
    if(res.success) setReportData(res.data);
    setSalaryLoading(false);
  };

  // --- EMPLOYEE HANDLERS ---
  const handleAddNewEmployee = () => {
    setEmpEditingId(null);
    setEmpForm({ full_name: '', epf_number: '', nic_number: '', gender: 'M', designation: '', basic_salary: '', mobile_number: '', bank_id: '', branch_id: '', account_number: '' });
    setIsEmpModalOpen(true);
  };

  const handleEditEmployee = (emp) => {
    setEmpEditingId(emp.id);
    setEmpForm({
        full_name: emp.full_name,
        epf_number: emp.epf_number,
        nic_number: emp.nic_number,
        gender: emp.gender,
        designation: emp.designation,
        basic_salary: emp.basic_salary,
        mobile_number: emp.mobile_number,
        bank_id: emp.bank_id ? String(emp.bank_id) : '',
        branch_id: emp.branch_id ? String(emp.branch_id) : '',
        account_number: emp.account_number
    });
    setIsEmpModalOpen(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...empForm, bank_id: empForm.bank_id || null, branch_id: empForm.branch_id || null };
    let res;
    if (empEditingId) res = await ipcRenderer.invoke('update-office-employee', { ...payload, id: empEditingId });
    else res = await ipcRenderer.invoke('add-office-employee', payload);

    if(res.success) { 
        toast.success(res.message); 
        setIsEmpModalOpen(false); 
        fetchEmployees(); 
    } else { 
        toast.error('Failed'); 
    }
    setLoading(false);
  };

  // ✅ Status Change (Fixed Logic)
  const handleStatusToggle = async () => {
    if (!statusConfirm.id) return;
    
    // Calling the correct backend handler: 'toggle-status-office-employee'
    const res = await ipcRenderer.invoke('toggle-status-office-employee', { 
        id: statusConfirm.id, 
        currentStatus: statusConfirm.currentStatus 
    });

    if (res.success) { 
        toast.success(res.message); 
        fetchEmployees(); // Refresh the list to move employee to correct tab
    } else { 
        toast.error('Failed to change status'); 
    }
    setStatusConfirm({ open: false, id: null, currentStatus: '' });
  };

  // Filter Employees by Search & Status
  const filteredEmployees = employees.filter(emp => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (emp.full_name || '').toLowerCase().includes(term) || (emp.epf_number || '').includes(term);
    const matchesStatus = emp.status === employeeStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // --- MONTHLY INPUT HANDLERS ---
  const openInputModal = (emp) => {
    setSelectedEmpInput(emp);
    setMonthlyForm({
      employee_id: emp.id,
      month_year: inputMonth,
      allow_chairman: emp.allow_chairman || 0,
      allow_acting_dir: emp.allow_acting_dir || 0,
      allow_telephone: emp.allow_telephone || 0,
      allow_fuel: emp.allow_fuel || 0,
      allow_cost_of_living: emp.allow_cost_of_living || 17800,
      allow_special_1: emp.allow_special_1 || 0,
      allow_special_2: emp.allow_special_2 || 0,
      allow_interim: emp.allow_interim || 0,
      deduct_stamp: emp.deduct_stamp || 0,
      deduct_elec_water: emp.deduct_elec_water || 0,
      deduct_festival: emp.deduct_festival || 0,
      deduct_loan: emp.deduct_loan || 0,
      deduct_other: emp.deduct_other || 0,
      deduct_insurance: emp.deduct_insurance || 60,
      deduct_welfare: emp.deduct_welfare || 200
    });
    setIsInputModalOpen(true);
  };

  const handleSaveMonthly = async (e) => {
    e.preventDefault();
    setMonthlySaving(true);
    const res = await ipcRenderer.invoke('save-office-single-monthly', monthlyForm);
    if(res.success) { 
      toast.success('Saved Successfully!'); 
      setIsInputModalOpen(false); 
      fetchMonthlyInput(); 
    } else {
      toast.error('Failed');
    }
    setMonthlySaving(false);
  };

  // --- REPORT HANDLERS ---
  const formatMoney = (val) => Number(val || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // 1. BANK SLIP (Security Format)
  const handlePrintBankSlip = () => {
    if (reportData.length === 0) { toast.error("No data to print"); return; }
    const printWindow = window.open('', '_blank');
    const salaryDate = new Date().toISOString().split('T')[0];

    const htmlContent = `
      <html>
      <head>
        <title>Bank Slip (Office) - ${reportMonth}</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 5px; text-align: left; }
          th { background-color: #f0f0f0; }
        </style>
      </head>
      <body>
        <h2>Bank Transfer Slip (Office Staff) - ${reportMonth}</h2>
        <table>
          <thead>
            <tr>
              <th>0000</th>
              <th>Bank Code</th>
              <th>Branch Code</th>
              <th>Account No</th>
              <th>Full Name</th>
              <th>52</th><th>00</th><th>0</th><th>000000</th>
              <th>Net Salary</th>
              <th>SLR</th><th>7010</th><th>002</th><th>000008848232</th><th>REDA</th>
              <th>EPF No</th><th>Month</th><th>Date</th><th>000000</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map(r => `
              <tr>
                <td>0000</td>
                <td>${r.bank_code || '---'}</td>
                <td>${r.branch_code || '---'}</td>
                <td>${r.account_number || '---'}</td>
                <td>${r.full_name}</td>
                <td>52</td><td>00</td><td>0</td><td>000000</td>
                <td>${(Number(r.net_pay)*100).toFixed(0).toString().padStart(12, '0')}</td>
                <td>SLR</td><td>7010</td><td>002</td><td>000008848232</td><td>REDA</td>
                <td>${r.epf_number || '000'}</td>
                <td>${reportMonth}</td>
                <td>${salaryDate}</td>
                <td>000000</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  // 2. CSV EXPORT
  const downloadCsv = (rows, filename) => {
    const escape = (val) => {
      const s = String(val ?? '');
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    // Headers matching your requirement
    const headers = [
      'No', 'Name', 'Designation', 'Basic Salary', 'Chairman Allow', 'Acting Dir Allow', 'Tel Allow', 'Fuel Allow', 'Cost of Living', 
      '20% Special 1', '20% Special 2', 'Interim Allow', 'GROSS PAY', 
      'EPF 8%', 'Stamp', 'Electricity/Water', 'Festival Adv', 'Welfare', 'Loan', 'Insurance', 'Other Ded',
      'TOTAL DEDUCTIONS', 'NET PAY', 
      'EPF 12%', 'ETF 3%', 'Gratuity'
    ];

    const lines = [headers.map(escape).join(',')];
    (rows || []).forEach((r, index) => {
      lines.push([
        index + 1, r.full_name, r.designation, r.basic_salary, r.allow_chairman, r.allow_acting_dir, r.allow_telephone, r.allow_fuel, r.allow_cost_of_living,
        r.allow_special_1, r.allow_special_2, r.allow_interim, r.gross_pay,
        r.epf_8, r.deduct_stamp, r.deduct_elec_water, r.deduct_festival, r.deduct_welfare, r.deduct_loan, r.deduct_insurance, r.deduct_other,
        r.total_deductions, r.net_pay,
        r.epf_12, r.etf_3, r.gratuity
      ].map(escape).join(','));
    });

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (reportData.length === 0) { toast.error("No data to export"); return; }
    const month = String(reportMonth).replace(/[^0-9-]/g, '');
    downloadCsv(reportData, `Office_Staff_Salary_${month}.csv`);
  };

  // 3. MASTER REPORT
  const handlePrintMasterReport = () => {
    if (reportData.length === 0) { toast.error("No data to print"); return; }
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <html>
      <head>
        <title>Office Salary - ${reportMonth}</title>
        <style>
          @page { size: A3 landscape; margin: 1cm; }
          body { font-family: 'Courier New', monospace; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 4px; text-align: right; }
          th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
          .left { text-align: left; }
        </style>
      </head>
      <body>
        <h1 style="text-align:center">REGIONAL ECONOMIC DEVELOPMENT AGENCY</h1>
        <h2 style="text-align:center">OFFICE STAFF SALARY - ${reportMonth}</h2>
        <table>
          <thead>
            <tr>
              <th rowspan="2">No</th><th rowspan="2">Name</th>
              <th colspan="9">EARNINGS</th>
              <th rowspan="2">GROSS<br>PAY</th>
              <th colspan="8">DEDUCTIONS</th>
              <th rowspan="2">TOTAL<br>DED</th>
              <th rowspan="2">NET<br>PAY</th>
              <th colspan="3">EMPLOYER</th>
            </tr>
            <tr>
              <th>Basic</th><th>Chair</th><th>Act.Dir</th><th>Tel</th><th>Fuel</th><th>C.O.L</th><th>Spl 1</th><th>Spl 2</th><th>Interim</th>
              <th>EPF 8%</th><th>Stamp</th><th>Elec/W</th><th>Fest</th><th>Welf</th><th>Loan</th><th>Ins</th><th>Other</th>
              <th>EPF 12%</th><th>ETF 3%</th><th>Grat</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map((r, i) => `
              <tr>
                <td>${i+1}</td><td class="left" style="white-space:nowrap;">${r.full_name}</td>
                <td>${formatMoney(r.basic_salary)}</td><td>${formatMoney(r.allow_chairman)}</td><td>${formatMoney(r.allow_acting_dir)}</td>
                <td>${formatMoney(r.allow_telephone)}</td><td>${formatMoney(r.allow_fuel)}</td><td>${formatMoney(r.allow_cost_of_living)}</td>
                <td>${formatMoney(r.allow_special_1)}</td><td>${formatMoney(r.allow_special_2)}</td><td>${formatMoney(r.allow_interim)}</td>
                <td style="font-weight:bold">${formatMoney(r.gross_pay)}</td>
                <td>${formatMoney(r.epf_8)}</td><td>${formatMoney(r.deduct_stamp)}</td><td>${formatMoney(r.deduct_elec_water)}</td>
                <td>${formatMoney(r.deduct_festival)}</td><td>${formatMoney(r.deduct_welfare)}</td><td>${formatMoney(r.deduct_loan)}</td>
                <td>${formatMoney(r.deduct_insurance)}</td><td>${formatMoney(r.deduct_other)}</td>
                <td style="font-weight:bold">${formatMoney(r.total_deductions)}</td>
                <td style="font-weight:bold; font-size:11px;">${formatMoney(r.net_pay)}</td>
                <td>${formatMoney(r.epf_12)}</td><td>${formatMoney(r.etf_3)}</td><td>${formatMoney(r.gratuity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body></html>`;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-white flex flex-col h-screen font-sans">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition"><ArrowLeft size={20}/></button>
          <div><h1 className="text-2xl font-bold">Office Staff Payroll</h1><p className="text-xs text-slate-500">Manage Staff, Input Data & Generate Reports</p></div>
        </div>
        <div className="flex gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-sm border dark:border-slate-800">
          <button onClick={() => setActiveTab('EMPLOYEES')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab==='EMPLOYEES' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Employees</button>
          <button onClick={() => setActiveTab('INPUT')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab==='INPUT' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Monthly Input</button>
          <button onClick={() => setActiveTab('REPORTS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab==='REPORTS' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Reports</button>
        </div>
      </div>

      {/* --- TAB 1: EMPLOYEES --- */}
      {activeTab === 'EMPLOYEES' && (
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow p-4 flex flex-col">
          <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 mb-2 rounded-t-xl">
            <div className="flex gap-2">
              <button onClick={() => setEmployeeStatusFilter('ACTIVE')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${employeeStatusFilter === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'}`}>Active</button>
              <button onClick={() => setEmployeeStatusFilter('TERMINATED')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${employeeStatusFilter === 'TERMINATED' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'}`}>Past</button>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                <input type="text" placeholder="Search Name/EPF..." className="pl-9 pr-4 py-2 w-64 text-sm rounded-xl bg-white dark:bg-slate-800 border dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={handleAddNewEmployee} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition"><Plus size={16}/> Add Employee</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold uppercase text-slate-500"><tr><th className="p-4">Name</th><th className="p-4">EPF / NIC</th><th className="p-4">Position</th><th className="p-4">Basic Salary</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEmployees.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-4 font-medium flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><User size={16}/></div>{e.full_name}</td>
                    <td className="p-4 text-sm"><div className="font-mono font-bold text-slate-700 dark:text-slate-300">{e.epf_number}</div><div className="text-xs text-slate-400">{e.nic_number}</div></td>
                    <td className="p-4 text-slate-500">{e.designation}</td>
                    <td className="p-4 font-mono">{formatMoney(e.basic_salary)}</td>
                    <td className="p-4"><span className={`px-2 py-1 text-[10px] font-bold rounded-full border ${e.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{e.status}</span></td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleEditEmployee(e)} className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition"><Pencil size={14}/></button>
                      <button onClick={() => setStatusConfirm({ open: true, id: e.id, currentStatus: e.status })} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">{e.status === 'ACTIVE' ? <Power size={14} /> : <RefreshCcw size={14} />}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 2: MONTHLY INPUT --- */}
      {activeTab === 'INPUT' && (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow">
            <label className="text-xs font-bold uppercase text-slate-500">Select Month:</label>
            <input type="month" value={inputMonth} onChange={e => setInputMonth(e.target.value)} className="p-2 border rounded-xl dark:bg-slate-800" />
            <div className="flex-1 text-right text-xs font-bold text-slate-400">
              Pending: {pendingList.length} | Completed: {completedList.length}
            </div>
          </div>

          <div className="flex-1 grid grid-rows-2 gap-4 min-h-0">
            {/* Pending Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow p-4 flex flex-col overflow-hidden border-l-4 border-l-orange-500">
              <h3 className="text-sm font-bold text-orange-500 mb-2 flex gap-2"><AlertCircle size={16}/> Pending Input (Click to Enter Data)</h3>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold uppercase text-slate-500"><tr><th className="p-3">Name</th><th className="p-3">Designation</th><th className="p-3">Status</th></tr></thead>
                  <tbody>
                    {pendingList.map(e => (
                      <tr key={e.id} onClick={() => openInputModal(e)} className="hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer transition">
                        <td className="p-3 font-medium">{e.full_name}</td><td className="p-3 text-slate-500">{e.designation}</td>
                        <td className="p-3 text-xs font-bold text-orange-500">Pending</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Completed Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow p-4 flex flex-col overflow-hidden border-l-4 border-l-emerald-500">
              <h3 className="text-sm font-bold text-emerald-600 mb-2 flex gap-2"><CheckCircle size={16}/> Completed (Click to Edit)</h3>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold uppercase text-slate-500"><tr><th className="p-3">Name</th><th className="p-3">Designation</th><th className="p-3">Status</th></tr></thead>
                  <tbody>
                    {completedList.map(e => (
                      <tr key={e.id} onClick={() => openInputModal(e)} className="hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer transition">
                        <td className="p-3 font-medium">{e.full_name}</td><td className="p-3 text-slate-500">{e.designation}</td>
                        <td className="p-3 font-mono text-emerald-600 text-xs font-bold">Saved</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: REPORTS --- */}
      {activeTab === 'REPORTS' && (
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow p-4 flex flex-col">
          <div className="flex items-center gap-4 mb-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
            <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="p-2 border rounded-xl dark:bg-slate-700" />
            <button onClick={generateReport} disabled={salaryLoading} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex gap-2">{salaryLoading ? 'Loading...' : 'Load Data'}</button>
            <div className="flex-1"></div>
            <button onClick={handleExportCsv} className="bg-slate-200 text-slate-700 hover:bg-slate-300 px-4 py-2 rounded-xl text-sm font-bold flex gap-2"><FileText size={16}/> Export CSV</button>
            <button onClick={handlePrintMasterReport} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex gap-2"><Printer size={16}/> Master Report</button>
            <button onClick={handlePrintBankSlip} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex gap-2"><FileText size={16}/> Bank Slip</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-bold uppercase text-slate-500">
                <tr><th className="p-3">Name</th><th className="p-3 text-right">Basic</th><th className="p-3 text-right">Gross Pay</th><th className="p-3 text-right">Total Ded</th><th className="p-3 text-right">Net Pay</th><th className="p-3 text-center">Payslip</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportData.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="p-3 font-medium">{r.full_name}</td>
                    <td className="p-3 text-right">{formatMoney(r.basic_salary)}</td>
                    <td className="p-3 text-right font-bold text-blue-600">{formatMoney(r.gross_pay)}</td>
                    <td className="p-3 text-right text-red-500">{formatMoney(r.total_deductions)}</td>
                    <td className="p-3 text-right font-black text-emerald-600 text-sm">{formatMoney(r.net_pay)}</td>
                    <td className="p-3 text-center"><button onClick={() => {setPayslipData(r); setIsPayslipOpen(true);}} className="text-slate-400 hover:text-purple-600"><Printer size={16}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD/EDIT EMPLOYEE --- */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl p-6 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold mb-4">{empEditingId ? 'Edit Office Employee' : 'Add New Office Employee'}</h2>
            <form onSubmit={handleSaveEmployee} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                        <input className="w-full mt-1 p-3 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500" value={empForm.full_name} onChange={e => setEmpForm({...empForm, full_name: e.target.value})} required/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">EPF No</label>
                        <input className="w-full mt-1 p-3 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500" value={empForm.epf_number} onChange={e => setEmpForm({...empForm, epf_number: e.target.value})} required/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">NIC No</label>
                        <input className="w-full mt-1 p-3 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500" value={empForm.nic_number} onChange={e => setEmpForm({...empForm, nic_number: e.target.value})} required/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Position</label>
                        <select className="w-full mt-1 p-3 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500" value={empForm.designation} onChange={e => setEmpForm({...empForm, designation: e.target.value})} required>
                            <option value="">Select...</option>{designations.map(d => <option key={d.id} value={d.title}>{d.title}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Basic Salary</label>
                        <input type="number" className="w-full mt-1 p-3 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500 font-bold" value={empForm.basic_salary} onChange={e => setEmpForm({...empForm, basic_salary: e.target.value})} required/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Mobile Number</label>
                        <input className="w-full mt-1 p-3 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500" value={empForm.mobile_number} onChange={e => setEmpForm({...empForm, mobile_number: e.target.value})} required/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Gender</label>
                        <select className="w-full mt-1 p-3 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500" value={empForm.gender} onChange={e => setEmpForm({...empForm, gender: e.target.value})}>
                            <option value="M">Male</option><option value="F">Female</option>
                        </select>
                    </div>
                </div>
                
                <div className="pt-4 border-t dark:border-slate-800">
                    <h3 className="text-xs font-bold text-purple-600 uppercase mb-3">Bank Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-[10px] text-slate-400 uppercase">Bank</label>
                            <select className="w-full p-2 rounded-xl border dark:bg-slate-800 dark:border-slate-700" value={empForm.bank_id} onChange={e => setEmpForm({...empForm, bank_id: e.target.value, branch_id: ''})}>
                                <option value="">Select Bank...</option>{banks.map(b => <option key={b.id} value={String(b.id)}>{b.bank_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase">Branch</label>
                            <select className="w-full p-2 rounded-xl border dark:bg-slate-800 dark:border-slate-700" value={empForm.branch_id} onChange={e => setEmpForm({...empForm, branch_id: e.target.value})}>
                                <option value="">Branch...</option>{branches.map(b => <option key={b.id} value={String(b.id)}>{b.branch_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase">Account No</label>
                            <input className="w-full p-2 rounded-xl border dark:bg-slate-800 dark:border-slate-700" value={empForm.account_number} onChange={e => setEmpForm({...empForm, account_number: e.target.value})}/>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t dark:border-slate-800">
                    <button type="button" onClick={() => setIsEmpModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition">Cancel</button>
                    <button type="submit" disabled={loading} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition shadow-lg">{loading ? 'Saving...' : 'Save Employee'}</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: MONTHLY INPUT --- */}
      {isInputModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl p-6 rounded-2xl shadow-2xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-slate-800">
              <div><h2 className="text-lg font-bold">{selectedEmpInput?.full_name}</h2><p className="text-xs text-slate-500">{selectedEmpInput?.designation} | Basic: {formatMoney(selectedEmpInput?.basic_salary)}</p></div>
              <button onClick={() => setIsInputModalOpen(false)}><X size={20}/></button>
            </div>
            <form id="monthlyForm" onSubmit={handleSaveMonthly} className="flex-1 overflow-y-auto grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold text-emerald-600 uppercase mb-3 border-b pb-1">Earnings (Allowances)</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Chairman Allow</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.allow_chairman} onChange={e => setMonthlyForm({...monthlyForm, allow_chairman: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Acting Dir Allow</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.allow_acting_dir} onChange={e => setMonthlyForm({...monthlyForm, allow_acting_dir: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Telephone Allow</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.allow_telephone} onChange={e => setMonthlyForm({...monthlyForm, allow_telephone: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Fuel Allow</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.allow_fuel} onChange={e => setMonthlyForm({...monthlyForm, allow_fuel: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Cost of Living</label><input type="number" className="p-2 border rounded text-right font-bold" value={monthlyForm.allow_cost_of_living} onChange={e => setMonthlyForm({...monthlyForm, allow_cost_of_living: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">20% Special 1</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.allow_special_1} onChange={e => setMonthlyForm({...monthlyForm, allow_special_1: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">20% Special 2</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.allow_special_2} onChange={e => setMonthlyForm({...monthlyForm, allow_special_2: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Interim Allow</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.allow_interim} onChange={e => setMonthlyForm({...monthlyForm, allow_interim: e.target.value})} /></div>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-red-500 uppercase mb-3 border-b pb-1">Deductions</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Stamp Duty</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.deduct_stamp} onChange={e => setMonthlyForm({...monthlyForm, deduct_stamp: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Elec/Water</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.deduct_elec_water} onChange={e => setMonthlyForm({...monthlyForm, deduct_elec_water: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Festival Adv</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.deduct_festival} onChange={e => setMonthlyForm({...monthlyForm, deduct_festival: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Loan</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.deduct_loan} onChange={e => setMonthlyForm({...monthlyForm, deduct_loan: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Insurance</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.deduct_insurance} onChange={e => setMonthlyForm({...monthlyForm, deduct_insurance: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Welfare</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.deduct_welfare} onChange={e => setMonthlyForm({...monthlyForm, deduct_welfare: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Other</label><input type="number" className="p-2 border rounded text-right" value={monthlyForm.deduct_other} onChange={e => setMonthlyForm({...monthlyForm, deduct_other: e.target.value})} /></div>
                </div>
              </div>
            </form>
            <div className="pt-4 border-t dark:border-slate-800 flex justify-end gap-3 mt-auto">
              <button type="button" onClick={() => setIsInputModalOpen(false)} className="px-5 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition">Cancel</button>
              <button type="submit" form="monthlyForm" disabled={monthlySaving} className="px-8 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg transition">{monthlySaving ? 'Saving...' : 'Save & Finish'}</button>
            </div>
          </div>
        </div>
      )}

      {/* PAYSLIP MODAL */}
      <PayslipModal isOpen={isPayslipOpen} onClose={() => setIsPayslipOpen(false)} employee={payslipData} monthYear={reportMonth} siteName="HEAD OFFICE" formatMoney={formatMoney} isOfficeStaff={true} />

      <ConfirmDialog isOpen={statusConfirm.open} onClose={() => setStatusConfirm({ ...statusConfirm, open: false })} onConfirm={handleStatusToggle} title="Change Status?" message="Are you sure you want to change the status of this employee?" confirmText="Yes, Change" isDangerous={statusConfirm.currentStatus === 'ACTIVE'} />

    </div>
  );
};

export default OfficeStaff;