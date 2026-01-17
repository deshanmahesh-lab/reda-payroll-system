import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const startUrl = 'http://localhost:5173';
  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// ================= API HANDLERS =================

// --- LOGIN ---
ipcMain.handle('login-request', async (event, { username, password }) => {
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ? AND status = ?', [username, 'ACTIVE']);
    if (rows.length === 0) return { success: false, message: 'Invalid credentials.' };
    return { success: true, user: { id: rows[0].id, name: rows[0].full_name, role: rows[0].role } };
  } catch (error) { return { success: false, message: 'Database error.' }; }
});

// --- MASTER DATA ---
ipcMain.handle('get-sites', async (event, filter) => {
  try {
    const status = filter?.status;
    if (!status || String(status).toUpperCase() === 'ALL') {
      const [rows] = await db.execute('SELECT * FROM master_sites ORDER BY id DESC');
      return { success: true, data: rows };
    }
    const normalized = String(status).toUpperCase();
    const [rows] = await db.execute('SELECT * FROM master_sites WHERE status = ? ORDER BY id DESC', [normalized]);
    return { success: true, data: rows };
  } catch (e) { return { success: false }; }
});
ipcMain.handle('add-site', async (event, data) => {
  try {
    await db.execute(
      'INSERT INTO master_sites (site_name, location, contact_number, status) VALUES (?, ?, ?, ?)',
      [data.site_name, data.location, data.contact_number, 'ACTIVE']
    );
    return { success: true, message: 'Site added!' };
  } catch (e) { return { success: false }; }
});
ipcMain.handle('update-site', async (event, data) => { try { await db.execute('UPDATE master_sites SET site_name=?, location=?, contact_number=? WHERE id=?', [data.site_name, data.location, data.contact_number, data.id]); return { success: true, message: 'Site updated!' }; } catch (e) { return { success: false }; } });
ipcMain.handle('delete-site', async (event, id) => {
  try {
    await db.execute("UPDATE master_sites SET status='INACTIVE' WHERE id=?", [id]);
    return { success: true, message: 'Deactivated!' };
  } catch (e) { return { success: false }; }
});

ipcMain.handle('reactivate-site', async (event, id) => {
  try {
    await db.execute("UPDATE master_sites SET status='ACTIVE' WHERE id=?", [id]);
    return { success: true, message: 'Re-activated!' };
  } catch (e) { return { success: false }; }
});

ipcMain.handle('get-designations', async (event, filter) => {
  try {
    const status = filter?.status;
    if (!status || String(status).toUpperCase() === 'ALL') {
      const [rows] = await db.execute('SELECT * FROM master_designations ORDER BY id DESC');
      return { success: true, data: rows };
    }
    const normalized = String(status).toUpperCase();
    const [rows] = await db.execute('SELECT * FROM master_designations WHERE status = ? ORDER BY id DESC', [normalized]);
    return { success: true, data: rows };
  } catch (e) { return { success: false }; }
});

ipcMain.handle('add-designation', async (event, data) => {
  try {
    const dailyRate = Number(data?.daily_rate || 0);
    await db.execute(
      'INSERT INTO master_designations (title, department, daily_rate, status) VALUES (?, ?, ?, ?)',
      [data.title, data.department, Number.isFinite(dailyRate) ? dailyRate : 0, 'ACTIVE']
    );
    return { success: true, message: 'Designation added!' };
  } catch (e) { return { success: false }; }
});

ipcMain.handle('update-designation', async (event, data) => {
  try {
    const dailyRate = Number(data?.daily_rate || 0);
    await db.execute(
      'UPDATE master_designations SET title=?, department=?, daily_rate=? WHERE id=?',
      [data.title, data.department, Number.isFinite(dailyRate) ? dailyRate : 0, data.id]
    );
    return { success: true, message: 'Updated!' };
  } catch (e) { return { success: false }; }
});

ipcMain.handle('delete-designation', async (event, id) => {
  try {
    await db.execute("UPDATE master_designations SET status='INACTIVE' WHERE id=?", [id]);
    return { success: true, message: 'Deactivated!' };
  } catch (e) { return { success: false }; }
});

