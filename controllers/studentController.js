const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const ALLOWED_SUBMISSION_TYPES = new Set(["workshop", "sprint", "pfe"]);

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
      `SELECT g.*, gs.joined_at, t.name AS teacher_name, t.email AS teacher_email
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
       AND (g.invite_expires_at IS NULL OR g.invite_expires_at > NOW())
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
      `SELECT ws.*, ws.reaction AS teacher_reaction, w.title AS workshop_title, m.title AS module_title, g.name AS group_name
       FROM workshop_submissions ws
       JOIN workshops w ON ws.workshop_id = w.id
       JOIN modules m ON w.module_id = m.id
       JOIN groups g ON w.group_id = g.id
       WHERE ws.student_id = ?
       ORDER BY ws.submitted_at DESC`,
      [studentId]
    );

    const [sprintSubs] = await pool.query(
      `SELECT ss.*, ss.reaction AS teacher_reaction, sp.title AS sprint_title, m.title AS module_title, at.name AS team_name, g.name AS group_name
       FROM sprint_submissions ss
       JOIN sprints sp ON ss.sprint_id = sp.id
       JOIN modules m ON sp.module_id = m.id
       JOIN agile_teams at ON ss.agile_team_id = at.id
       JOIN groups g ON sp.group_id = g.id
       JOIN student_agile_teams sat ON sat.agile_team_id = at.id
       WHERE sat.student_id = ?
       ORDER BY ss.submitted_at DESC`,
      [studentId]
    );

    const [pfeSubs] = await pool.query(
      `SELECT ps.*, ps.reaction AS teacher_reaction, pt.name AS team_name, g.name AS group_name
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

// DELETE /api/students/submissions
const deleteSubmission = async (req, res) => {
  const payloadKeys = Object.keys(req.body || {});
  const { submissionType, submissionId } = req.body || {};

  if (
    payloadKeys.length !== 2 ||
    !ALLOWED_SUBMISSION_TYPES.has(submissionType) ||
    !Number.isInteger(submissionId)
  ) {
    return res.status(400).json({
      message: "Invalid payload. Expected { submissionType, submissionId } with allowed values.",
    });
  }

  try {
    const studentId = req.user.id;
    const typeConfig = {
      workshop: {
        table: "workshop_submissions",
        existenceQuery: "SELECT id FROM workshop_submissions WHERE id = ?",
        authorizationQuery: "SELECT id FROM workshop_submissions WHERE id = ? AND student_id = ?",
      },
      sprint: {
        table: "sprint_submissions",
        existenceQuery: "SELECT id FROM sprint_submissions WHERE id = ?",
        authorizationQuery: `SELECT ss.id
          FROM sprint_submissions ss
          JOIN student_agile_teams sat ON sat.agile_team_id = ss.agile_team_id
          WHERE ss.id = ? AND sat.student_id = ?`,
      },
      pfe: {
        table: "pfe_submissions",
        existenceQuery: "SELECT id FROM pfe_submissions WHERE id = ?",
        authorizationQuery: `SELECT ps.id
          FROM pfe_submissions ps
          JOIN student_pfe_teams spt ON spt.pfe_team_id = ps.pfe_team_id
          WHERE ps.id = ? AND spt.student_id = ?`,
      },
    };

    const config = typeConfig[submissionType];

    const [existingRows] = await pool.query(config.existenceQuery, [submissionId]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const [authorizedRows] = await pool.query(config.authorizationQuery, [submissionId, studentId]);
    if (authorizedRows.length === 0) {
      return res.status(403).json({ message: "Unauthorized to delete this submission" });
    }

    await pool.query(`DELETE FROM ${config.table} WHERE id = ?`, [submissionId]);
    return res.json({ success: true, message: "Submission deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getGroups,
  getModules,
  getSubmissions,
  deleteSubmission,
};
