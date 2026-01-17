import React, { useState, useEffect } from 'react';
import { Plus, Search, Pencil, ArrowLeft, X, User, RefreshCcw, Power, Printer, Save, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import PayslipModal from '../components/PayslipModal';

const { ipcRenderer } = window.require('electron');

const SecurityStaff = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('MANAGE'); // MANAGE, MONTHLY, SALARY
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('ACTIVE');

  // Monthly Shifts
  const [monthYear, setMonthYear] = useState('');
  const [monthlySiteId, setMonthlySiteId] = useState('');
  const [monthlyRows, setMonthlyRows] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlySaving, setMonthlySaving] = useState(false);

  // Salary Sheets
  const [salaryMonthYear, setSalaryMonthYear] = useState('');
  const [salarySiteId, setSalarySiteId] = useState('');
  const [salaryRows, setSalaryRows] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryTotalNet, setSalaryTotalNet] = useState(0);

  // Payslip
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [selectedPayslipRow, setSelectedPayslipRow] = useState(null);

  // Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('PERSONAL');
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [statusConfirm, setStatusConfirm] = useState({ open: false, id: null, currentStatus: '' });

  // Master Data
  const [sites, setSites] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [banks, setBanks] = useState([]);
  const [branches, setBranches] = useState([]);

  const initialForm = {
    full_name: '', nic_number: '', mobile_number: '', joined_date: new Date().toISOString().split('T')[0],
    gender: 'F',
    epf_number: '', designation_id: '', site_id: '', employee_type: 'SECURITY',
    basic_salary_1: '', basic_salary_2: '', account_number: '', bank_id: '', branch_id: ''
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchEmployees();
    loadMasterData();
  }, []);

  useEffect(() => {
    if (location.state?.initialView) {
      setViewMode(location.state.initialView);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (formData.bank_id) {
      const loadBranches = async () => {
        try {
          const res = await ipcRenderer.invoke('get-branches', formData.bank_id);
          if (res.success) setBranches(res.data);
        } catch (error) {}
      };
      loadBranches();
    } else {
      setBranches([]);
    }
  }, [formData.bank_id]);

  const fetchEmployees = async () => {
    try {
      const res = await ipcRenderer.invoke('get-employees', 'SECURITY');
      if (res.success) setEmployees(res.data);
    } catch (error) { toast.error('Failed to load employees'); }
  };

  const loadMasterData = async () => {
    try {
      const s = await ipcRenderer.invoke('get-sites', { status: 'ACTIVE' });
      if (s.success) setSites(s.data);
      const d = await ipcRenderer.invoke('get-designations', { status: 'ACTIVE' });
      if (d.success) setDesignations((d.data || []).filter(item => item.department === 'SECURITY'));
      const b = await ipcRenderer.invoke('get-banks');
      if (b.success) setBanks(b.data);
    } catch (error) { toast.error('Failed to load master data'); }
  };

  const filteredEmployees = employees.filter(emp => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (emp.epf_number || '').toLowerCase().includes(term) ||
      (emp.nic_number || '').toLowerCase().includes(term) ||
      (emp.full_name || '').toLowerCase().includes(term);
    const matchesStatus = emp.status === employeeStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatMoney = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getSelectedSalarySiteName = () => {
    const s = sites.find(x => String(x.id) === String(salarySiteId));
    return s?.site_name || '';
  };

  // --- PRINT REPORT (LEGAL LANDSCAPE) ---
  const handlePrintSalaryReport = () => {
    const siteName = getSelectedSalarySiteName();
    const printWindow = window.open('', '_blank');
    
    // Calculate totals
    const totals = salaryRows.reduce((acc, r) => ({
      shifts: acc.shifts + Number(r.total_shifts),
      basicTotal: acc.basicTotal + Number(r.basic_total),
      budget: acc.budget + Number(r.budget_allowance),
      shiftAllow: acc.shiftAllow + Number(r.shift_allowance),
      grossBase: acc.grossBase + Number(r.gross_salary),
      ot: acc.ot + Number(r.ot),
      incentive: acc.incentive + Number(r.incentive),
      totalGross: acc.totalGross + Number(r.total_gross_salary),
      epf8: acc.epf8 + Number(r.epf_8),
      totalDed: acc.totalDed + Number(r.deductions),
      net: acc.net + Number(r.net_salary),
      epf12: acc.epf12 + Number(r.epf_12),
      etf3: acc.etf3 + Number(r.etf_3),
      gratuity: acc.gratuity + Number(r.gratuity)
    }), { shifts:0, basicTotal:0, budget:0, shiftAllow:0, grossBase:0, ot:0, incentive:0, totalGross:0, epf8:0, totalDed:0, net:0, epf12:0, etf3:0, gratuity:0 });

    const htmlContent = `
      <html>
      <head>
        <title>Security Salary Report - ${siteName}</title>
        <style>
          @page { size: 35.56cm 21.59cm; margin: 1cm; orientation: landscape; }
          body { font-family: 'Courier New', monospace; font-size: 10px; }
          h1, h2 { text-align: center; margin: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 4px; text-align: right; }
          th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
          .left { text-align: left; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>REGIONAL ECONOMIC DEVELOPMENT AGENCY</h1>
        <h2>SECURITY SERVICE SALARY - ${siteName} - ${salaryMonthYear}</h2>
        <table>
          <thead>
            <tr>
              <th rowspan="2">EPF</th><th rowspan="2">NAME</th><th rowspan="2">POS</th><th rowspan="2">S</th>
              <th colspan="5">EARNINGS</th>
              <th colspan="5">ADDITIONS</th>
              <th rowspan="2">TOTAL<br>GROSS</th>
              <th colspan="9">DEDUCTIONS</th>
              <th rowspan="2">TOTAL<br>DED</th>
              <th rowspan="2">NET<br>SALARY</th>
              <th colspan="3">EMPLOYER</th>
            </tr>
            <tr>
              <th>BASIC 1</th><th>BASIC 2</th><th>BUDGET</th><th>SHIFT A</th><th>GROSS</th>
              <th>OT</th><th>INCEN</th><th>PHONE</th><th>OTHER</th><th>-</th>
              <th>EPF 8%</th><th>LOAN</th><th>ADV</th><th>FEST</th><th>DEP</th><th>STAMP</th><th>INS</th><th>WELF</th><th>OTH</th>
              <th>EPF 12%</th><th>ETF 3%</th><th>GRAT</th>
            </tr>
          </thead>
          <tbody>
            ${salaryRows.map(r => `
              <tr>
                <td class="left">${r.epf_number}</td>
                <td class="left" style="white-space:nowrap;">${r.full_name}</td>
                <td class="center">${r.designation}</td>
                <td class="center">${r.total_shifts}</td>
                <td>${formatMoney(r.basic_1)}</td>
                <td>${formatMoney(r.basic_2)}</td>
                <td>${formatMoney(r.budget_allowance)}</td>
                <td>${formatMoney(r.shift_allowance)}</td>
                <td class="bold">${formatMoney(r.gross_salary)}</td>
                <td>${formatMoney(r.ot)}</td>
                <td>${formatMoney(r.incentive)}</td>
                <td>${formatMoney(r.telephone_allow)}</td>
                <td>${formatMoney(r.other_allowance)}</td>
                <td>-</td>
                <td class="bold">${formatMoney(r.total_gross_salary)}</td>
                <td>${formatMoney(r.epf_8)}</td>
                <td>${formatMoney(r.loan_deduction)}</td>
                <td>${formatMoney(r.salary_advance)}</td>
                <td>${formatMoney(r.festival_advance)}</td>
                <td>${formatMoney(r.deposit)}</td>
                <td>${formatMoney(r.stamp_duty)}</td>
                <td>${formatMoney(r.insurance)}</td>
                <td>${formatMoney(r.welfare)}</td>
                <td>${formatMoney(r.other_deductions)}</td>
                <td class="bold">${formatMoney(r.deductions)}</td>
                <td class="bold" style="font-size:11px;">${formatMoney(r.net_salary)}</td>
                <td>${formatMoney(r.epf_12)}</td>
                <td>${formatMoney(r.etf_3)}</td>
                <td>${formatMoney(r.gratuity)}</td>
              </tr>
            `).join('')}
            <tr class="bold" style="background:#eee;">
              <td colspan="3" class="center">TOTALS</td>
              <td class="center">${totals.shifts}</td>
              <td>-</td><td>-</td>
              <td>${formatMoney(totals.budget)}</td>
              <td>${formatMoney(totals.shiftAllow)}</td>
              <td>${formatMoney(totals.grossBase)}</td>
              <td>${formatMoney(totals.ot)}</td>
              <td>${formatMoney(totals.incentive)}</td>
              <td>-</td><td>-</td><td>-</td>
              <td>${formatMoney(totals.totalGross)}</td>
              <td>${formatMoney(totals.epf8)}</td>
              <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
              <td>${formatMoney(totals.totalDed)}</td>
              <td>${formatMoney(totals.net)}</td>
              <td>${formatMoney(totals.epf12)}</td>
              <td>${formatMoney(totals.etf3)}</td>
              <td>${formatMoney(totals.gratuity)}</td>
            </tr>
          </tbody>
        </table>
        <br/><br/>
        <div style="display:flex; justify-content:space-between; padding:0 2cm;">
          <div>Prepared By: ........................</div>
          <div>Checked By: ........................</div>
          <div>Approved By: ........................</div>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  // --- PRINT BANK SLIP ---
  const handlePrintBankSlip = () => {
    if (salaryRows.length === 0) return;
    const printWindow = window.open('', '_blank');
    const salaryDate = new Date().toISOString().split('T')[0];

    const htmlContent = `
      <html>
      <head>
        <title>Bank Slip - ${salaryMonthYear}</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 5px; text-align: left; }
          th { background-color: #f0f0f0; }
        </style>
      </head>
      <body>
        <h2>Bank Transfer Slip (Security) - ${getSelectedSalarySiteName()}</h2>
        <table>
          <thead>
            <tr>
              <th>0000</th>
              <th>Bank Code</th>
              <th>Branch Code</th>
              <th>Account No</th>
              <th>Full Name</th>
              <th>52</th>
              <th>00</th>
              <th>0</th>
              <th>000000</th>
              <th>Net Salary</th>
              <th>SLR</th>
              <th>7010</th>
              <th>002</th>
              <th>000008848232</th>
              <th>REDA</th>
              <th>EPF No</th>
              <th>Month</th>
              <th>Date</th>
              <th>000000</th>
            </tr>
          </thead>
          <tbody>
            ${salaryRows.map(r => `
              <tr>
                <td>0000</td>
                <td>${r.bank_code || '---'}</td>
                <td>${r.branch_code || '---'}</td>
                <td>${r.account_number || '---'}</td>
                <td>${r.full_name}</td>
                <td>52</td>
                <td>00</td>
                <td>0</td>
                <td>000000</td>
                <td>${(Number(r.net_salary)*100).toFixed(0).toString().padStart(12, '0')}</td>
                <td>SLR</td>
                <td>7010</td>
                <td>002</td>
                <td>000008848232</td>
                <td>REDA</td>
                <td>${r.epf_number}</td>
                <td>${salaryMonthYear}</td>
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

  // --- CSV Export Logic ---
  const downloadCsv = (rows, filename) => {
    const escape = (val) => {
      const s = String(val ?? '');
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const headers = [
      'EPF No', 'Name', 'Designation', 'Shifts',
      'Basic 1', 'Basic 2', 'Budget', 'Shift Allow', 'GROSS (Base)',
      'OT', 'Incentive', 'Phone', 'Other', 'TOTAL GROSS',
      'EPF 8%', 'Insurance', 'Welfare', 'Loan', 'Advance', 'Festival', 'Deposit', 'Stamp', 'Other Ded',
      'Total Ded', 'NET SALARY',
      'EPF 12%', 'ETF 3%', 'Gratuity'
    ];
    const lines = [headers.map(escape).join(',')];
    (rows || []).forEach((r) => {
      lines.push([
        r.epf_number, r.full_name, r.designation, r.total_shifts,
        r.basic_1, r.basic_2, r.budget_allowance, r.shift_allowance, r.gross_salary,
        r.ot, r.incentive, r.telephone_allow, r.other_allowance, r.total_gross_salary,
        r.epf_8, r.insurance, r.welfare, r.loan_deduction, r.salary_advance, r.festival_advance, r.deposit, r.stamp_duty, r.other_deductions,
        r.deductions, r.net_salary,
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

  const handleExportSalaryCsv = () => {
    if (!salaryMonthYear || !salarySiteId || salaryRows.length === 0) {
      toast.error('No salary data to export');
      return;
    }
    const siteName = (getSelectedSalarySiteName() || 'SITE').replace(/[^a-z0-9_-]/gi, '_');
    const month = String(salaryMonthYear).replace(/[^0-9-]/g, '');
    downloadCsv(salaryRows, `Security_Salary_${month}_${siteName}.csv`);
  };

  const openPayslip = (row) => { setSelectedPayslipRow(row); setIsPayslipOpen(true); };

  // --- Form Handlers ---
  const validateForm = () => {
    const newErrors = {};
    if (!formData.full_name.trim()) newErrors.full_name = 'Required';
    if (!formData.nic_number.trim()) newErrors.nic_number = 'Required';
    if (!formData.mobile_number.trim()) newErrors.mobile_number = 'Required';
    if (!formData.epf_number.trim()) newErrors.epf_number = 'Required';
    if (!formData.designation_id) newErrors.designation_id = 'Required';
    if (!formData.site_id) newErrors.site_id = 'Required';
    
    // Note: Basic Salary inputs are optional here as they are calculated, 
    // but kept in form if manual override needed in future (though currently ignored by flexible logic if name-based)
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix errors.');
      if (newErrors.full_name || newErrors.nic_number) setActiveTab('PERSONAL');
      else if (newErrors.designation_id || newErrors.site_id) setActiveTab('JOB');
      else if (newErrors.account_number) setActiveTab('BANK');
      return false;
    }
    return true;
  };

  const handleAddNew = () => {
    setEditingId(null); setFormData(initialForm); setErrors({}); setActiveTab('PERSONAL'); setIsModalOpen(true);
  };

  const handleEdit = (emp) => {
    setEditingId(emp.id); setErrors({});
    let formattedDate = new Date().toISOString().split('T')[0];
    if (emp.joined_date) {
      const d = new Date(emp.joined_date);
      if (!isNaN(d.getTime())) formattedDate = d.toISOString().split('T')[0];
    }
    setFormData({
      full_name: emp.full_name || '', nic_number: emp.nic_number || '', mobile_number: emp.mobile_number || '',
      gender: emp.gender === 'M' || emp.gender === 'F' ? emp.gender : 'F',
      joined_date: formattedDate, epf_number: emp.epf_number || '',
      designation_id: emp.designation_id ? String(emp.designation_id) : '',
      site_id: emp.site_id ? String(emp.site_id) : '',
      employee_type: 'SECURITY',
      basic_salary_1: emp.basic_salary_1 || '', basic_salary_2: emp.basic_salary_2 || '',
      account_number: emp.account_number || '',
      bank_id: emp.bank_id ? String(emp.bank_id) : '',
      branch_id: emp.branch_id ? String(emp.branch_id) : ''
    });
    setActiveTab('PERSONAL'); setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const payload = {
        ...formData,
        designation_id: formData.designation_id ? Number(formData.designation_id) : null,
        site_id: formData.site_id ? Number(formData.site_id) : null,
        basic_salary_1: Number(formData.basic_salary_1 || 0),
        basic_salary_2: Number(formData.basic_salary_2 || 0),
        bank_id: formData.bank_id ? Number(formData.bank_id) : null,
        branch_id: formData.branch_id ? Number(formData.branch_id) : null
      };
      let res;
      if (editingId) res = await ipcRenderer.invoke('update-employee', { ...payload, id: editingId });
      else res = await ipcRenderer.invoke('add-employee', payload);

      if (res?.success) {
        toast.success(res.message || 'Saved'); setIsModalOpen(false); fetchEmployees();
      } else { toast.error(res?.message || 'Save failed'); }
    } catch (error) { toast.error('System Error'); }
    setLoading(false);
  };

  const handleStatusToggle = async () => {
    if (!statusConfirm.id) return;
    const res = await ipcRenderer.invoke('toggle-status-employee', { id: statusConfirm.id, currentStatus: statusConfirm.currentStatus });
    if (res.success) { toast.success(res.message); fetchEmployees(); } else { toast.error('Failed'); }
    setStatusConfirm({ open: false, id: null, currentStatus: '' });
  };

  // --- Monthly Shifts Logic ---
  const handleLoadMonthly = async () => {
    if (!monthYear || !monthlySiteId) { toast.error('Select Month and Site'); return; }
    setMonthlyLoading(true);
    try {
      const res = await ipcRenderer.invoke('get-monthly-shifts', { site_id: monthlySiteId, month_year: monthYear, employee_type: 'SECURITY' });
      if (res.success) {
        const normalized = (res.data || []).map((r) => ({
          ...r,
          total_shifts: r.total_shifts ?? 0,
          intensive: r.intensive ?? 0,
          other_allowance: r.other_allowance ?? 0,
          telephone_allow: r.telephone_allow ?? 0,
          loan_deduction: r.loan_deduction ?? 0,
          salary_advance: r.salary_advance ?? 0,
          festival_advance: r.festival_advance ?? 0,
          deposit: r.deposit ?? 0,
          other_deductions: r.other_deductions ?? 0
        }));
        setMonthlyRows(normalized);
      } else { toast.error(res.message); }
    } catch (error) { toast.error('Error loading data'); }
    setMonthlyLoading(false);
  };

  const updateMonthlyRow = (id, field, value) => {
    setMonthlyRows(prev => prev.map(r => r.employee_id === id ? { ...r, [field]: value } : r));
  };

  const handleSaveMonthly = async () => {
    if (!monthYear || !monthlySiteId) return;
    setMonthlySaving(true);
    try {
      const payload = monthlyRows.map(r => ({
        employee_id: r.employee_id, site_id: monthlySiteId, month_year: monthYear, employee_type: 'SECURITY',
        total_shifts: Number(r.total_shifts || 0),
        intensive: Number(r.intensive || 0),
        other_allowance: Number(r.other_allowance || 0),
        telephone_allow: Number(r.telephone_allow || 0),
        loan_deduction: Number(r.loan_deduction || 0),
        salary_advance: Number(r.salary_advance || 0),
        festival_advance: Number(r.festival_advance || 0),
        deposit: Number(r.deposit || 0),
        other_deductions: Number(r.other_deductions || 0)
      }));
      const res = await ipcRenderer.invoke('save-monthly-shifts', payload);
      if (res.success) { toast.success('Saved!'); handleLoadMonthly(); } else { toast.error('Save failed'); }
    } catch (error) { toast.error('Save failed'); }
    setMonthlySaving(false);
  };

  // --- Salary Calc Logic ---
  const handleGenerateSalaries = async () => {
    if (!salaryMonthYear || !salarySiteId) { toast.error('Select Month and Site'); return; }
    setSalaryLoading(true);
    try {
      const res = await ipcRenderer.invoke('calculate-security-salaries', { site_id: salarySiteId, month_year: salaryMonthYear });
      if (res.success) {
        setSalaryRows(res.data || []);
        setSalaryTotalNet(Number(res.summary?.total_net_salary || 0));
      } else { toast.error(res.message || 'Calculation failed'); }
    } catch (e) { toast.error('Calculation failed'); }
    setSalaryLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-white flex flex-col h-screen font-sans">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Security Staff</h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Payroll & Shift Management</p>
          </div>
        </div>

        <div className="flex gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-sm border dark:border-slate-800">
          {['MANAGE', 'MONTHLY', 'SALARY'].map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode)} 
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === mode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {mode === 'MANAGE' ? 'Employees' : mode === 'MONTHLY' ? 'Monthly Shifts' : 'Salary Sheets'}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW: MANAGE EMPLOYEES */}
      {viewMode === 'MANAGE' && (
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border dark:border-slate-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
            <div className="flex gap-2">
              <button onClick={() => setEmployeeStatusFilter('ACTIVE')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${employeeStatusFilter === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'}`}>Active</button>
              <button onClick={() => setEmployeeStatusFilter('TERMINATED')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${employeeStatusFilter === 'TERMINATED' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'}`}>Past</button>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input type="text" placeholder="Search EPF, Name..." className="pl-9 pr-4 py-2 w-64 text-sm rounded-xl bg-white dark:bg-slate-800 border dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition"><Plus size={16} /> Add Employee</button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm">
                <tr className="text-xs font-bold uppercase text-slate-500 border-b dark:border-slate-700">
                  <th className="p-4">Name</th>
                  <th className="p-4">EPF / NIC</th>
                  <th className="p-4">Designation</th>
                  <th className="p-4">Site</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEmployees.length === 0 ? (
                  <tr><td colSpan="6" className="p-10 text-center text-slate-400 text-sm">No employees found.</td></tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4 text-sm font-medium flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><User size={16}/></div> {emp.full_name}</td>
                      <td className="p-4 text-sm"><div className="font-mono font-bold text-slate-700 dark:text-slate-300">{emp.epf_number}</div><div className="text-xs text-slate-400">{emp.nic_number}</div></td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{emp.designation_title}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{emp.site_name}</td>
                      <td className="p-4"><span className={`px-2 py-1 text-[10px] font-bold rounded-full border ${emp.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{emp.status}</span></td>
                      <td className="p-4 flex justify-end gap-2">
                        <button onClick={() => handleEdit(emp)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"><Pencil size={14} /></button>
                        <button onClick={() => setStatusConfirm({ open: true, id: emp.id, currentStatus: emp.status })} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">{emp.status === 'ACTIVE' ? <Power size={14} /> : <RefreshCcw size={14} />}</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: MONTHLY SHIFTS */}
      {viewMode === 'MONTHLY' && (
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border dark:border-slate-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b dark:border-slate-800 flex items-end gap-4 bg-slate-50/50 dark:bg-slate-900">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">Select Month</label>
              <input type="month" className="mt-1 block w-40 p-2 text-sm rounded-xl border-slate-300 dark:bg-slate-800 dark:border-slate-700 focus:ring-blue-500" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Select Site</label>
              <select className="mt-1 block w-full p-2 text-sm rounded-xl border-slate-300 dark:bg-slate-800 dark:border-slate-700 focus:ring-blue-500" value={monthlySiteId} onChange={(e) => setMonthlySiteId(e.target.value)}>
                <option value="">Select Site...</option>
                {sites.map(s => <option key={s.id} value={String(s.id)}>{s.site_name}</option>)}
              </select>
            </div>
            <button onClick={handleLoadMonthly} disabled={monthlyLoading} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg transition">{monthlyLoading ? 'Loading...' : 'Load Data'}</button>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-20 shadow-sm">
                <tr className="text-[10px] font-bold uppercase text-slate-500 border-b dark:border-slate-700">
                  <th className="p-3 sticky left-0 bg-slate-100 dark:bg-slate-800 z-20 min-w-[200px]">Employee Name</th>
                  <th className="p-3 text-center bg-blue-50 dark:bg-blue-900/10 text-blue-700">No.of Shifts</th>
                  
                  <th className="p-3 text-right min-w-[120px]">Telephone Allowance</th>
                  <th className="p-3 text-right min-w-[120px]">Other/ Allowances</th>
                  <th className="p-3 text-right min-w-[100px] border-l dark:border-slate-700">Loans</th>
                  <th className="p-3 text-right min-w-[100px]">Advance</th>
                  <th className="p-3 text-right min-w-[100px]">Festival Adv</th>
                  <th className="p-3 text-right min-w-[100px]">Deposit</th>
                  <th className="p-3 text-right min-w-[100px]">Other</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthlyRows.length === 0 ? (
                  <tr><td colSpan="9" className="p-10 text-center text-slate-400 text-sm">Select Month & Site to start data entry.</td></tr>
                ) : (
                  monthlyRows.map((r) => (
                    <tr key={r.employee_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group">
                      <td className="p-3 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 z-10 border-r dark:border-slate-800">
                        <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{r.full_name}</div>
                        <div className="text-[10px] text-slate-400">{r.designation}</div>
                      </td>
                      <td className="p-2 text-center bg-blue-50/30 dark:bg-blue-900/5">
                        <input type="number" className="w-16 p-1.5 text-center font-bold text-blue-700 bg-white dark:bg-slate-800 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                          value={r.total_shifts} onChange={(e) => updateMonthlyRow(r.employee_id, 'total_shifts', e.target.value)} />
                      </td>
                      <td className="p-2 text-right"><input type="number" placeholder="-" className="w-full p-1.5 text-right text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none" value={r.telephone_allow} onChange={(e) => updateMonthlyRow(r.employee_id, 'telephone_allow', e.target.value)} /></td>
                      <td className="p-2 text-right"><input type="number" placeholder="-" className="w-full p-1.5 text-right text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none" value={r.other_allowance} onChange={(e) => updateMonthlyRow(r.employee_id, 'other_allowance', e.target.value)} /></td>
                      
                      <td className="p-2 text-right border-l dark:border-slate-700"><input type="number" placeholder="-" className="w-full p-1.5 text-right text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-red-500 outline-none text-red-600" value={r.loan_deduction} onChange={(e) => updateMonthlyRow(r.employee_id, 'loan_deduction', e.target.value)} /></td>
                      <td className="p-2 text-right"><input type="number" placeholder="-" className="w-full p-1.5 text-right text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-red-500 outline-none text-red-600" value={r.salary_advance} onChange={(e) => updateMonthlyRow(r.employee_id, 'salary_advance', e.target.value)} /></td>
                      <td className="p-2 text-right"><input type="number" placeholder="-" className="w-full p-1.5 text-right text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-red-500 outline-none text-red-600" value={r.festival_advance} onChange={(e) => updateMonthlyRow(r.employee_id, 'festival_advance', e.target.value)} /></td>
                      <td className="p-2 text-right"><input type="number" placeholder="-" className="w-full p-1.5 text-right text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-red-500 outline-none text-red-600" value={r.deposit} onChange={(e) => updateMonthlyRow(r.employee_id, 'deposit', e.target.value)} /></td>
                      <td className="p-2 text-right"><input type="number" placeholder="-" className="w-full p-1.5 text-right text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-red-500 outline-none text-red-600" value={r.other_deductions} onChange={(e) => updateMonthlyRow(r.employee_id, 'other_deductions', e.target.value)} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
            <button onClick={handleSaveMonthly} disabled={monthlySaving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition disabled:opacity-50">
              <Save size={18} /> {monthlySaving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      )}

      {/* VIEW: SALARY SHEET (Simplified Table + Print/CSV) */}
      {viewMode === 'SALARY' && (
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border dark:border-slate-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b dark:border-slate-800 flex items-end gap-4 bg-slate-50/50 dark:bg-slate-900">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">Select Month</label>
              <input type="month" className="mt-1 block w-40 p-2 text-sm rounded-xl border-slate-300 dark:bg-slate-800 dark:border-slate-700 focus:ring-blue-500" value={salaryMonthYear} onChange={(e) => setSalaryMonthYear(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Select Site</label>
              <select className="mt-1 block w-full p-2 text-sm rounded-xl border-slate-300 dark:bg-slate-800 dark:border-slate-700 focus:ring-blue-500" value={salarySiteId} onChange={(e) => setSalarySiteId(e.target.value)}>
                <option value="">Select Site...</option>
                {sites.map(s => <option key={s.id} value={String(s.id)}>{s.site_name}</option>)}
              </select>
            </div>
            <button onClick={handleExportSalaryCsv} disabled={salaryRows.length === 0} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-xl text-sm font-bold transition disabled:opacity-50"><FileText size={16}/> CSV</button>
            <button onClick={handlePrintSalaryReport} disabled={salaryRows.length === 0} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50 ml-2"><Printer size={16}/> Report</button>
            <button onClick={handlePrintBankSlip} disabled={salaryRows.length === 0} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50 ml-2"><FileText size={16}/> Bank Slip</button>
            <button onClick={handleGenerateSalaries} disabled={salaryLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg transition disabled:opacity-50 ml-2">{salaryLoading ? 'Generating...' : 'Generate Salaries'}</button>
          </div>

          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-sm">
                <tr className="text-[10px] font-bold uppercase text-slate-500 border-b dark:border-slate-700">
                  <th className="p-3 min-w-[150px]">Name</th>
                  <th className="p-3 text-right">Shifts</th>
                  <th className="p-3 text-right">Basic Total</th>
                  <th className="p-3 text-right">Budget</th>
                  <th className="p-3 text-right">Shift Allow</th>
                  <th className="p-3 text-right bg-blue-50 dark:bg-blue-900/20">GROSS (Base)</th>
                  <th className="p-3 text-right">OT</th>
                  <th className="p-3 text-right">Incentive</th>
                  <th className="p-3 text-right bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700">TOTAL GROSS</th>
                  <th className="p-3 text-right text-red-600">Total Ded</th>
                  <th className="p-3 text-right font-bold text-emerald-600">NET SALARY</th>
                  <th className="p-3 text-center sticky right-0 bg-white dark:bg-slate-900 shadow-l">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {salaryRows.length === 0 ? (
                  <tr><td colSpan="12" className="p-10 text-center text-slate-400 text-sm">Select Month & Site, then click Generate Salaries.</td></tr>
                ) : (
                  salaryRows.map((r) => (
                    <tr key={r.employee_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3 text-sm font-medium">{r.full_name}</td>
                      <td className="p-3 text-right font-mono text-sm">{r.total_shifts}</td>
                      <td className="p-3 text-right font-mono text-xs text-slate-500">{formatMoney(r.basic_total)}</td>
                      <td className="p-3 text-right font-mono text-xs text-slate-500">{formatMoney(r.budget_allowance)}</td>
                      <td className="p-3 text-right font-mono text-xs text-slate-500">{formatMoney(r.shift_allowance)}</td>
                      <td className="p-3 text-right font-mono text-sm font-bold bg-blue-50/50 dark:bg-blue-900/10">{formatMoney(r.gross_salary)}</td>
                      <td className="p-3 text-right font-mono text-xs text-slate-500">{formatMoney(r.ot)}</td>
                      <td className="p-3 text-right font-mono text-xs text-slate-500">{formatMoney(r.incentive)}</td>
                      <td className="p-3 text-right font-mono text-sm font-bold text-emerald-600">{formatMoney(r.total_gross_salary)}</td>
                      <td className="p-3 text-right font-mono text-xs font-bold text-red-600">{formatMoney(r.deductions)}</td>
                      <td className="p-3 text-right font-mono text-sm font-black text-emerald-600">{formatMoney(r.net_salary)}</td>
                      <td className="p-3 text-center sticky right-0 bg-white dark:bg-slate-900 shadow-l">
                        <button onClick={() => openPayslip(r)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Printer size={16} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
             <div className="text-xs font-bold uppercase text-slate-400">Total Net Salary (Site)</div>
             <div className="text-xl font-black text-emerald-600 font-mono tracking-tighter">{formatMoney(salaryTotalNet)} LKR</div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <PayslipModal isOpen={isPayslipOpen} onClose={() => setIsPayslipOpen(false)} employee={selectedPayslipRow} monthYear={salaryMonthYear} siteName={getSelectedSalarySiteName()} formatMoney={formatMoney} />
      
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
              <h2 className="text-lg font-bold">{editingId ? 'Edit' : 'New'} Employee</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition"><X size={20} className="text-slate-500" /></button>
            </div>
            <div className="flex border-b dark:border-slate-800">
              {['PERSONAL', 'JOB', 'BANK'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 p-3 text-xs font-bold uppercase tracking-wider transition ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{tab}</button>
              ))}
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="empForm" onSubmit={handleSave} className="space-y-4">
                {activeTab === 'PERSONAL' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Full Name</label>
                      <input className="w-full mt-1 p-3 rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">NIC Number</label>
                      <input className={`w-full mt-1 p-3 rounded-xl border-2 dark:bg-slate-800 dark:border-slate-700 outline-none transition ${errors.nic_number ? 'border-red-500' : 'border-slate-100'}`} value={formData.nic_number} onChange={e => setFormData({ ...formData, nic_number: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">Mobile</label>
                      <input className="w-full mt-1 p-3 rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.mobile_number} onChange={e => setFormData({ ...formData, mobile_number: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">Gender</label>
                      <select className="w-full mt-1 p-3 rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.gender || 'F'} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                        <option value="F">Female</option>
                        <option value="M">Male</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">EPF Number</label>
                      <input className={`w-full mt-1 p-3 rounded-xl border-2 dark:bg-slate-800 dark:border-slate-700 outline-none transition ${errors.epf_number ? 'border-red-500' : 'border-slate-100'}`} value={formData.epf_number} onChange={e => setFormData({ ...formData, epf_number: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">Joined Date</label>
                      <input type="date" className="w-full mt-1 p-3 rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.joined_date} onChange={e => setFormData({ ...formData, joined_date: e.target.value })} />
                    </div>
                  </div>
                )}
                {activeTab === 'JOB' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">Designation</label>
                      <select className="w-full mt-1 p-3 rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.designation_id} onChange={e => setFormData({ ...formData, designation_id: e.target.value })}>
                        <option value="">Select...</option>
                        {designations.map(d => <option key={d.id} value={String(d.id)}>{d.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">Site</label>
                      <select className="w-full mt-1 p-3 rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.site_id} onChange={e => setFormData({ ...formData, site_id: e.target.value })}>
                        <option value="">Select...</option>
                        {sites.map(s => <option key={s.id} value={String(s.id)}>{s.site_name}</option>)}
                      </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400">Basic 1</label>
                        <input type="number" className="w-full mt-1 p-3 rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.basic_salary_1} onChange={e => setFormData({ ...formData, basic_salary_1: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400">Basic 2</label>
                        <input type="number" className="w-full mt-1 p-3 rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.basic_salary_2} onChange={e => setFormData({ ...formData, basic_salary_2: e.target.value })} />
                    </div>
                  </div>
                )}
                {activeTab === 'BANK' && (
                  <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Bank</label>
                      <select className="w-full mt-1 p-3 rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.bank_id} onChange={e => setFormData({ ...formData, bank_id: e.target.value, branch_id: '' })}>
                        <option value="">Select...</option>
                        {banks.map(b => <option key={b.id} value={String(b.id)}>{b.bank_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">Branch</label>
                      <select className="w-full mt-1 p-3 rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.branch_id} onChange={e => setFormData({ ...formData, branch_id: e.target.value })}>
                        <option value="">Select...</option>
                        {branches.map(br => <option key={br.id} value={String(br.id)}>{br.branch_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">Account No</label>
                      <input className="w-full mt-1 p-3 rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.account_number} onChange={e => setFormData({ ...formData, account_number: e.target.value })} />
                    </div>
                  </div>
                )}
              </form>
            </div>
            <div className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition">Cancel</button>
              <button type="submit" form="empForm" disabled={loading} className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg transition disabled:opacity-50">{loading ? 'Saving...' : 'Save Employee'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={statusConfirm.open} onClose={() => setStatusConfirm({ ...statusConfirm, open: false })} onConfirm={handleStatusToggle} title={statusConfirm.currentStatus === 'ACTIVE' ? 'Terminate Employee?' : 'Re-activate Employee?'} message="Are you sure you want to change this employee's status?" confirmText="Yes, Change" isDangerous={statusConfirm.currentStatus === 'ACTIVE'} />
    </div>
  );
};

export default SecurityStaff;