ipcMain.handle('reactivate-designation', async (event, id) => {
  try {
    await db.execute("UPDATE master_designations SET status='ACTIVE' WHERE id=?", [id]);
    return { success: true, message: 'Re-activated!' };
  } catch (e) { return { success: false }; }
});

ipcMain.handle('get-banks', async () => { try { const [rows] = await db.execute('SELECT * FROM master_banks ORDER BY bank_name ASC'); return { success: true, data: rows }; } catch (e) { return { success: false }; } });
ipcMain.handle('add-bank', async (event, data) => { try { await db.execute('INSERT INTO master_banks (bank_name, bank_code) VALUES (?, ?)', [data.bank_name, data.bank_code]); return { success: true, message: 'Bank added!' }; } catch (e) { return { success: false }; } });
ipcMain.handle('delete-bank', async (event, id) => { try { await db.execute('DELETE FROM master_banks WHERE id=?', [id]); return { success: true, message: 'Deleted!' }; } catch (e) { return { success: false }; } });

ipcMain.handle('get-branches', async (event, bankId) => {
  try {
    const normalizedBankId = bankId ? Number(bankId) : null;
    if (!normalizedBankId) return { success: true, data: [] };
    const [rows] = await db.execute('SELECT * FROM master_branches WHERE bank_id = ? ORDER BY branch_name ASC', [normalizedBankId]);
    return { success: true, data: rows };
  } catch (e) { return { success: false }; }
});
ipcMain.handle('add-branch', async (event, data) => { try { await db.execute('INSERT INTO master_branches (bank_id, branch_name, branch_code) VALUES (?, ?, ?)', [data.bank_id, data.branch_name, data.branch_code]); return { success: true, message: 'Branch added!' }; } catch (e) { return { success: false }; } });
ipcMain.handle('delete-branch', async (event, id) => { try { await db.execute('DELETE FROM master_branches WHERE id=?', [id]); return { success: true, message: 'Deleted!' }; } catch (e) { return { success: false }; } });

// --- EMPLOYEE MANAGEMENT ---

async function checkDuplicates(data, isUpdate = false) {
  const id = isUpdate && data?.id ? Number(data.id) : null;
  const hasValidId = Number.isFinite(id);
  const idQuery = isUpdate ? 'AND id != ?' : '';
  const params = (isUpdate && hasValidId) ? [id] : [];

  const nic = (data?.nic_number ?? '').toString();
  const epf = (data?.epf_number ?? '').toString();
  const acc = (data?.account_number ?? '').toString();

  if (nic.trim() !== '') {
    const [rows] = await db.execute(`SELECT id FROM employees WHERE nic_number = ? ${idQuery}`, [nic, ...params]);
    if (rows.length > 0) return "NIC Number already exists!";
  }
  if (epf.trim() !== '') {
    const [rows] = await db.execute(`SELECT id FROM employees WHERE epf_number = ? ${idQuery}`, [epf, ...params]);
    if (rows.length > 0) return "EPF Number already exists!";
  }
  if (data?.bank_id && acc.trim() !== '') {
    const [rows] = await db.execute(`SELECT id FROM employees WHERE account_number = ? ${idQuery}`, [acc, ...params]);
    if (rows.length > 0) return "Account Number used by another employee!";
  }
  return null;
}

ipcMain.handle('get-employees', async (event, type) => {
  try {
    const sql = `
      SELECT e.*, 
             s.site_name, 
             d.title as designation_title,
             d.daily_rate as designation_rate,
             b.bank_name,
             br.branch_name
      FROM employees e
      LEFT JOIN master_sites s ON e.site_id = s.id
      LEFT JOIN master_designations d ON e.designation_id = d.id
      LEFT JOIN master_banks b ON e.bank_id = b.id
      LEFT JOIN master_branches br ON e.branch_id = br.id
      WHERE e.employee_type = ? 
      ORDER BY e.status ASC, e.id DESC
    `;
    const [rows] = await db.execute(sql, [type]);
    return { success: true, data: rows };
  } catch (error) { return { success: false, message: 'Fetch failed' }; }
});

