import { ipcMain } from 'electron';
import db from './db.js';

export function setupOfficeHandlers() {
  
  // 1. ADD NEW EMPLOYEE (Basic Details Only)
  ipcMain.handle('add-office-employee', async (event, data) => {
    try {
      const sql = `INSERT INTO office_employees (full_name, epf_number, nic_number, gender, designation, basic_salary, mobile_number, bank_id, branch_id, account_number, joined_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'ACTIVE')`;
      await db.execute(sql, [
        data.full_name, data.epf_number, data.nic_number, data.gender, data.designation, 
        Number(data.basic_salary || 0), data.mobile_number,
        data.bank_id ? Number(data.bank_id) : null, data.branch_id ? Number(data.branch_id) : null, data.account_number
      ]);
      return { success: true, message: 'Added Successfully!' };
    } catch (error) { return { success: false, message: 'DB Error: ' + error.message }; }
  });

  // 2. UPDATE EMPLOYEE (New Logic Added)
  ipcMain.handle('update-office-employee', async (event, data) => {
    try {
      const sql = `
        UPDATE office_employees SET 
          full_name=?, epf_number=?, nic_number=?, gender=?, designation=?, 
          basic_salary=?, mobile_number=?, 
          bank_id=?, branch_id=?, account_number=?
        WHERE id=?
      `;
      await db.execute(sql, [
        data.full_name, data.epf_number, data.nic_number, data.gender, data.designation, 
        Number(data.basic_salary || 0), data.mobile_number,
        data.bank_id ? Number(data.bank_id) : null, data.branch_id ? Number(data.branch_id) : null, data.account_number,
        data.id
      ]);
      return { success: true, message: 'Updated Successfully!' };
    } catch (error) { return { success: false, message: 'Update Failed: ' + error.message }; }
  });

  // 3. TOGGLE STATUS (Terminate/Reactivate)
  ipcMain.handle('toggle-status-office-employee', async (event, { id, currentStatus }) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'TERMINATED' : 'ACTIVE';
      await db.execute("UPDATE office_employees SET status=? WHERE id=?", [newStatus, id]);
      return { success: true, message: `Employee ${newStatus === 'ACTIVE' ? 'Re-activated' : 'Terminated'}!` };
    } catch (error) { return { success: false, message: 'Status Change Failed' }; }
  });

  // 4. GET EMPLOYEES (Master Data - All Statuses)
  ipcMain.handle('get-office-employees', async () => {
    try {
      const [rows] = await db.execute("SELECT e.*, b.bank_name, br.branch_name FROM office_employees e LEFT JOIN master_banks b ON e.bank_id=b.id LEFT JOIN master_branches br ON e.branch_id=br.id ORDER BY e.id DESC");
      return { success: true, data: rows };
    } catch (e) { return { success: false }; }
  });

  // 5. GET MONTHLY INPUT DATA (For Step 2 - Two Tables)
  ipcMain.handle('get-office-monthly-input', async (event, { month_year }) => {
    try {
      // Get All Active Employees
      const [employees] = await db.execute("SELECT id, full_name, designation, basic_salary FROM office_employees WHERE status='ACTIVE' ORDER BY designation ASC");
      
      // Get Saved Data for this Month
      const [savedData] = await db.execute("SELECT * FROM office_monthly_data WHERE month_year = ?", [month_year]);

      // Separate into Pending and Completed
      const completed = [];
      const pending = [];

      employees.forEach(emp => {
        const saved = savedData.find(d => d.employee_id === emp.id);
        if (saved) {
          completed.push({ ...emp, ...saved, is_saved: true });
        } else {
          // Defaults for new entry
          pending.push({ 
            ...emp, 
            allow_cost_of_living: 17800, // Default
            deduct_welfare: 200,         // Default
            deduct_insurance: 60,        // Default
            is_saved: false 
          });
        }
      });

      return { success: true, pending, completed };
    } catch (e) { return { success: false, message: e.message }; }
  });

  // 6. SAVE SINGLE EMPLOYEE MONTHLY DATA
  ipcMain.handle('save-office-single-monthly', async (event, data) => {
    try {
      const sql = `
        INSERT INTO office_monthly_data (
          employee_id, month_year, 
          allow_chairman, allow_acting_dir, allow_telephone, allow_fuel, allow_cost_of_living, 
          allow_special_1, allow_special_2, allow_interim,
          deduct_stamp, deduct_elec_water, deduct_festival, deduct_loan, deduct_other, deduct_insurance, deduct_welfare
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          allow_chairman=VALUES(allow_chairman), allow_acting_dir=VALUES(allow_acting_dir), allow_telephone=VALUES(allow_telephone),
          allow_fuel=VALUES(allow_fuel), allow_cost_of_living=VALUES(allow_cost_of_living), allow_special_1=VALUES(allow_special_1),
          allow_special_2=VALUES(allow_special_2), allow_interim=VALUES(allow_interim), deduct_stamp=VALUES(deduct_stamp),
          deduct_elec_water=VALUES(deduct_elec_water), deduct_festival=VALUES(deduct_festival), deduct_loan=VALUES(deduct_loan),
          deduct_other=VALUES(deduct_other), deduct_insurance=VALUES(deduct_insurance), deduct_welfare=VALUES(deduct_welfare)
      `;
      
      await db.execute(sql, [
        data.employee_id, data.month_year,
        Number(data.allow_chairman), Number(data.allow_acting_dir), Number(data.allow_telephone), Number(data.allow_fuel),
        Number(data.allow_cost_of_living), Number(data.allow_special_1), Number(data.allow_special_2), Number(data.allow_interim),
        Number(data.deduct_stamp), Number(data.deduct_elec_water), Number(data.deduct_festival), Number(data.deduct_loan),
        Number(data.deduct_other), Number(data.deduct_insurance), Number(data.deduct_welfare)
      ]);
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  });

  // 7. GENERATE FINAL REPORT (Step 3)
  ipcMain.handle('calculate-office-salary-report', async (event, { month_year }) => {
    try {
      const [data] = await db.execute(`
        SELECT e.*, m.*, b.bank_name, b.bank_code, br.branch_name, br.branch_code
        FROM office_employees e
        JOIN office_monthly_data m ON e.id = m.employee_id
        LEFT JOIN master_banks b ON e.bank_id = b.id
        LEFT JOIN master_branches br ON e.branch_id = br.id
        WHERE m.month_year = ? AND e.status = 'ACTIVE'
      `, [month_year]);

      const round2 = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;

      const report = data.map(row => {
        const basic = Number(row.basic_salary || 0);
        
        // Earnings
        const earnings = basic + 
                         Number(row.allow_chairman) + Number(row.allow_acting_dir) + 
                         Number(row.allow_telephone) + Number(row.allow_fuel) + 
                         Number(row.allow_cost_of_living) + 
                         Number(row.allow_special_1) + Number(row.allow_special_2) + 
                         Number(row.allow_interim);

        // Deductions
        const epf8 = basic > 0 ? round2(basic * 0.08) : 0;
        const totalDeduction = epf8 + 
                               Number(row.deduct_stamp) + Number(row.deduct_elec_water) + 
                               Number(row.deduct_festival) + Number(row.deduct_welfare) + 
                               Number(row.deduct_loan) + Number(row.deduct_insurance) + 
                               Number(row.deduct_other);

        const netPay = earnings - totalDeduction;

        // Employer
        const epf12 = basic > 0 ? round2(basic * 0.12) : 0;
        const etf3 = basic > 0 ? round2(basic * 0.03) : 0;
        const gratuity = basic > 0 ? round2(basic / 24) : 0;

        return {
          ...row,
          gross_pay: round2(earnings),
          epf_8: epf8,
          total_deductions: round2(totalDeduction),
          net_pay: round2(netPay),
          epf_12: epf12,
          etf_3: etf3,
          gratuity: gratuity
        };
      });

      return { success: true, data: report };
    } catch (e) { return { success: false, message: e.message }; }
  });
}