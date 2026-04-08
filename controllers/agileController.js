const pool = require("../config/db");

// GET /api/agile/students/:groupId — classmates in group
const getClassmates = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.email
       FROM students s
       JOIN group_students gs ON gs.student_id = s.id
       WHERE gs.group_id = ?
       ORDER BY s.name ASC`,
      [req.params.groupId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/agile/teams — create agile team (student)
const createTeam = async (req, res) => {
  const { group_id, name } = req.body;
  if (!group_id) return res.status(400).json({ message: "group_id is required" });

  try {
    const [result] = await pool.query(
      "INSERT INTO agile_teams (group_id, name) VALUES (?, ?)",
      [group_id, name || null]
    );
    // Auto-join creator
    await pool.query(
      "INSERT INTO student_agile_teams (agile_team_id, student_id) VALUES (?, ?)",
      [result.insertId, req.user.id]
    );
    res.status(201).json({ id: result.insertId, group_id, name });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/agile/teams/:groupId — all teams of a group
const getTeamsByGroup = async (req, res) => {
  try {
    const [teams] = await pool.query(
      "SELECT * FROM agile_teams WHERE group_id = ?",
      [req.params.groupId]
    );

    // Get members for each team
    for (const team of teams) {
      const [members] = await pool.query(
        `SELECT s.id, s.name, s.email
         FROM students s
         JOIN student_agile_teams sat ON sat.student_id = s.id
         WHERE sat.agile_team_id = ?`,
        [team.id]
      );
      team.members = members;
    }

    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/agile/teams/team/:teamId
const getTeamById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM agile_teams WHERE id = ?",
      [req.params.teamId]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Team not found" });

    const [members] = await pool.query(
      `SELECT s.id, s.name, s.email
       FROM students s
       JOIN student_agile_teams sat ON sat.student_id = s.id
       WHERE sat.agile_team_id = ?`,
      [req.params.teamId]
    );

    res.json({ ...rows[0], members });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/agile/teams/:teamId
const deleteTeam = async (req, res) => {
  try {
    await pool.query("DELETE FROM agile_teams WHERE id = ?", [req.params.teamId]);
    res.json({ message: "Team deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/agile/teams/join — student joins a team
const joinTeam = async (req, res) => {
  const { team_id } = req.body;
  if (!team_id) return res.status(400).json({ message: "team_id is required" });

  try {
    const [existing] = await pool.query(
      "SELECT id FROM student_agile_teams WHERE agile_team_id = ? AND student_id = ?",
      [team_id, req.user.id]
    );
    if (existing.length > 0)
      return res.status(409).json({ message: "Already in this team" });

    await pool.query(
      "INSERT INTO student_agile_teams (agile_team_id, student_id) VALUES (?, ?)",
      [team_id, req.user.id]
    );
    res.status(201).json({ message: "Joined agile team" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { getClassmates, createTeam, getTeamsByGroup, getTeamById, deleteTeam, joinTeam };