ipcMain.handle('add-employee', async (event, data) => {
  try {
    const errorMsg = await checkDuplicates(data, false);
    if (errorMsg) return { success: false, message: errorMsg };

    const designationId = data?.designation_id ? Number(data.designation_id) : null;
    const siteId = data?.site_id ? Number(data.site_id) : null;
    const bankId = data?.bank_id ? Number(data.bank_id) : null;
    const branchId = data?.branch_id ? Number(data.branch_id) : null;
    const basicSalary1 = Number(data?.basic_salary_1 || 0);
    const basicSalary2 = Number(data?.basic_salary_2 || 0);
    const gender = (data?.gender === 'M' || data?.gender === 'F') ? data.gender : 'F';

    const sql = `
      INSERT INTO employees (
        full_name, nic_number, mobile_number, gender, joined_date, epf_number, 
        designation_id, site_id, employee_type, 
        basic_salary_1, basic_salary_2, 
        account_number, bank_id, branch_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `;
    const params = [
      data?.full_name ?? null,
      data?.nic_number ?? null,
      data?.mobile_number ?? null,
      gender,
      data?.joined_date ?? null,
      data?.epf_number ?? null,
      Number.isFinite(designationId) ? designationId : null,
      Number.isFinite(siteId) ? siteId : null,
      data?.employee_type ?? null,
      Number.isFinite(basicSalary1) ? basicSalary1 : 0,
      Number.isFinite(basicSalary2) ? basicSalary2 : 0,
      data?.account_number ? String(data.account_number) : null,
      Number.isFinite(bankId) ? bankId : null,
      Number.isFinite(branchId) ? branchId : null
    ];
    await db.execute(sql, params);
    return { success: true, message: 'Employee added successfully!' };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Database Error. Check Data.' };
  }
});

ipcMain.handle('update-employee', async (event, data) => {
  try {
    const errorMsg = await checkDuplicates(data, true);
    if (errorMsg) return { success: false, message: errorMsg };

    const id = data?.id ? Number(data.id) : null;
    if (!Number.isFinite(id)) return { success: false, message: 'Invalid employee id' };

    const designationId = data?.designation_id ? Number(data.designation_id) : null;
    const siteId = data?.site_id ? Number(data.site_id) : null;
    const bankId = data?.bank_id ? Number(data.bank_id) : null;
    const branchId = data?.branch_id ? Number(data.branch_id) : null;
    const basicSalary1 = Number(data?.basic_salary_1 || 0);
    const basicSalary2 = Number(data?.basic_salary_2 || 0);
    const gender = (data?.gender === 'M' || data?.gender === 'F') ? data.gender : 'F';

    const sql = `
      UPDATE employees SET 
        full_name=?, nic_number=?, mobile_number=?, gender=?, joined_date=?, epf_number=?, 
        designation_id=?, site_id=?, 
        basic_salary_1=?, basic_salary_2=?, 
        account_number=?, bank_id=?, branch_id=?
      WHERE id=?
    `;
    const params = [
      data?.full_name ?? null,
      data?.nic_number ?? null,
      data?.mobile_number ?? null,
      gender,
      data?.joined_date ?? null,
      data?.epf_number ?? null,
      Number.isFinite(designationId) ? designationId : null,
      Number.isFinite(siteId) ? siteId : null,
      Number.isFinite(basicSalary1) ? basicSalary1 : 0,
      Number.isFinite(basicSalary2) ? basicSalary2 : 0,
      data?.account_number ? String(data.account_number) : null,
      Number.isFinite(bankId) ? bankId : null,
      Number.isFinite(branchId) ? branchId : null,
      id
    ];
    await db.execute(sql, params);
    return { success: true, message: 'Employee updated successfully!' };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Update failed' };
  }
});

ipcMain.handle('toggle-status-employee', async (event, { id, currentStatus }) => {
  try {
    const newStatus = currentStatus === 'ACTIVE' ? 'TERMINATED' : 'ACTIVE';
    await db.execute("UPDATE employees SET status=? WHERE id=?", [newStatus, id]);
    return { success: true, message: `Status changed to ${newStatus}!` };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Status change failed' };
  }
});

