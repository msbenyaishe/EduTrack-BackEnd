const pool = require("../config/db");

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isValidDateString = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

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
  const { company_name, supervisor_name, start_date, end_date } = req.body || {};
  const internshipId = Number.parseInt(req.params.id, 10);
  const errors = {};

  if (!Number.isInteger(internshipId) || internshipId <= 0) {
    return res.status(400).json({
      message: "Invalid internship id",
      errors: { id: "id must be a valid integer" },
    });
  }

  if (!isNonEmptyString(company_name)) {
    errors.company_name = "company_name is required";
  }
  if (!isNonEmptyString(supervisor_name)) {
    errors.supervisor_name = "supervisor_name is required";
  }
  if (!isValidDateString(start_date)) {
    errors.start_date = "start_date must be a valid YYYY-MM-DD date";
  }
  if (!isValidDateString(end_date)) {
    errors.end_date = "end_date must be a valid YYYY-MM-DD date";
  }
  if (isValidDateString(start_date) && isValidDateString(end_date) && end_date < start_date) {
    errors.end_date = "end_date must be the same day or after start_date";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      message: "Validation failed",
      errors,
    });
  }

  try {
    const [existingRows] = await pool.query(
      "SELECT id, student_id FROM internships WHERE id = ?",
      [internshipId]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Internship not found" });
    }
    if (existingRows[0].student_id !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to update this internship" });
    }

    const [result] = await pool.query(
      `UPDATE internships
       SET company_name = ?, supervisor_name = ?, start_date = ?, end_date = ?
       WHERE id = ?`,
      [company_name.trim(), supervisor_name.trim(), start_date, end_date, internshipId]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Internship not found" });

    const [updatedRows] = await pool.query(
      `SELECT id, company_name, supervisor_name, start_date, end_date
       FROM internships
       WHERE id = ?`,
      [internshipId]
    );

    return res.json({
      success: true,
      message: "Internship updated",
      data: updatedRows[0],
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
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
