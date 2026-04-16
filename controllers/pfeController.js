const pool = require("../config/db");

// POST /api/pfe/teams  (student)
const createTeam = async (req, res) => {
  const { group_id, name } = req.body;
  if (!group_id) return res.status(400).json({ message: "Please select a valid group to create a PFE team." });

  try {
    // Ensure created_by column exists (graceful migration)
    try {
      await pool.query("ALTER TABLE pfe_teams ADD COLUMN created_by INT;");
    } catch (e) { /* ignore if exists */ }

    const [existing] = await pool.query(
      `SELECT spt.id 
       FROM student_pfe_teams spt
       JOIN pfe_teams pt ON spt.pfe_team_id = pt.id
       WHERE spt.student_id = ? AND pt.group_id = ?`,
      [req.user.id, group_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "You are already a member of a PFE team in this group. Multiple team memberships per group are not permitted." });
    }

    const [result] = await pool.query(
      "INSERT INTO pfe_teams (group_id, name, created_by) VALUES (?, ?, ?)",
      [group_id, name || null, req.user.id]
    );
    // Auto-join creator
    await pool.query(
      "INSERT INTO student_pfe_teams (pfe_team_id, student_id) VALUES (?, ?)",
      [result.insertId, req.user.id]
    );
    res.status(201).json({ id: result.insertId, group_id, name, message: "PFE team created successfully." });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while creating your team. Please try again later.", error: err.message });
  }
};

// POST /api/pfe/teams/join  (student)
const joinTeam = async (req, res) => {
  const { team_id } = req.body;
  if (!team_id) return res.status(400).json({ message: "A valid Team ID is required to join." });

  try {
    const [teamInfo] = await pool.query("SELECT group_id FROM pfe_teams WHERE id = ?", [team_id]);
    if (teamInfo.length === 0) return res.status(404).json({ message: "The requested PFE team could not be found." });

    const [existingInGroup] = await pool.query(
      `SELECT spt.id 
       FROM student_pfe_teams spt
       JOIN pfe_teams pt ON spt.pfe_team_id = pt.id
       WHERE spt.student_id = ? AND pt.group_id = ?`,
      [req.user.id, teamInfo[0].group_id]
    );

    if (existingInGroup.length > 0) {
      return res.status(400).json({ message: "You are already registered in a PFE team for this group." });
    }

    const [existing] = await pool.query(
      "SELECT id FROM student_pfe_teams WHERE pfe_team_id = ? AND student_id = ?",
      [team_id, req.user.id]
    );
    if (existing.length > 0)
      return res.status(409).json({ message: "You are already a member of this team." });

    await pool.query(
      "INSERT INTO student_pfe_teams (pfe_team_id, student_id) VALUES (?, ?)",
      [team_id, req.user.id]
    );
    res.status(201).json({ message: "Successfully joined the PFE team." });
  } catch (err) {
    res.status(500).json({ message: "An unexpected error occurred while joining the team.", error: err.message });
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
    res.status(500).json({ message: "Failed to retrieve PFE teams. Please refresh the page.", error: err.message });
  }
};

// DELETE /api/pfe/teams/:teamId
const deleteTeam = async (req, res) => {
  try {
    // Verify membership or teacher role
    if (req.user.role !== 'teacher') {
      const [membership] = await pool.query(
        "SELECT id FROM student_pfe_teams WHERE pfe_team_id = ? AND student_id = ?",
        [req.params.teamId, req.user.id]
      );
      if (membership.length === 0) {
        return res.status(403).json({ message: "Insufficient permissions. Only team members or faculty can delete this team." });
      }
    }

    const [result] = await pool.query("DELETE FROM pfe_teams WHERE id = ?", [req.params.teamId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "PFE team not found." });
    
    res.json({ message: "PFE team has been successfully deleted." });
  } catch (err) {
    res.status(500).json({ message: "Could not complete team deletion. Please try again later.", error: err.message });
  }
};

