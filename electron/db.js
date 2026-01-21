import mysql from 'mysql2/promise';

// 🔑 අපි උත්සාහ කරන පාස්වර්ඩ් ලැයිස්තුව
// ඔබේ MySQL පාස්වර්ඩ් එක මෙතන නැත්නම්, මේ ලිස්ට් එකට එකතු කරන්න
const COMMON_PASSWORDS = ['25858ABcd12#@25858', '1234', '123', 'root', 'admin', 'password', 'admin12#@'];

const dbName = 'reda_payroll_db';

let pool;

// පාස්වර්ඩ් එකින් එක දාලා බලන Function එක
async function findWorkingConfig() {
  console.log("🔄 Searching for correct MySQL Password...");

  for (const pwd of COMMON_PASSWORDS) {
    try {
      console.log(`   👉 Trying password: '${pwd}' ...`); // Terminal එකේ පෙන්වයි
      
      const config = {
        host: 'localhost',
        user: 'root',
        password: pwd, 
        multipleStatements: true
      };
      
      const connection = await mysql.createConnection(config);
      await connection.end();
      
      console.log(`✅ Success! Connected with password: '${pwd}'`);
      return config; // හරි ගිය පාස්වර්ඩ් එක යවනවා
      
    } catch (err) {
      if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        continue; // වැරදි නම් ඊළඟ එකට
      }
      throw err; // වෙන දෝෂයක් නම් එළියට
    }
  }
  throw new Error("❌ කිසිම පාස්වර්ඩ් එකක් හරියන්නේ නෑ! කරුණාකර 'COMMON_PASSWORDS' ලිස්ට් එකට ඔබේ පාස්වර්ඩ් එක එකතු කරන්න.");
}

