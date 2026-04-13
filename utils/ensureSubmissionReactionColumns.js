const pool = require("../config/db");

const SUBMISSION_TABLES = ["workshop_submissions", "sprint_submissions", "pfe_submissions"];

async function ensureReactionColumn(tableName) {
  const [columns] = await pool.query(`SHOW COLUMNS FROM ${tableName} LIKE 'reaction'`);
  if (columns.length > 0) {
    return;
  }

  await pool.query(`ALTER TABLE ${tableName} ADD COLUMN reaction VARCHAR(8) NULL DEFAULT NULL`);
}

async function ensureSubmissionReactionColumns() {
  for (const tableName of SUBMISSION_TABLES) {
    await ensureReactionColumn(tableName);
  }
}

module.exports = { ensureSubmissionReactionColumns };