// PUT /api/pfe/teams/:teamId — rename team (student members)
const updateTeam = async (req, res) => {
  const { name } = req.body;
  const { teamId } = req.params;
  
  if (!name || !name.trim()) return res.status(400).json({ message: "A valid team name must be provided." });

  try {
    // Verify membership
    const [membership] = await pool.query(
      "SELECT id FROM student_pfe_teams WHERE pfe_team_id = ? AND student_id = ?",
      [teamId, req.user.id]
    );

    if (membership.length === 0 && req.user.role !== 'teacher') {
      return res.status(403).json({ message: "Action denied. Only team members or faculty can modify this team." });
    }

    const [result] = await pool.query("UPDATE pfe_teams SET name = ? WHERE id = ?", [name.trim(), teamId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "PFE team not found." });

    res.json({ message: "PFE team name updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "Error updating team name. Please try again.", error: err.message });
  }
};

// POST /api/pfe/submit  (student)
const submitPFE = async (req, res) => {
  const { pfe_team_id, project_title, description, project_repo, project_demo, explanation_video, report_pdf } = req.body;
  if (!pfe_team_id) return res.status(400).json({ message: "A PFE team ID must be associated with this submission." });

  try {
    const [existing] = await pool.query(
      "SELECT id FROM pfe_submissions WHERE pfe_team_id = ?",
      [pfe_team_id]
    );
    if (existing.length > 0) {
      await pool.query(
        `UPDATE pfe_submissions 
         SET project_title = ?, description = ?, project_repo = ?, project_demo = ?, explanation_video = ?, report_pdf = ?, submitted_at = NOW()
         WHERE pfe_team_id = ?`,
        [project_title || null, description || null, project_repo || null, project_demo || null, explanation_video || null, report_pdf || null, pfe_team_id]
      );
      return res.json({ message: "PFE submission has been successfully updated." });
    }
    
    const [result] = await pool.query(
      `INSERT INTO pfe_submissions
         (pfe_team_id, project_title, description, project_repo, project_demo, explanation_video, report_pdf)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [pfe_team_id, project_title || null, description || null,
       project_repo || null, project_demo || null, explanation_video || null, report_pdf || null]
    );
    res.status(201).json({ id: result.insertId, message: "PFE project submitted successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Failed to save PFE submission. Please check your data and try again.", error: err.message });
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
    res.status(500).json({ message: "Unable to load PFE submissions.", error: err.message });
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
    res.status(500).json({ message: "Error retrieving team submission data.", error: err.message });
  }
};

// POST /api/pfe/teams/members — add a member (by a member)
const addMember = async (req, res) => {
  const { team_id, student_id } = req.body;
  if (!team_id || !student_id) return res.status(400).json({ message: "Team ID and Student ID are required parameters." });

  try {
    // 1. Verify requester is a member or teacher
    if (req.user.role !== 'teacher') {
      const [membership] = await pool.query(
        "SELECT id FROM student_pfe_teams WHERE pfe_team_id = ? AND student_id = ?",
        [team_id, req.user.id]
      );
      if (membership.length === 0) {
        return res.status(403).json({ message: "You do not have permission to add members to this team." });
      }
    }

    // 2. Check if target student is already in a PFE team for this group
    const [teamInfo] = await pool.query("SELECT group_id FROM pfe_teams WHERE id = ?", [team_id]);
    if (teamInfo.length === 0) return res.status(404).json({ message: "PFE team not found." });

    const [existing] = await pool.query(
      `SELECT spt.id FROM student_pfe_teams spt
       JOIN pfe_teams pt ON spt.pfe_team_id = pt.id
       WHERE spt.student_id = ? AND pt.group_id = ?`,
      [student_id, teamInfo[0].group_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "This student is already registered in a PFE team for this group." });
    }

    // 3. Add member
    await pool.query(
      "INSERT INTO student_pfe_teams (pfe_team_id, student_id) VALUES (?, ?)",
      [team_id, student_id]
    );
    res.status(201).json({ message: "Member added to the PFE team successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to add member to the team. Please try again.", error: err.message });
  }
};

// DELETE /api/pfe/teams/:teamId/members/:studentId
const removeMember = async (req, res) => {
  const { teamId, studentId } = req.params;

  try {
    // 1. Verify requester is a member or teacher
    if (req.user.role !== 'teacher') {
      const [membership] = await pool.query(
        "SELECT id FROM student_pfe_teams WHERE pfe_team_id = ? AND student_id = ?",
        [teamId, req.user.id]
      );
      if (membership.length === 0) {
        return res.status(403).json({ message: "Permissions denied. Only team members or faculty can remove members." });
      }
    }

    // 2. Remove from junction table
    const [result] = await pool.query(
      "DELETE FROM student_pfe_teams WHERE pfe_team_id = ? AND student_id = ?",
      [teamId, studentId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Member record not found." });

    res.json({ message: "Member has been successfully removed from the team." });
  } catch (err) {
    res.status(500).json({ message: "Unable to remove team member at this time.", error: err.message });
  }
};

module.exports = {
  createTeam, joinTeam, getTeamsByGroup, deleteTeam, updateTeam, addMember,
  submitPFE, getSubmissionsByGroup, getSubmissionByTeam, removeMember
};
