import mysql from 'mysql2/promise';

// 🔑 අපි උත්සාහ කරන පාස්වර්ඩ් ලැයිස්තුව
// ඔබේ සංකීර්ණ පාස්වර්ඩ් එක සහ සාමාන්‍ය ඒවා මෙහි ඇත
const COMMON_PASSWORDS = ['25858ABcd12#@25858', '1234', '123', 'root', 'admin', 'password', 'admin12#@'];

const dbName = 'reda_payroll_db';

let pool;

// පාස්වර්ඩ් එකින් එක දාලා බලන Function එක
async function findWorkingConfig() {
  console.log("🔄 Searching for correct MySQL Password...");

  for (const pwd of COMMON_PASSWORDS) {
    try {
      console.log(`   👉 Trying password: '${pwd}' ...`); 
      
      const config = {
        host: 'localhost',
        user: 'root',
        password: pwd, 
        multipleStatements: true
      };
      
      const connection = await mysql.createConnection(config);
      await connection.end();
      
      console.log(`✅ Success! Connected with password: '${pwd}'`);
      return config; 
      
    } catch (err) {
      if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        continue; 
      }
      throw err; 
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

    // --- Tables Creation SQL (Based on YOUR SQL DUMP) ---
    // පහත තිබෙන්නේ ඔබේ ඩේටාබේස් එකේ නිවැරදි ව්‍යුහයයි.
    const tablesSql = `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id int NOT NULL AUTO_INCREMENT,
        user_id int DEFAULT NULL,
        user_name varchar(100) DEFAULT NULL,
        action_type varchar(50) DEFAULT NULL,
        description text,
        timestamp timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS master_banks (
        id int NOT NULL AUTO_INCREMENT,
        bank_name varchar(100) NOT NULL,
        bank_code varchar(10) DEFAULT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY bank_code (bank_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS master_branches (
        id int NOT NULL AUTO_INCREMENT,
        bank_id int NOT NULL,
        branch_name varchar(100) NOT NULL,
        branch_code varchar(10) NOT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY bank_id (bank_id),
        CONSTRAINT master_branches_ibfk_1 FOREIGN KEY (bank_id) REFERENCES master_banks (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS master_designations (
        id int NOT NULL AUTO_INCREMENT,
        title varchar(100) NOT NULL,
        department enum('SECURITY','CLEANING','OFFICE') NOT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        daily_rate decimal(10,2) DEFAULT '0.00',
        status enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
        PRIMARY KEY (id),
        UNIQUE KEY title (title)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS master_sites (
        id int NOT NULL AUTO_INCREMENT,
        site_name varchar(150) NOT NULL,
        location varchar(200) DEFAULT NULL,
        contact_number varchar(20) DEFAULT NULL,
        status enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY site_name (site_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS employees (
        id int NOT NULL AUTO_INCREMENT,
        full_name varchar(200) NOT NULL,
        nic_number varchar(20) DEFAULT NULL,
        mobile_number varchar(15) NOT NULL,
        gender enum('M','F') NOT NULL DEFAULT 'F',
        joined_date date NOT NULL,
        epf_number varchar(20) DEFAULT NULL,
        designation_id int NOT NULL,
        site_id int NOT NULL,
        employee_type enum('SECURITY','CLEANING') NOT NULL,
        basic_salary_1 decimal(10,2) DEFAULT '0.00',
        basic_salary_2 decimal(10,2) DEFAULT '0.00',
        account_number varchar(50) DEFAULT NULL,
        bank_id int DEFAULT NULL,
        branch_id int DEFAULT NULL,
        status enum('ACTIVE','RESIGNED','TERMINATED') DEFAULT 'ACTIVE',
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY epf_number (epf_number),
        UNIQUE KEY nic_number (nic_number),
        KEY designation_id (designation_id),
        KEY site_id (site_id),
        KEY bank_id (bank_id),
        KEY branch_id (branch_id),
        CONSTRAINT employees_ibfk_1 FOREIGN KEY (designation_id) REFERENCES master_designations (id),
        CONSTRAINT employees_ibfk_2 FOREIGN KEY (site_id) REFERENCES master_sites (id),
        CONSTRAINT employees_ibfk_3 FOREIGN KEY (bank_id) REFERENCES master_banks (id),
        CONSTRAINT employees_ibfk_4 FOREIGN KEY (branch_id) REFERENCES master_branches (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS monthly_shifts (
        id int NOT NULL AUTO_INCREMENT,
        employee_id int NOT NULL,
        site_id int NOT NULL,
        month_year varchar(7) NOT NULL,
        total_shifts int DEFAULT '0',
        loan_deduction decimal(10,2) DEFAULT '0.00',
        festival_advance decimal(10,2) DEFAULT '0.00',
        other_deductions decimal(10,2) DEFAULT '0.00',
        special_allowance decimal(10,2) DEFAULT '0.00',
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        intensive decimal(10,2) DEFAULT '0.00',
        telephone_allow decimal(10,2) DEFAULT '0.00',
        salary_advance decimal(10,2) DEFAULT '0.00',
        deposit decimal(10,2) DEFAULT '0.00',
        other_allowance decimal(10,2) DEFAULT '0.00',
        PRIMARY KEY (id),
        UNIQUE KEY idx_monthly_record (employee_id,site_id,month_year),
        KEY fk_ms_site (site_id),
        CONSTRAINT fk_ms_employee FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
        CONSTRAINT fk_ms_site FOREIGN KEY (site_id) REFERENCES master_sites (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS office_employees (
        id int NOT NULL AUTO_INCREMENT,
        full_name varchar(255) NOT NULL,
        nic_number varchar(20) DEFAULT NULL,
        epf_number varchar(20) DEFAULT NULL,
        designation varchar(100) DEFAULT NULL,
        joined_date date DEFAULT NULL,
        gender enum('M','F') DEFAULT 'M',
        mobile_number varchar(15) DEFAULT NULL,
        basic_salary decimal(10,2) DEFAULT '0.00',
        budget_allowance decimal(10,2) DEFAULT '0.00',
        cost_of_living decimal(10,2) DEFAULT '17800.00',
        fuel_allowance decimal(10,2) DEFAULT '0.00',
        telephone_allowance decimal(10,2) DEFAULT '0.00',
        interim_allowance decimal(10,2) DEFAULT '0.00',
        special_allowance_20 decimal(10,2) DEFAULT '0.00',
        special_allowance_2 decimal(10,2) DEFAULT '0.00',
        chairman_allowance decimal(10,2) DEFAULT '0.00',
        bank_id int DEFAULT NULL,
        branch_id int DEFAULT NULL,
        account_number varchar(50) DEFAULT NULL,
        status enum('ACTIVE','TERMINATED') DEFAULT 'ACTIVE',
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY bank_id (bank_id),
        KEY branch_id (branch_id),
        CONSTRAINT office_employees_ibfk_1 FOREIGN KEY (bank_id) REFERENCES master_banks (id),
        CONSTRAINT office_employees_ibfk_2 FOREIGN KEY (branch_id) REFERENCES master_branches (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS office_monthly_data (
        id int NOT NULL AUTO_INCREMENT,
        employee_id int NOT NULL,
        month_year varchar(7) NOT NULL,
        allow_chairman decimal(10,2) DEFAULT '0.00',
        allow_acting_dir decimal(10,2) DEFAULT '0.00',
        allow_telephone decimal(10,2) DEFAULT '0.00',
        allow_fuel decimal(10,2) DEFAULT '0.00',
        allow_cost_of_living decimal(10,2) DEFAULT '0.00',
        allow_special_1 decimal(10,2) DEFAULT '0.00',
        allow_special_2 decimal(10,2) DEFAULT '0.00',
        allow_interim decimal(10,2) DEFAULT '0.00',
        deduct_stamp decimal(10,2) DEFAULT '0.00',
        deduct_elec_water decimal(10,2) DEFAULT '0.00',
        deduct_festival decimal(10,2) DEFAULT '0.00',
        deduct_loan decimal(10,2) DEFAULT '0.00',
        deduct_other decimal(10,2) DEFAULT '0.00',
        deduct_insurance decimal(10,2) DEFAULT '0.00',
        deduct_welfare decimal(10,2) DEFAULT '0.00',
        PRIMARY KEY (id),
        UNIQUE KEY unique_monthly_entry (employee_id,month_year),
        CONSTRAINT office_monthly_data_ibfk_1 FOREIGN KEY (employee_id) REFERENCES office_employees (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS system_users (
        id int NOT NULL AUTO_INCREMENT,
        full_name varchar(100) NOT NULL,
        username varchar(50) NOT NULL,
        password varchar(255) NOT NULL,
        role enum('SUPER_ADMIN','ADMIN','EDITOR','VIEWER') DEFAULT 'EDITOR',
        status enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      INSERT IGNORE INTO system_users (id, full_name, username, password, role) 
      VALUES (1, 'Super Admin', 'admin', 'admin', 'SUPER_ADMIN');
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