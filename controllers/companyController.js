const pool = require("../config/db");

const normalizeName = (value = "") => value.trim().replace(/\s+/g, " ");

const getCompanies = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM companies ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const createCompany = async (req, res) => {
  const { name, phone, email } = req.body;
  const normalizedName = normalizeName(name || "");
  if (!normalizedName) return res.status(400).json({ message: "Company name is required" });

  try {
    const [existingRows] = await pool.query(
      "SELECT id, name, phone, email FROM companies WHERE LOWER(TRIM(name)) = LOWER(?) LIMIT 1",
      [normalizedName]
    );
    if (existingRows.length > 0) {
      return res.status(200).json({ ...existingRows[0], alreadyExists: true });
    }

    const [result] = await pool.query(
      "INSERT INTO companies (name, phone, email) VALUES (?, ?, ?)",
      [normalizedName, phone || null, email || null]
    );
    res.status(201).json({ id: result.insertId, name: normalizedName, phone, email });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Company already exists" });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const updateCompany = async (req, res) => {
  const { name, phone, email } = req.body;
  const companyId = req.params.id;
  const normalizedName = normalizeName(name || "");

  if (!normalizedName) return res.status(400).json({ message: "Company name is required" });

  try {
    const [duplicateRows] = await pool.query(
      "SELECT id FROM companies WHERE LOWER(TRIM(name)) = LOWER(?) AND id <> ? LIMIT 1",
      [normalizedName, companyId]
    );
    if (duplicateRows.length > 0) {
      return res.status(409).json({ message: "Company name already exists" });
    }

    const [result] = await pool.query(
      "UPDATE companies SET name = ?, phone = ?, email = ? WHERE id = ?",
      [normalizedName, phone || null, email || null, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({ id: companyId, name: normalizedName, phone, email });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Company name already exists" });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const deleteCompany = async (req, res) => {
  if (req.user.role !== "teacher") {
    return res.status(403).json({ message: "Only teachers can delete companies" });
  }

  const companyId = req.params.id;

  try {
    // Check if any internships are linked to this company
    const [linkedInternships] = await pool.query(
      "SELECT id FROM internships WHERE company_id = ?",
      [companyId]
    );

    if (linkedInternships.length > 0) {
      return res.status(400).json({ 
        message: "Cannot delete company: It is linked to existing student internships. Please remove or update the internships first." 
      });
    }

    const [result] = await pool.query("DELETE FROM companies WHERE id = ?", [companyId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({ message: "Company deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { getCompanies, createCompany, updateCompany, deleteCompany };
