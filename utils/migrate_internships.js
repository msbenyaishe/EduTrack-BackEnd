const pool = require("../config/db");

async function migrate() {
  const connection = await pool.getConnection();
  try {
    console.log("Starting migration...");

    // 1. Create companies table
    console.log("Creating companies table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Insert unique companies from internships
    console.log("Migrating company names to companies table...");
    await connection.query(`
      INSERT IGNORE INTO companies (name)
      SELECT DISTINCT company_name FROM internships WHERE company_name IS NOT NULL
    `);

    // 3. Add company_id to internships if it doesn't exist
    const [columns] = await connection.query("SHOW COLUMNS FROM internships LIKE 'company_id'");
    if (columns.length === 0) {
      console.log("Adding company_id column to internships...");
      await connection.query("ALTER TABLE internships ADD COLUMN company_id INT");
    }

    // 4. Update company_id in internships
    console.log("Updating internships with company_id...");
    await connection.query(`
      UPDATE internships i
      JOIN companies c ON i.company_name = c.name
      SET i.company_id = c.id
      WHERE i.company_id IS NULL
    `);

    // 5. Drop company_name from internships if it exists
    const [oldColumn] = await connection.query("SHOW COLUMNS FROM internships LIKE 'company_name'");
    if (oldColumn.length > 0) {
      console.log("Dropping company_name column from internships...");
      await connection.query("ALTER TABLE internships DROP COLUMN company_name");
    }

    // 6. Add foreign key if it doesn't exist
    try {
        console.log("Adding foreign key constraint...");
        await connection.query(`
          ALTER TABLE internships 
          ADD CONSTRAINT fk_internship_company 
          FOREIGN KEY (company_id) REFERENCES companies(id)
        `);
    } catch (fkError) {
        if (fkError.code === 'ER_FK_DUP_NAME' || fkError.code === 'ER_DUP_CONSTRAINT_NAME') {
            console.log("Foreign key already exists.");
        } else {
            throw fkError;
        }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    connection.release();
    process.exit();
  }
}

migrate();
