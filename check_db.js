const pool = require("./config/db");

async function checkSchema() {
  try {
    console.log("Checking agile_teams table:");
    const [agileTeams] = await pool.query("DESCRIBE agile_teams");
    console.table(agileTeams);

    console.log("\nChecking student_agile_teams table:");
    const [studentAgileTeams] = await pool.query("DESCRIBE student_agile_teams");
    console.table(studentAgileTeams);

    console.log("\nChecking groups table:");
    const [groups] = await pool.query("DESCRIBE groups");
    console.table(groups);

    console.log("\nChecking/updating teachers table for Telegram fields:");
    try {
      await pool.query("ALTER TABLE teachers ADD COLUMN telegram_chat_id VARCHAR(255);");
      console.log("Added telegram_chat_id to teachers");
    } catch (e) {
      // Ignored if column already exists
    }
    try {
      await pool.query("ALTER TABLE teachers ADD COLUMN telegram_notification_preferences JSON;");
      console.log("Added telegram_notification_preferences to teachers");
    } catch (e) {
      // Ignored if column already exists
    }

    const [teachers] = await pool.query("DESCRIBE teachers");
    console.table(teachers);
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkSchema();
