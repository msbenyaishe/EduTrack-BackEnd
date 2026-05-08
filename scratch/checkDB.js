require('dotenv').config({ path: 'c:/Users/Dell PC/Desktop/EduTrack/backend/.env' });
const pool = require('../config/db');


async function checkTeacherChatId() {
  try {
    const [rows] = await pool.query("SELECT id, name, telegram_chat_id FROM teachers");
    console.log("Teachers in DB:");
    console.table(rows);
    
    const [modules] = await pool.query("SELECT id, title, teacher_id FROM modules");
    console.log("\nModules in DB:");
    console.table(modules);

    const workshopId = 26; // Example from Workshops in DB
    const [info] = await pool.query(`
        SELECT t.telegram_chat_id, w.title as assignmentTitle, m.title as moduleName, g.name as groupName
        FROM workshops w
        JOIN modules m ON w.module_id = m.id
        JOIN teachers t ON m.teacher_id = t.id
        JOIN groups g ON w.group_id = g.id
        WHERE w.id = ?
      `, [workshopId]);
    console.log("\nQuery result for workshop 26:");
    console.table(info);

  } catch (err) {
    console.error("Error checking DB:", err.message);
  } finally {
    process.exit();
  }
}

checkTeacherChatId();
