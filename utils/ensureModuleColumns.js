const pool = require("../config/db");

async function ensureModuleColumns() {
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM modules LIKE 'lesson_link'");
    if (columns.length === 0) {
      console.log("Adding lesson_link to modules table...");
      await pool.query("ALTER TABLE modules ADD COLUMN lesson_link VARCHAR(512) DEFAULT NULL");
      console.log("✅ Successfully added lesson_link to modules.");
    }
  } catch (err) {
    console.error("❌ Failed to ensure module columns:", err.message);
  }
}

module.exports = { ensureModuleColumns };
