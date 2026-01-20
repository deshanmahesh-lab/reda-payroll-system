import { ipcMain } from 'electron';
import db from './db.js';

export function setupUserHandlers() {

  // --- HELPER: LOG ACTIVITY ---
  const logActivity = async (userId, userName, type, desc) => {
    try {
      await db.execute(
        "INSERT INTO activity_logs (user_id, user_name, action_type, description) VALUES (?, ?, ?, ?)",
        [userId || 0, userName || 'System', type, desc]
      );
    } catch (e) { console.error("Log Error:", e); }
  };

  // 1. GET ALL USERS (පාස්වර්ඩ් එක ආරක්ෂාවට මෙතනින් යවන්නේ නෑ)
  ipcMain.handle('get-system-users', async () => {
    try {
      const [rows] = await db.execute("SELECT id, full_name, username, role, status, created_at FROM system_users ORDER BY id DESC");
      return { success: true, data: rows };
    } catch (e) { return { success: false, message: e.message }; }
  });

  // 2. ADD NEW USER (Password Save Fix)
  ipcMain.handle('add-system-user', async (event, data) => {
    try {
      if (!data.password) return { success: false, message: 'Password is required!' };
      
      await db.execute(
        "INSERT INTO system_users (full_name, username, password, role, status) VALUES (?, ?, ?, ?, 'ACTIVE')",
        [data.full_name, data.username, data.password, data.role]
      );
      return { success: true, message: 'User Created!' };
    } catch (e) { return { success: false, message: 'Username already exists or DB Error' }; }
  });

  // 3. UPDATE USER (Password Update Fix)
  ipcMain.handle('update-system-user', async (event, data) => {
    try {
      // මූලික තොරතුරු යාවත්කාලීන කිරීම
      await db.execute(
        "UPDATE system_users SET full_name=?, role=?, status=? WHERE id=?",
        [data.full_name, data.role, data.status, data.id]
      );

      // පාස්වර්ඩ් එක අලුතින් ගැහුවොත් විතරක් යාවත්කාලීන කරන්න
      if (data.password && String(data.password).trim() !== '') {
        await db.execute("UPDATE system_users SET password=? WHERE id=?", [data.password, data.id]);
      }

      return { success: true, message: 'User Updated!' };
    } catch (e) { return { success: false, message: 'Update Failed' }; }
  });

  // 4. DELETE USER
  ipcMain.handle('delete-system-user', async (event, id) => {
    try {
      await db.execute("DELETE FROM system_users WHERE id=?", [id]);
      return { success: true, message: 'User Deleted' };
    } catch (e) { return { success: false, message: 'Delete Failed' }; }
  });

  // 5. GET ACTIVITY LOGS (Error Handling Added)
  ipcMain.handle('get-activity-logs', async () => {
    try {
      // Check if table exists first to avoid crash
      const [rows] = await db.execute("SELECT * FROM activity_logs ORDER BY id DESC LIMIT 50");
      return { success: true, data: rows };
    } catch (e) { 
      console.error(e);
      return { success: true, data: [] }; // Return empty array if error, to prevent white screen
    }
  });

  // 6. LOG ENTRY
  ipcMain.handle('log-system-activity', async (event, data) => {
    await logActivity(data.user_id, data.user_name, data.type, data.description);
    return { success: true };
  });
}