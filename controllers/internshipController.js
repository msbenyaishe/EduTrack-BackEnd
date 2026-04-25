const pool = require("../config/db");

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isValidDateString = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

// POST /api/internships  (student)
const submitInternship = async (req, res) => {
  const { company_id, supervisor_name, start_date, end_date, report_pdf } = req.body;
  const errors = {};

  if (!company_id) {
    errors.company_id = "company_id is required";
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
    const [companyRows] = await pool.query("SELECT id FROM companies WHERE id = ? LIMIT 1", [company_id]);
    if (companyRows.length === 0) {
      return res.status(422).json({
        message: "Validation failed",
        errors: { company_id: "company_id must reference an existing company" },
      });
    }

    const [result] = await pool.query(
      `INSERT INTO internships (student_id, company_id, supervisor_name, start_date, end_date, report_pdf)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, company_id, supervisor_name.trim(), start_date, end_date, report_pdf || null]
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
      `SELECT i.*, c.name AS company_name, c.email AS company_email, c.phone AS company_phone
       FROM internships i
       LEFT JOIN companies c ON i.company_id = c.id
       WHERE i.student_id = ? 
       ORDER BY i.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/internships/:id  (student)
const updateInternship = async (req, res) => {
  const { company_id, supervisor_name, start_date, end_date, report_pdf } = req.body || {};
  const internshipId = Number.parseInt(req.params.id, 10);
  const errors = {};

  if (!Number.isInteger(internshipId) || internshipId <= 0) {
    return res.status(400).json({
      message: "Invalid internship id",
      errors: { id: "id must be a valid integer" },
    });
  }

  if (!company_id) {
    errors.company_id = "company_id is required";
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
       SET company_id = ?, supervisor_name = ?, start_date = ?, end_date = ?, report_pdf = ?
       WHERE id = ?`,
      [company_id, supervisor_name.trim(), start_date, end_date, report_pdf || null, internshipId]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Internship not found" });

    const [updatedRows] = await pool.query(
      `SELECT i.*, c.name AS company_name
       FROM internships i
       LEFT JOIN companies c ON i.company_id = c.id
       WHERE i.id = ?`,
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

// DELETE /api/internships/:id  (student)
const deleteInternship = async (req, res) => {
  const internshipId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(internshipId) || internshipId <= 0) {
    return res.status(400).json({
      message: "Invalid internship id",
      errors: { id: "id must be a valid integer" },
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
      return res.status(403).json({ message: "Unauthorized to delete this internship" });
    }

    await pool.query("DELETE FROM internships WHERE id = ?", [internshipId]);

    return res.json({
      success: true,
      message: "Internship deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/internships/group/:groupId  (teacher)
const getInternshipsByGroup = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, c.name AS company_name, s.name AS student_name, s.email AS student_email
       FROM internships i
       LEFT JOIN companies c ON i.company_id = c.id
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

module.exports = { submitInternship, getMyInternship, updateInternship, deleteInternship, getInternshipsByGroup };
