const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const pool = require("../config/db");

async function check() {
  try {
    const [rows] = await pool.query("SELECT id, title, logo_url FROM modules WHERE title = 'React'");
    console.log("React module data:", rows);
  } catch (err) {
    console.error("Check failed:", err);
  } finally {
    process.exit();
  }
}

check();
