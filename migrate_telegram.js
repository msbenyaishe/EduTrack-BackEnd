const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require("./config/db");

async function migrate() {
  try {
    console.log("Starting Telegram notification system migration...");

    // Update groups table
    console.log("Updating groups table...");
    try {
      await pool.query("ALTER TABLE groups ADD COLUMN telegram_chat_id VARCHAR(255);");
      console.log("Added telegram_chat_id to groups");
    } catch (e) {
      console.log("telegram_chat_id already exists in groups or error:", e.message);
    }

    // Update students table
    console.log("Updating students table...");
    try {
      await pool.query("ALTER TABLE students ADD COLUMN telegram_chat_id VARCHAR(255);");
      console.log("Added telegram_chat_id to students");
    } catch (e) {
      console.log("telegram_chat_id already exists in students or error:", e.message);
    }

    // Teachers table already updated in check_db.js, but let's ensure it's there
    console.log("Ensuring teachers table is up to date...");
    try {
      await pool.query("ALTER TABLE teachers ADD COLUMN telegram_chat_id VARCHAR(255);");
      console.log("Added telegram_chat_id to teachers (just in case)");
    } catch (e) {
      // Ignore
    }

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
