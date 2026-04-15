const pool = require("../config/db");

// POST /api/pfe/teams  (student)
const createTeam = async (req, res) => {
  const { group_id, name } = req.body;
  if (!group_id) return res.status(400).json({ message: "group_id is required" });

  try {
    // Ensure created_by column exists (graceful migration)
    try {
      await pool.query("ALTER TABLE pfe_teams ADD COLUMN created_by INT;");
    } catch (e) { /* ignore if exists */ }

    const [result] = await pool.query(
      "INSERT INTO pfe_teams (group_id, name, created_by) VALUES (?, ?, ?)",
      [group_id, name || null, req.user.id]
    );
    // Auto-join creator
    await pool.query(
      "INSERT INTO student_pfe_teams (pfe_team_id, student_id) VALUES (?, ?)",
      [result.insertId, req.user.id]
    );
    res.status(201).json({ id: result.insertId, group_id, name, created_by: req.user.id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/pfe/teams/join  (student)
const joinTeam = async (req, res) => {
  const { team_id } = req.body;
  if (!team_id) return res.status(400).json({ message: "team_id is required" });

  try {
    const [existing] = await pool.query(
      "SELECT id FROM student_pfe_teams WHERE pfe_team_id = ? AND student_id = ?",
      [team_id, req.user.id]
    );
    if (existing.length > 0)
      return res.status(409).json({ message: "Already in this PFE team" });

    await pool.query(
      "INSERT INTO student_pfe_teams (pfe_team_id, student_id) VALUES (?, ?)",
      [team_id, req.user.id]
    );
    res.status(201).json({ message: "Joined PFE team" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/pfe/teams/:groupId — all PFE teams in a group
const getTeamsByGroup = async (req, res) => {
  try {
    const [teams] = await pool.query(
      `SELECT pt.*, 
       COALESCE(pt.created_by, (SELECT student_id FROM student_pfe_teams WHERE pfe_team_id = pt.id ORDER BY id ASC LIMIT 1)) AS created_by
       FROM pfe_teams pt
       JOIN groups g ON pt.group_id = g.id
       WHERE pt.group_id = ?`,
      [req.params.groupId]
    );

    for (const team of teams) {
      const [members] = await pool.query(
        `SELECT s.id, s.name, s.email
         FROM students s
         JOIN student_pfe_teams spt ON spt.student_id = s.id
         WHERE spt.pfe_team_id = ?`,
        [team.id]
      );
      team.members = members;
    }

    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/pfe/teams/:teamId
const deleteTeam = async (req, res) => {
  try {
    await pool.query("DELETE FROM pfe_teams WHERE id = ?", [req.params.teamId]);
    res.json({ message: "PFE team deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/pfe/submit  (student)
const submitPFE = async (req, res) => {
  const { pfe_team_id, project_title, description, project_repo, project_demo, explanation_video, report_pdf } = req.body;
  if (!pfe_team_id) return res.status(400).json({ message: "pfe_team_id is required" });

  try {
    const [existing] = await pool.query(
      "SELECT id FROM pfe_submissions WHERE pfe_team_id = ?",
      [pfe_team_id]
    );
    if (existing.length > 0) {
      await pool.query(
        `UPDATE pfe_submissions 
         SET project_title = ?, description = ?, project_repo = ?, project_demo = ?, explanation_video = ?, report_pdf = ?
         WHERE pfe_team_id = ?`,
        [project_title || null, description || null, project_repo || null, project_demo || null, explanation_video || null, report_pdf || null, pfe_team_id]
      );
      return res.json({ message: "PFE submission updated" });
    }
    
    const [result] = await pool.query(
      `INSERT INTO pfe_submissions
         (pfe_team_id, project_title, description, project_repo, project_demo, explanation_video, report_pdf)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [pfe_team_id, project_title || null, description || null,
       project_repo || null, project_demo || null, explanation_video || null, report_pdf || null]
    );
    res.status(201).json({ id: result.insertId, message: "PFE submitted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/pfe/submissions/:groupId  (teacher)
const getSubmissionsByGroup = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ps.*, pt.name AS team_name
       FROM pfe_submissions ps
       JOIN pfe_teams pt ON ps.pfe_team_id = pt.id
       WHERE pt.group_id = ?
       ORDER BY ps.submitted_at DESC`,
      [req.params.groupId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/pfe/submissions/team/:teamId
const getSubmissionByTeam = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM pfe_submissions WHERE pfe_team_id = ?",
      [req.params.teamId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/pfe/teams/:teamId/members/:studentId
const removeMember = async (req, res) => {
  const { teamId, studentId } = req.params;

  try {
    // 1. Verify requester is the creator or a teacher
    if (req.user.role !== 'teacher') {
      const [team] = await pool.query("SELECT created_by FROM pfe_teams WHERE id = ?", [teamId]);
      if (team.length === 0) return res.status(404).json({ message: "Team not found" });

      if (team[0].created_by !== req.user.id) {
        return res.status(403).json({ message: "Only the team creator or a teacher can remove members." });
      }

      // 2. Prevent removing the creator themselves (they should delete the team instead if they want to leave)
      if (Number(studentId) === req.user.id) {
        return res.status(400).json({ message: "You cannot remove yourself from the team. Use delete team instead." });
      }
    }

    // 3. Remove from junction table
    await pool.query(
      "DELETE FROM student_pfe_teams WHERE pfe_team_id = ? AND student_id = ?",
      [teamId, studentId]
    );
    res.json({ message: "Member removed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  createTeam, joinTeam, getTeamsByGroup, deleteTeam,
  submitPFE, getSubmissionsByGroup, getSubmissionByTeam, removeMember
};
