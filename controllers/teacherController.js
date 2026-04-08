const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// GET /api/teachers/me
const getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, created_at FROM teachers WHERE id = ?",
      [req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Teacher not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/teachers/me
const updateProfile = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let query = "UPDATE teachers SET name = ?, email = ? WHERE id = ?";
    let params = [name, email, req.user.id];

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query = "UPDATE teachers SET name = ?, email = ?, password = ? WHERE id = ?";
      params = [name, email, hashed, req.user.id];
    }

    await pool.query(query, params);
    res.json({ message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/teachers/groups
const getGroups = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM groups WHERE teacher_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/teachers/modules
const getModules = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM modules WHERE teacher_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/teachers/submissions
const getSubmissionsDashboard = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // Workshop submissions across teacher's workshops
    const [workshopSubs] = await pool.query(
      `SELECT ws.*, w.title AS workshop_title, s.name AS student_name, s.email AS student_email,
              g.name AS group_name, m.title AS module_title
       FROM workshop_submissions ws
       JOIN workshops w ON ws.workshop_id = w.id
       JOIN students s ON ws.student_id = s.id
       JOIN groups g ON w.group_id = g.id
       JOIN modules m ON w.module_id = m.id
       WHERE m.teacher_id = ?
       ORDER BY ws.submitted_at DESC`,
      [teacherId]
    );

    // Sprint submissions across teacher's sprints
    const [sprintSubs] = await pool.query(
      `SELECT ss.*, sp.title AS sprint_title, at.name AS team_name,
              g.name AS group_name, m.title AS module_title
       FROM sprint_submissions ss
       JOIN sprints sp ON ss.sprint_id = sp.id
       JOIN agile_teams at ON ss.agile_team_id = at.id
       JOIN groups g ON sp.group_id = g.id
       JOIN modules m ON sp.module_id = m.id
       WHERE m.teacher_id = ?
       ORDER BY ss.submitted_at DESC`,
      [teacherId]
    );

    // PFE submissions across teacher's groups
    const [pfeSubs] = await pool.query(
      `SELECT ps.*, pt.name AS team_name, g.name AS group_name
       FROM pfe_submissions ps
       JOIN pfe_teams pt ON ps.pfe_team_id = pt.id
       JOIN groups g ON pt.group_id = g.id
       WHERE g.teacher_id = ?
       ORDER BY ps.submitted_at DESC`,
      [teacherId]
    );

    res.json({ workshopSubmissions: workshopSubs, sprintSubmissions: sprintSubs, pfeSubmissions: pfeSubs });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { getProfile, updateProfile, getGroups, getModules, getSubmissionsDashboard };
