const pool = require("../config/db");

// POST /api/internships  (student)
const submitInternship = async (req, res) => {
  const { company_name, supervisor_name, start_date, end_date, report_pdf } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO internships (student_id, company_name, supervisor_name, start_date, end_date, report_pdf)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, company_name || null, supervisor_name || null,
       start_date || null, end_date || null, report_pdf || null]
    );
    res.status(201).json({ id: result.insertId, message: "Internship submitted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/internships/me  (student)
const getMyInternship = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM internships WHERE student_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/internships/:id  (student)
const updateInternship = async (req, res) => {
  const { company_name, supervisor_name, start_date, end_date, report_pdf } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE internships
       SET company_name = ?, supervisor_name = ?, start_date = ?, end_date = ?, report_pdf = ?
       WHERE id = ? AND student_id = ?`,
      [company_name, supervisor_name, start_date, end_date, report_pdf, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Internship not found" });
    res.json({ message: "Internship updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/internships/group/:groupId  (teacher)
const getInternshipsByGroup = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, s.name AS student_name, s.email AS student_email
       FROM internships i
       JOIN students s ON i.student_id = s.id
       JOIN group_students gs ON gs.student_id = s.id
       WHERE gs.group_id = ?
       ORDER BY i.created_at DESC`,
      [req.params.groupId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { submitInternship, getMyInternship, updateInternship, getInternshipsByGroup };