// --- MONTHLY SHIFTS ---

ipcMain.handle('get-monthly-shifts', async (event, { site_id, month_year, employee_type }) => {
  try {
    if (!site_id || !month_year || !employee_type) return { success: false, message: 'Invalid filters' };

    const sql = `
      SELECT 
        e.id AS employee_id,
        e.full_name,
        d.title AS designation,
        COALESCE(ms.total_shifts, 0) AS total_shifts,
        COALESCE(ms.intensive, 0) AS intensive,
        COALESCE(ms.other_allowance, 0) AS other_allowance,
        COALESCE(ms.telephone_allow, 0) AS telephone_allow,
        COALESCE(ms.special_allowance, 0) AS special_allowance,
        COALESCE(ms.loan_deduction, 0) AS loan_deduction,
        COALESCE(ms.salary_advance, 0) AS salary_advance,
        COALESCE(ms.festival_advance, 0) AS festival_advance,
        COALESCE(ms.deposit, 0) AS deposit,
        COALESCE(ms.other_deductions, 0) AS other_deductions
      FROM employees e
      LEFT JOIN master_designations d ON e.designation_id = d.id
      LEFT JOIN monthly_shifts ms 
        ON ms.employee_id = e.id 
        AND ms.month_year = ? 
        AND ms.site_id = e.site_id
      WHERE e.status = 'ACTIVE'
        AND e.site_id = ?
        AND e.employee_type = ?
      ORDER BY e.full_name ASC
    `;

    const [rows] = await db.execute(sql, [month_year, site_id, employee_type]);
    return { success: true, data: rows };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Fetch failed' };
  }
});

ipcMain.handle('save-monthly-shifts', async (event, rows) => {
  try {
    if (!Array.isArray(rows)) return { success: false, message: 'Invalid payload' };

    const sql = `
      INSERT INTO monthly_shifts (
        employee_id, site_id, month_year,
        total_shifts,
        intensive, other_allowance, telephone_allow,
        special_allowance,
        loan_deduction, salary_advance, festival_advance, deposit,
        other_deductions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_shifts = VALUES(total_shifts),
        intensive = VALUES(intensive),
        other_allowance = VALUES(other_allowance),
        telephone_allow = VALUES(telephone_allow),
        special_allowance = VALUES(special_allowance),
        loan_deduction = VALUES(loan_deduction),
        salary_advance = VALUES(salary_advance),
        festival_advance = VALUES(festival_advance),
        deposit = VALUES(deposit),
        other_deductions = VALUES(other_deductions)
    `;

    for (const r of rows) {
      if (!r.employee_id || !r.site_id || !r.month_year) continue;
      await db.execute(sql, [
        Number(r.employee_id),
        Number(r.site_id),
        r.month_year,
        Number(r.total_shifts || 0),
        Number(r.intensive || 0),
        Number(r.other_allowance || 0),
        Number(r.telephone_allow || 0),
        Number(r.special_allowance || 0),
        Number(r.loan_deduction || 0),
        Number(r.salary_advance || 0),
        Number(r.festival_advance || 0),
        Number(r.deposit || 0),
        Number(r.other_deductions || 0)
      ]);
    }

    return { success: true, message: 'Monthly shifts saved!' };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Save failed' };
  }
});

// --- SALARY CALCULATION (SECURITY - FINAL FLEXIBLE LOGIC) ---

