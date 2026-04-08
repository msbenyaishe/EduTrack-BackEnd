const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// GET /api/students/me
const getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, created_at FROM students WHERE id = ?",
      [req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Student not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/students/me
const updateProfile = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let query = "UPDATE students SET name = ?, email = ? WHERE id = ?";
    let params = [name, email, req.user.id];

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query = "UPDATE students SET name = ?, email = ?, password = ? WHERE id = ?";
      params = [name, email, hashed, req.user.id];
    }

    await pool.query(query, params);
    res.json({ message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/students/groups — groups the student has joined
const getGroups = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, t.name AS teacher_name, t.email AS teacher_email
       FROM groups g
       JOIN group_students gs ON gs.group_id = g.id
       JOIN teachers t ON g.teacher_id = t.id
       WHERE gs.student_id = ?
       ORDER BY gs.joined_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/students/modules — modules per teacher for the student's groups
const getModules = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT m.*, t.name AS teacher_name, g.name AS group_name, g.id AS group_id
       FROM modules m
       JOIN teachers t ON m.teacher_id = t.id
       JOIN groups g ON t.id = g.teacher_id
       JOIN group_students gs ON gs.group_id = g.id
       WHERE gs.student_id = ?
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/students/submissions — all submissions by the student
const getSubmissions = async (req, res) => {
  try {
    const studentId = req.user.id;

    const [workshopSubs] = await pool.query(
      `SELECT ws.*, w.title AS workshop_title, m.title AS module_title, g.name AS group_name
       FROM workshop_submissions ws
       JOIN workshops w ON ws.workshop_id = w.id
       JOIN modules m ON w.module_id = m.id
       JOIN groups g ON w.group_id = g.id
       WHERE ws.student_id = ?
       ORDER BY ws.submitted_at DESC`,
      [studentId]
    );

    const [sprintSubs] = await pool.query(
      `SELECT ss.*, sp.title AS sprint_title, at.name AS team_name, g.name AS group_name
       FROM sprint_submissions ss
       JOIN sprints sp ON ss.sprint_id = sp.id
       JOIN agile_teams at ON ss.agile_team_id = at.id
       JOIN groups g ON sp.group_id = g.id
       JOIN student_agile_teams sat ON sat.agile_team_id = at.id
       WHERE sat.student_id = ?
       ORDER BY ss.submitted_at DESC`,
      [studentId]
    );

    const [pfeSubs] = await pool.query(
      `SELECT ps.*, pt.name AS team_name, g.name AS group_name
       FROM pfe_submissions ps
       JOIN pfe_teams pt ON ps.pfe_team_id = pt.id
       JOIN groups g ON pt.group_id = g.id
       JOIN student_pfe_teams spt ON spt.pfe_team_id = pt.id
       WHERE spt.student_id = ?
       ORDER BY ps.submitted_at DESC`,
      [studentId]
    );

    res.json({ workshopSubmissions: workshopSubs, sprintSubmissions: sprintSubs, pfeSubmissions: pfeSubs });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { getProfile, updateProfile, getGroups, getModules, getSubmissions };
