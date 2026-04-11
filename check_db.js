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
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkSchema();
