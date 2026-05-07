const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require("../config/db");

async function checkGroupId() {
  try {
    const [rows] = await pool.query("SELECT id, name, telegram_chat_id FROM groups WHERE telegram_chat_id IS NOT NULL");
    console.log("Groups with Telegram Chat ID:");
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkGroupId();
