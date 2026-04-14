const pool = require("../config/db");

// POST /api/workshops  (teacher)
const createWorkshop = async (req, res) => {
  const { module_id, group_id, title, description, pdf_report, repo, web_page } = req.body;
  if (!module_id || !group_id || !title)
    return res.status(400).json({ message: "module_id, group_id and title are required" });

  try {
    const [result] = await pool.query(
      `INSERT INTO workshops (module_id, group_id, title, description, pdf_report, repo, web_page)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [module_id, group_id, title, description || null, pdf_report || null, repo || null, web_page || null]
    );
    res.status(201).json({ id: result.insertId, title });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/workshops/group/:groupId  (teacher)
const getWorkshopsByGroup = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT w.*, m.title AS module_title
       FROM workshops w
       JOIN modules m ON w.module_id = m.id
       WHERE w.group_id = ? AND m.teacher_id = ?
       ORDER BY w.created_at DESC`,
      [req.params.groupId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/workshops/:id
const getWorkshopById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM workshops WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Workshop not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/workshops/:id  (teacher)
const updateWorkshop = async (req, res) => {
  const { title, description, pdf_report, repo, web_page } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE workshops w
       JOIN modules m ON w.module_id = m.id
       SET w.title = ?, w.description = ?, w.pdf_report = ?, w.repo = ?, w.web_page = ?
       WHERE w.id = ? AND m.teacher_id = ?`,
      [title, description, pdf_report, repo, web_page, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Workshop not found" });
    res.json({ message: "Workshop updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/workshops/:id  (teacher)
const deleteWorkshop = async (req, res) => {
  try {
    const [result] = await pool.query(
      `DELETE w FROM workshops w
       JOIN modules m ON w.module_id = m.id
       WHERE w.id = ? AND m.teacher_id = ?`,
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Workshop not found" });
    res.json({ message: "Workshop deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/workshops/student  (student — all workshops in their groups)
const getStudentWorkshops = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT w.*, m.title AS module, t.name AS teacher, g.name AS group_name
       FROM workshops w
       JOIN modules m ON w.module_id = m.id
       JOIN teachers t ON m.teacher_id = t.id
       JOIN groups g ON w.group_id = g.id
       JOIN group_students gs ON gs.group_id = g.id
       WHERE gs.student_id = ?
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/workshops/:id/submit  (student)
const submitWorkshop = async (req, res) => {
  const { repo, web_page, pdf_report } = req.body;
  const workshopId = req.params.id;

  try {
    // Check already submitted
    const [existing] = await pool.query(
      "SELECT id FROM workshop_submissions WHERE workshop_id = ? AND student_id = ?",
      [workshopId, req.user.id]
    );
    if (existing.length > 0)
      return res.status(409).json({ message: "Already submitted" });

    const [result] = await pool.query(
      `INSERT INTO workshop_submissions (workshop_id, student_id, pdf_report, repo, web_page)
       VALUES (?, ?, ?, ?, ?)`,
      [workshopId, req.user.id, pdf_report || null, repo || null, web_page || null]
    );
    res.status(201).json({ id: result.insertId, message: "Workshop submitted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/workshops/workshop-submissions/my  (student)
const getMySubmissions = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ws.*, w.title AS workshop_title, m.title AS module_title
       FROM workshop_submissions ws
       JOIN workshops w ON ws.workshop_id = w.id
       JOIN modules m ON w.module_id = m.id
       WHERE ws.student_id = ?
       ORDER BY ws.submitted_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/workshop-submissions/workshop/:workshopId  (teacher)
const getSubmissionsByWorkshop = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ws.*, s.name AS student_name, s.email AS student_email
       FROM workshop_submissions ws
       JOIN students s ON ws.student_id = s.id
       WHERE ws.workshop_id = ?
       ORDER BY ws.submitted_at DESC`,
      [req.params.workshopId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/workshop-submissions/group/:groupId  (teacher)
const getSubmissionsByGroup = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ws.*, s.name AS student_name, w.title AS workshop_title, m.title AS module_title
       FROM workshop_submissions ws
       JOIN students s ON ws.student_id = s.id
       JOIN workshops w ON ws.workshop_id = w.id
       JOIN modules m ON w.module_id = m.id
       WHERE w.group_id = ?
       ORDER BY ws.submitted_at DESC`,
      [req.params.groupId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  createWorkshop, getWorkshopsByGroup, getWorkshopById, updateWorkshop,
  deleteWorkshop, getStudentWorkshops, submitWorkshop, getMySubmissions,
  getSubmissionsByWorkshop, getSubmissionsByGroup,
};