ipcMain.handle('calculate-security-salaries', async (event, { site_id, month_year }) => {
  try {
    if (!site_id || !month_year) return { success: false, message: 'Invalid filters' };

    const sql = `
      SELECT 
        e.id AS employee_id,
        e.full_name,
        e.epf_number,
        e.account_number,
        b.bank_code,
        br.branch_code,
        d.title AS designation,
        COALESCE(d.daily_rate, 0) AS db_daily_rate,
        COALESCE(ms.total_shifts, 0) AS total_shifts,
        COALESCE(ms.intensive, 0) AS intensive,
        COALESCE(ms.other_allowance, 0) AS other_allowance,
        COALESCE(ms.telephone_allow, 0) AS telephone_allow,
        COALESCE(ms.loan_deduction, 0) AS loan_deduction,
        COALESCE(ms.salary_advance, 0) AS salary_advance,
        COALESCE(ms.festival_advance, 0) AS festival_advance,
        COALESCE(ms.deposit, 0) AS deposit,
        COALESCE(ms.other_deductions, 0) AS other_deductions
      FROM employees e
      LEFT JOIN master_designations d ON e.designation_id = d.id
      LEFT JOIN master_banks b ON e.bank_id = b.id
      LEFT JOIN master_branches br ON e.branch_id = br.id
      LEFT JOIN monthly_shifts ms
        ON ms.employee_id = e.id
        AND ms.month_year = ?
        AND ms.site_id = e.site_id
      WHERE e.status = 'ACTIVE'
        AND e.employee_type = 'SECURITY'
        AND e.site_id = ?
      ORDER BY e.full_name ASC
    `;

    const [rows] = await db.execute(sql, [month_year, Number(site_id)]);

    const round2 = (v) => {
      const n = Number(v || 0);
      return Math.round((n + Number.EPSILON) * 100) / 100;
    };

    const calculated = (rows || []).map((r) => {
      const S = Number(r.total_shifts || 0);
      const designationTitle = String(r.designation || '').toUpperCase();
      const dbDailyRate = Number(r.db_daily_rate || 0);

      // Determine Type based on name
      const isOIC = designationTitle.includes('OIC');
      const isVO = designationTitle.includes('VO');

      // --- TARGET RATE LOGIC (FLEXIBLE) ---
      const defaultRate = (isOIC || isVO) ? 1250 : 1050;
      const targetRate = dbDailyRate > 0 ? dbDailyRate : defaultRate;

      // --- 1. BASIC SALARY 1 ---
      let basic1 = 0;
      if (isVO) {
         basic1 = S < 25 ? round2(S * 780) : 24180;
      } else if (isOIC) {
         basic1 = S < 25 ? round2(S * 500) : 13120;
      } else {
         basic1 = S < 25 ? round2(S * 500) : 12500;
      }

      // --- 2. BASIC SALARY 2 ---
      const basic2 = S < 25 ? round2(S * 200) : 5000;
      const basicTotal = round2(basic1 + basic2);

      // --- 3. BUDGET ALLOWANCE ---
      const budgetAllowance = S < 25 ? round2(S * 140) : 3500;

      // --- 4. OT PAYMENT ---
      const ot = round2(S * 303.75);

      // --- 5. EPF 8% ---
      const epfBase = round2(basicTotal + budgetAllowance);
      const epf8 = round2(epfBase * 0.08);

      // --- 6. SHIFT ALLOWANCE ---
      const targetTotal = round2(targetRate * S);
      let shiftAllowance = round2(targetTotal - basic1 - budgetAllowance - ot + epf8);

      if (isOIC) {
        shiftAllowance = round2(shiftAllowance - 200);
      }
      if (shiftAllowance < 0) shiftAllowance = 0;

      // --- 7. GROSS SALARY (BASE) ---
      const grossSalary = round2(basicTotal + shiftAllowance + budgetAllowance);

      // --- 8. INCENTIVE ---
      let incentive = 0;
      if (!isOIC && !isVO && S >= 31) {
        incentive = round2(((S - 30) * 75) - 75);
      }

      // --- 9. TELEPHONE ALLOWANCE ---
      let telephone = Number(r.telephone_allow || 0);
      if (isOIC && telephone === 0) {
        telephone = 500;
      }

      // --- 10. OTHER ALLOWANCES ---
      const otherAllowance = Number(r.other_allowance || 0);
      const intensive = Number(r.intensive || 0);

      // --- 11. TOTAL GROSS (FINAL) ---
      const totalGrossSalary = round2(
        grossSalary + ot + incentive + telephone + otherAllowance + intensive
      );

      // --- 12. DEDUCTIONS ---
      const insurance = 60;
      const welfare = 500;
      const stampDuty = totalGrossSalary > 25000 ? 25 : 0;
      
      const loan = Number(r.loan_deduction || 0);
      const salaryAdv = Number(r.salary_advance || 0);
      const festivalAdv = Number(r.festival_advance || 0);
      const deposit = Number(r.deposit || 0);
      const otherDed = Number(r.other_deductions || 0);

      const totalDeductions = round2(
        epf8 + insurance + welfare + stampDuty + loan + salaryAdv + festivalAdv + deposit + otherDed
      );

      // --- 13. NET SALARY ---
      const netSalary = round2(totalGrossSalary - totalDeductions);

      // --- 14. EMPLOYER CONTRIBUTIONS ---
      const epf12 = round2(epfBase * 0.12);
      const totalEpfSupport = round2(epf12 + epf8);
      const etf3 = round2(epfBase * 0.03);
      const gratuity = round2(basicTotal / 24);

      return {
        employee_id: r.employee_id,
        full_name: r.full_name,
        epf_number: r.epf_number,
        designation: designationTitle,
        bank_code: r.bank_code || '',
        branch_code: r.branch_code || '',
        account_number: r.account_number || '',
        
        total_shifts: S,
        daily_rate: targetRate, 
        
        basic_1: basic1,
        basic_2: basic2,
        basic_total: basicTotal,
        budget_allowance: budgetAllowance,
        shift_allowance: shiftAllowance,
        gross_salary: grossSalary, // Base Gross
        
        ot,
        incentive,
        telephone_allow: telephone,
        other_allowance: otherAllowance, // Fixed mapping
        intensive,
        total_gross_salary: totalGrossSalary, // Final Gross

        epf_8: epf8,
        loan_deduction: loan,
        salary_advance: salaryAdv,
        festival_advance: festivalAdv,
        deposit: deposit,
        other_deductions: otherDed,
        insurance,
        welfare,
        stamp_duty: stampDuty,
        deductions: totalDeductions,
        net_salary: netSalary,

        epf_12: epf12,
        total_epf_support: totalEpfSupport,
        etf_3: etf3,
        gratuity: gratuity
      };
    });

    const totalNet = calculated.reduce((sum, r) => sum + (Number(r.net_salary) || 0), 0);
    return { success: true, data: calculated, summary: { total_net_salary: totalNet } };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Calculation failed' };
  }
});