async function initDatabase() {
  try {
    // 1. හරි යන Config එක හොයාගන්නවා
    const dbConfig = await findWorkingConfig();

    // 2. Database Connect
    const connection = await mysql.createConnection(dbConfig);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.changeUser({ database: dbName });

    // --- Tables Creation SQL ---
    const tablesSql = `
      CREATE TABLE IF NOT EXISTS system_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100),
        username VARCHAR(50) UNIQUE,
        password VARCHAR(255),
        role ENUM('SUPER_ADMIN','ADMIN','EDITOR','VIEWER') DEFAULT 'EDITOR',
        status ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      INSERT IGNORE INTO system_users (id, full_name, username, password, role) 
      VALUES (1, 'Super Admin', 'admin', 'admin', 'SUPER_ADMIN');

      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        user_name VARCHAR(100),
        action_type VARCHAR(50),
        description TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS master_sites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        site_name VARCHAR(255) NOT NULL UNIQUE,
        location VARCHAR(255),
        contact_number VARCHAR(20),
        status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS master_designations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL UNIQUE,
        department ENUM('SECURITY', 'CLEANING', 'OFFICE') NOT NULL,
        daily_rate DECIMAL(10,2) DEFAULT 0.00,
        status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS master_banks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bank_name VARCHAR(100) NOT NULL,
        bank_code VARCHAR(10) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS master_branches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bank_id INT NOT NULL,
        branch_name VARCHAR(100) NOT NULL,
        branch_code VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bank_id) REFERENCES master_banks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(200) NOT NULL,
        epf_number VARCHAR(20) UNIQUE,
        nic_number VARCHAR(20) UNIQUE,
        gender ENUM('M', 'F') DEFAULT 'M',
        designation_id INT NOT NULL,
        site_id INT NOT NULL,
        employee_type ENUM('SECURITY', 'CLEANING') NOT NULL,
        joined_date DATE NOT NULL,
        mobile_number VARCHAR(15) NOT NULL,
        basic_salary_1 DECIMAL(10,2) DEFAULT 0.00,
        basic_salary_2 DECIMAL(10,2) DEFAULT 0.00,
        bank_id INT,
        branch_id INT,
        account_number VARCHAR(50),
        status ENUM('ACTIVE', 'RESIGNED', 'TERMINATED') DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (designation_id) REFERENCES master_designations(id),
        FOREIGN KEY (site_id) REFERENCES master_sites(id),
        FOREIGN KEY (bank_id) REFERENCES master_banks(id),
        FOREIGN KEY (branch_id) REFERENCES master_branches(id)
      );

      CREATE TABLE IF NOT EXISTS monthly_shifts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        site_id INT NOT NULL,
        month_year VARCHAR(7) NOT NULL,
        total_shifts INT DEFAULT 0,
        ot_hours DECIMAL(5,2) DEFAULT 0.00,
        incentive DECIMAL(10,2) DEFAULT 0.00,
        telephone_allow DECIMAL(10,2) DEFAULT 0.00,
        other_allowance DECIMAL(10,2) DEFAULT 0.00,
        special_allowance DECIMAL(10,2) DEFAULT 0.00,
        loan_deduction DECIMAL(10,2) DEFAULT 0.00,
        salary_advance DECIMAL(10,2) DEFAULT 0.00,
        festival_advance DECIMAL(10,2) DEFAULT 0.00,
        deposit DECIMAL(10,2) DEFAULT 0.00,
        other_deductions DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_entry (employee_id, site_id, month_year),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (site_id) REFERENCES master_sites(id)
      );

      CREATE TABLE IF NOT EXISTS office_employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        epf_number VARCHAR(20),
        nic_number VARCHAR(20),
        gender ENUM('M', 'F') DEFAULT 'M',
        designation VARCHAR(100),
        mobile_number VARCHAR(15),
        joined_date DATE,
        basic_salary DECIMAL(10,2) DEFAULT 0.00,
        cost_of_living DECIMAL(10,2) DEFAULT 17800.00,
        fuel_allowance DECIMAL(10,2) DEFAULT 0.00,
        telephone_allowance DECIMAL(10,2) DEFAULT 0.00,
        interim_allowance DECIMAL(10,2) DEFAULT 0.00,
        special_allowance_20 DECIMAL(10,2) DEFAULT 0.00,
        special_allowance_2 DECIMAL(10,2) DEFAULT 0.00,
        chairman_allowance DECIMAL(10,2) DEFAULT 0.00,
        budget_allowance DECIMAL(10,2) DEFAULT 0.00,
        bank_id INT,
        branch_id INT,
        account_number VARCHAR(50),
        status ENUM('ACTIVE', 'TERMINATED') DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bank_id) REFERENCES master_banks(id),
        FOREIGN KEY (branch_id) REFERENCES master_branches(id)
      );

      CREATE TABLE IF NOT EXISTS office_monthly_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        month_year VARCHAR(7) NOT NULL, 
        allow_chairman DECIMAL(10,2) DEFAULT 0.00,
        allow_acting_dir DECIMAL(10,2) DEFAULT 0.00,
        allow_telephone DECIMAL(10,2) DEFAULT 0.00,
        allow_fuel DECIMAL(10,2) DEFAULT 0.00,
        allow_cost_of_living DECIMAL(10,2) DEFAULT 0.00, 
        allow_special_1 DECIMAL(10,2) DEFAULT 0.00,
        allow_special_2 DECIMAL(10,2) DEFAULT 0.00, 
        allow_interim DECIMAL(10,2) DEFAULT 0.00,
        deduct_stamp DECIMAL(10,2) DEFAULT 0.00,
        deduct_elec_water DECIMAL(10,2) DEFAULT 0.00,
        deduct_festival DECIMAL(10,2) DEFAULT 0.00,
        deduct_loan DECIMAL(10,2) DEFAULT 0.00,
        deduct_other DECIMAL(10,2) DEFAULT 0.00,
        deduct_insurance DECIMAL(10,2) DEFAULT 0.00,
        deduct_welfare DECIMAL(10,2) DEFAULT 0.00,
        UNIQUE KEY unique_office_entry (employee_id, month_year),
        FOREIGN KEY (employee_id) REFERENCES office_employees(id) ON DELETE CASCADE
      );
    `;

    await connection.query(tablesSql);
    console.log("✅ Database structure verified.");
    connection.end();

    pool = mysql.createPool({ ...dbConfig, database: dbName });

  } catch (error) {
    console.error("❌ Database Init Failed:", error);
  }
}

initDatabase();

export default {
  execute: async (sql, params) => {
    // pool එක තාම හැදිලා නැත්නම් ආයෙත් ට්‍රයි කරන්න
    if (!pool) {
        await initDatabase();
        if(!pool) throw new Error("DB Connection failed completely."); 
    }
    return await pool.execute(sql, params);
  }
};