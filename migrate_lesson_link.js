const pool = require("./config/db");

async function migrate() {
  try {
    console.log("Checking modules table schema...");
    const [columns] = await pool.query("SHOW COLUMNS FROM modules LIKE 'lesson_link'");
    
    if (columns.length === 0) {
      console.log("Adding lesson_link to modules table...");
      await pool.query("ALTER TABLE modules ADD COLUMN lesson_link VARCHAR(512) DEFAULT NULL");
      console.log("✅ Successfully added lesson_link to modules.");
    } else {
      console.log("ℹ️ Column lesson_link already exists.");
    }
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

migrate();