// --- SALARY CALCULATION (CLEANING - FINAL CORRECTED LOGIC) ---

ipcMain.handle('calculate-cleaning-salaries', async (event, { site_id, month_year }) => {
  try {
    if (!site_id || !month_year) return { success: false, message: 'Invalid filters' };

    const sql = `
      SELECT 
        e.id AS employee_id,
        e.full_name,
        e.epf_number,
        e.gender,
        e.account_number,
        b.bank_code,
        br.branch_code,
        d.title AS designation,
        COALESCE(d.daily_rate, 0) AS db_daily_rate,
        COALESCE(ms.total_shifts, 0) AS total_shifts,
        COALESCE(ms.telephone_allow, 0) AS telephone_allow,
        COALESCE(ms.loan_deduction, 0) AS loan_deduction,
        COALESCE(ms.salary_advance, 0) AS salary_advance,
        COALESCE(ms.festival_advance, 0) AS festival_advance,
        COALESCE(ms.special_allowance, 0) AS special_allowance,
        COALESCE(ms.other_deductions, 0) AS other_deductions
      FROM employees e
      LEFT JOIN master_designations d ON e.designation_id = d.id
      LEFT JOIN master_banks b ON e.bank_id = b.id
      LEFT JOIN master_branches br ON e.branch_id = br.id
      LEFT JOIN monthly_shifts ms
        ON ms.employee_id = e.id
        AND ms.site_id = e.site_id
        AND ms.month_year = ?
      WHERE e.status = 'ACTIVE'
        AND e.employee_type = 'CLEANING'
        AND e.site_id = ?
      ORDER BY e.full_name ASC
    `;

    const [rows] = await db.execute(sql, [month_year, Number(site_id)]);

    const round2 = (v) => {
      const n = Number(v || 0);
      return Math.round((n + Number.EPSILON) * 100) / 100;
    };

    const calculated = (rows || []).map((r) => {
      const S = Number(r.total_shifts || 0);
      const cappedS = S > 25 ? 25 : S;
      const designationTitle = String(r.designation || '').toUpperCase();
      const isOIC = designationTitle.includes('OIC');
      const dbDailyRate = Number(r.db_daily_rate || 0);

      // --- 1. BASIC & BUDGET ---
      const basic1 = round2(cappedS * 500);
      const basic2 = round2(cappedS * 200);
      const basicTotal = round2(basic1 + basic2);
      const budgetAllowance = round2(cappedS * 140);

      // --- 2. TARGET RATE SELECTION ---
      const defaultRate = isOIC ? 780 : 680;
      const targetRate = dbDailyRate > 0 ? dbDailyRate : defaultRate;

      // --- 3. SHIFT ALLOWANCE ---
      const targetTotal = round2(targetRate * S);
      const shiftAllowance = round2(targetTotal - basic1);

      // --- 4. GROSS SALARY (Base) ---
      const grossSalary = round2(basicTotal + budgetAllowance + shiftAllowance);

      // --- 5. OT PAYMENT ---
      const otRate = isOIC ? 157.50 : 138.75;
      const ot = round2(S * otRate);

      // --- 6. ALLOWANCES ---
      const telephoneAllow = round2(Number(r.telephone_allow || 0));
      const specialAllowance = round2(Number(r.special_allowance || 0));

      // --- 7. TOTAL GROSS (Final) ---
      const totalGrossSalary = round2(grossSalary + ot + telephoneAllow + specialAllowance);

      // --- 8. DEDUCTIONS ---
      const epfBase = round2(basicTotal + budgetAllowance);
      const epf8 = round2(epfBase * 0.08);
      const insurance = 60;
      const welfare = 200;
      
      const stampDuty = totalGrossSalary > 25000 ? 25 : 0;
      const loanDeduction = 0; 
      
      const salaryAdvance = round2(Number(r.salary_advance || 0));
      const festivalAdvance = round2(Number(r.festival_advance || 0));
      const otherDeductions = round2(Number(r.other_deductions || 0));

      const totalDeductions = round2(
        epf8 + insurance + welfare + stampDuty +
        loanDeduction + salaryAdvance + festivalAdvance + otherDeductions
      );

      // --- 9. NET SALARY ---
      const netSalary = round2(totalGrossSalary - totalDeductions);

      // --- 10. EMPLOYER CONTRIBUTIONS ---
      const epf12 = round2(epfBase * 0.12);
      const etf3 = round2(epfBase * 0.03);
      const gratuity = round2(epfBase / 24);

      return {
        employee_id: r.employee_id,
        full_name: r.full_name,
        epf_number: r.epf_number,
        designation: r.designation,
        gender: r.gender,
        bank_code: r.bank_code || '',
        branch_code: r.branch_code || '',
        account_number: r.account_number || '',
        
        total_shifts: S,
        daily_rate: targetRate,
        
        basic_1: basic1,
        basic_2: basic2,
        basic_total: basicTotal,
        budget_allowance: budgetAllowance,
        shift_allowance: shiftAllowance,
        
        gross_salary: grossSalary, // Base Gross
        
        ot,
        telephone_allow: telephoneAllow,
        special_allowance: specialAllowance,
        
        total_gross_salary: totalGrossSalary, // Final Gross

        epf_8: epf8,
        deductions: totalDeductions,
        net_salary: netSalary,
        loan_deduction: loanDeduction,
        salary_advance: salaryAdvance,
        festival_advance: festivalAdvance,
        other_deductions: otherDeductions,
        insurance,
        welfare,
        stamp_duty: stampDuty,
        
        epf_12: epf12,
        etf_3: etf3,
        gratuity: gratuity
      };
    });

    const totalNet = calculated.reduce((sum, r) => sum + (Number(r.net_salary) || 0), 0);
    return { success: true, data: calculated, summary: { total_net_salary: totalNet } };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Calculation failed' };
  }
});