const pool = require("../config/db");

// POST /api/sprints  (teacher)
const createSprint = async (req, res) => {
  const { module_id, group_id, title, description, pdf_report, repo, web_page } = req.body;
  if (!module_id || !group_id)
    return res.status(400).json({ message: "module_id and group_id are required" });

  try {
    const [result] = await pool.query(
      `INSERT INTO sprints (module_id, group_id, title, description, pdf_report, repo, web_page)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [module_id, group_id, title || null, description || null,
       pdf_report || null, repo || null, web_page || null]
    );
    res.status(201).json({ id: result.insertId, title });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/sprints/group/:groupId
const getSprintsByGroup = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, m.title AS module_title
       FROM sprints s
       JOIN modules m ON s.module_id = m.id
       WHERE s.group_id = ?
       ORDER BY s.created_at DESC`,
      [req.params.groupId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/sprints/:id
const getSprintById = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM sprints WHERE id = ?", [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Sprint not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/sprints/:id  (teacher)
const updateSprint = async (req, res) => {
  const { title, description, pdf_report, repo, web_page } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE sprints sp
       JOIN modules m ON sp.module_id = m.id
       SET sp.title = ?, sp.description = ?, sp.pdf_report = ?, sp.repo = ?, sp.web_page = ?
       WHERE sp.id = ? AND m.teacher_id = ?`,
      [title, description, pdf_report, repo, web_page, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Sprint not found" });
    res.json({ message: "Sprint updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/sprints/:id  (teacher)
const deleteSprint = async (req, res) => {
  try {
    const [result] = await pool.query(
      `DELETE sp FROM sprints sp
       JOIN modules m ON sp.module_id = m.id
       WHERE sp.id = ? AND m.teacher_id = ?`,
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Sprint not found" });
    res.json({ message: "Sprint deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/sprints/:id/submit  (student via agile team)
const submitSprint = async (req, res) => {
  const { agile_team_id, repo, web_page, pdf_report } = req.body;
  if (!agile_team_id)
    return res.status(400).json({ message: "agile_team_id is required" });

  try {
    const [existing] = await pool.query(
      "SELECT id FROM sprint_submissions WHERE sprint_id = ? AND agile_team_id = ?",
      [req.params.id, agile_team_id]
    );

    if (existing.length > 0) {
      // Allow modifying existing submission
      await pool.query(
        `UPDATE sprint_submissions SET pdf_report = ?, repo = ?, web_page = ?, submitted_at = NOW()
         WHERE id = ?`,
        [pdf_report || null, repo || null, web_page || null, existing[0].id]
      );
      return res.json({ message: "Sprint submission updated successfully!" });
    }

    // New submission
    const [result] = await pool.query(
      `INSERT INTO sprint_submissions (sprint_id, agile_team_id, pdf_report, repo, web_page)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, agile_team_id, pdf_report || null, repo || null, web_page || null]
    );
    res.status(201).json({ id: result.insertId, message: "Sprint submitted successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error occurred while saving your sprint submission.", error: err.message });
  }
};

// GET /api/sprint-submissions/team/:teamId
const getSubmissionsByTeam = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ss.*, sp.title AS sprint_title
       FROM sprint_submissions ss
       JOIN sprints sp ON ss.sprint_id = sp.id
       WHERE ss.agile_team_id = ?
       ORDER BY ss.submitted_at DESC`,
      [req.params.teamId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/sprint-submissions/sprint/:sprintId
const getSubmissionsBySprint = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ss.*, at.name AS team_name
       FROM sprint_submissions ss
       JOIN agile_teams at ON ss.agile_team_id = at.id
       WHERE ss.sprint_id = ?
       ORDER BY ss.submitted_at DESC`,
      [req.params.sprintId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  createSprint, getSprintsByGroup, getSprintById, updateSprint, deleteSprint,
  submitSprint, getSubmissionsByTeam, getSubmissionsBySprint,
};
