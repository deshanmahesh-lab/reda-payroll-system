import React, { useMemo } from 'react';
import { X, Printer } from 'lucide-react';

const PayslipModal = ({
  isOpen,
  onClose,
  employee,
  monthYear,
  siteName,
  companyName = 'REDA Security & Cleaning Services',
  formatMoney
}) => {
  const safeFormatMoney = (v) => {
    if (typeof formatMoney === 'function') return formatMoney(v);
    const n = Number(v || 0);
    return n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isSecurityBreakdown = useMemo(() => {
    if (!employee) return false;
    // Security has specific fields like basic_1, basic_2, or manual intensive
    return employee.basic_1 !== undefined || employee.basic_2 !== undefined || employee.intensive !== undefined;
  }, [employee]);

  const earnings = useMemo(() => {
    if (!employee) return [];
    
    // --- SECURITY STAFF EARNINGS ---
    if (isSecurityBreakdown) {
      return [
        { label: 'Basic 1', value: employee.basic_1 },
        { label: 'Basic 2', value: employee.basic_2 },
        { label: 'Budget Allowance', value: employee.budget_allowance },
        { label: 'Shift Allowance', value: employee.shift_allowance },
        { label: 'OT', value: employee.ot },
        { label: 'Incentive', value: employee.incentive },
        { label: 'Telephone Allowance', value: employee.telephone_allow },
        { label: 'Intensive', value: employee.intensive },
        { label: 'Other Allowance', value: employee.other_allowance }
      ];
    }

    // --- CLEANING STAFF EARNINGS (Updated) ---
    return [
      { label: 'Basic Salary', value: employee.basic_salary },
      { label: 'Budget Allowance', value: employee.budget_allowance },
      { label: 'Shift Allowance', value: employee.shift_allowance },
      { label: 'OT', value: employee.ot },
      { label: 'Male Allowance', value: employee.male_allowance }, // Keeping just in case, usually 0
      { label: 'Telephone Allowance', value: employee.telephone }, // Added for Cleaning
      { label: 'Special / Other Allow', value: employee.other_allowance || employee.special_allowance }
    ];
  }, [employee, isSecurityBreakdown]);

  const deductions = useMemo(() => {
    if (!employee) return [];

    // --- SECURITY STAFF DEDUCTIONS ---
    if (isSecurityBreakdown) {
      return [
        { label: 'EPF (8%)', value: employee.epf_8 },
        { label: 'Loan Deduction', value: employee.loan_deduction },
        { label: 'Salary Advance', value: employee.salary_advance },
        { label: 'Festival Advance', value: employee.festival_advance },
        { label: 'Deposit', value: employee.deposit },
        { label: 'Insurance', value: employee.insurance },
        { label: 'Welfare', value: employee.welfare },
        { label: 'Stamp Duty', value: employee.stamp_duty },
        { label: 'Other Deductions', value: employee.other_deductions }
      ];
    }

    // --- CLEANING STAFF DEDUCTIONS (Updated) ---
    return [
      { label: 'EPF (8%)', value: employee.epf_8 },
      { label: 'Loan Deduction', value: employee.loan_deduction },
      { label: 'Salary Advance', value: employee.salary_advance }, // Added for Cleaning
      { label: 'Festival Advance', value: employee.festival_advance },
      { label: 'Insurance', value: employee.insurance },
      { label: 'Welfare', value: employee.welfare },
      { label: 'Stamp Duty', value: employee.stamp_duty },
      { label: 'Other Deductions', value: employee.other_deductions }
    ];
  }, [employee, isSecurityBreakdown]);

  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 no-print">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #payslip-print-area, #payslip-print-area * {
            visibility: visible !important;
          }
          #payslip-print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            padding: 16px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border dark:border-slate-700">
        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div>
            <div className="text-lg font-extrabold">Payslip</div>
            <div className="text-xs opacity-70">Print-ready slip for the selected employee</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800" title="Close">
            <X className="opacity-70" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          <div id="payslip-print-area" className="text-slate-900 dark:text-white">
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="text-center">
                <div className="text-xl font-extrabold">{companyName}</div>
                <div className="text-sm opacity-70 mt-1">Payslip for {monthYear || '-'}</div>
                <div className="text-sm font-bold mt-1">Site: {siteName || '-'}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <div className="text-xs font-bold uppercase opacity-60">Employee</div>
                  <div className="mt-1 font-bold">{employee.full_name}</div>
                  <div className="mt-1 opacity-80">Designation: {employee.designation || '-'}</div>
                  <div className="mt-1 opacity-80">EPF No: {employee.epf_number || '-'}</div>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <div className="text-xs font-bold uppercase opacity-60">Summary</div>
                  <div className="mt-1 opacity-80">Total Shifts: <span className="font-mono font-bold">{employee.total_shifts}</span></div>
                  <div className="mt-1 opacity-80">Gross Salary: <span className="font-mono font-bold">{safeFormatMoney(employee.gross_salary)}</span></div>
                  <div className="mt-1 opacity-80">Total Deductions: <span className="font-mono font-bold">{safeFormatMoney(employee.deductions)}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <div className="text-xs font-bold uppercase opacity-60">Earnings</div>
                  <div className="mt-2 space-y-1 text-sm">
                    {earnings.map((it) => (
                      <div key={it.label} className="flex justify-between">
                        <div className="opacity-80">{it.label}</div>
                        <div className="font-mono font-bold">{safeFormatMoney(it.value)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <div className="text-xs font-bold uppercase opacity-60">Deductions</div>
                  <div className="mt-2 space-y-1 text-sm">
                    {deductions.map((it) => (
                      <div key={it.label} className="flex justify-between">
                        <div className="opacity-80">{it.label}</div>
                        <div className="font-mono font-bold">{safeFormatMoney(it.value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-200 dark:border-slate-700 pt-4 flex items-center justify-between">
                <div className="text-sm font-bold opacity-70">Net Salary</div>
                <div className="text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400">{safeFormatMoney(employee.net_salary)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">Close</button>
          <button onClick={handlePrint} className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayslipModal;