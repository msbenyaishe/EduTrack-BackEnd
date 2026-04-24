const pool = require("../config/db");

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
  if (!name) return res.status(400).json({ message: "Company name is required" });

  try {
    const [result] = await pool.query(
      "INSERT INTO companies (name, phone, email) VALUES (?, ?, ?)",
      [name, phone || null, email || null]
    );
    res.status(201).json({ id: result.insertId, name, phone, email });
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

  if (!name) return res.status(400).json({ message: "Company name is required" });

  try {
    const [result] = await pool.query(
      "UPDATE companies SET name = ?, phone = ?, email = ? WHERE id = ?",
      [name, phone || null, email || null, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({ id: companyId, name, phone, email });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Company name already exists" });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { getCompanies, createCompany, updateCompany };
