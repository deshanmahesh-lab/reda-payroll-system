import mysql from 'mysql2/promise';

// Database සම්බන්ධතා සැකසුම්
const dbConfig = {
  host: 'localhost',
  user: 'root',      // ඔයාගේ MySQL username (ගොඩක් වෙලාවට 'root')
  password: '25858ABcd12#@25858',      // වැදගත්: ඔයාගේ MySQL Password එක මෙතනට දාන්න
  database: 'reda_payroll_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// සම්බන්ධතාවය ගොඩනැගීම (Connection Pool)
const pool = mysql.createPool(dbConfig);

// Connection එක වැඩද කියලා බලන්න පොඩි ටෙස්ට් එකක්
pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL Database Connected Successfully!');
    connection.release();
  })
  .catch(error => {
    console.error('❌ Database Connection Failed:', error.message);
  });

export default pool;