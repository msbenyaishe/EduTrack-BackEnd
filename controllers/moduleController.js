const pool = require("../config/db");

// POST /api/modules
const createModule = async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ message: "Title is required" });

  try {
    const [result] = await pool.query(
      "INSERT INTO modules (teacher_id, title, description) VALUES (?, ?, ?)",
      [req.user.id, title, description || null]
    );
    res.status(201).json({ id: result.insertId, title, description });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/modules
const getModules = async (req, res) => {
  const { group_id } = req.query;
  try {
    if (group_id) {
      const [rows] = await pool.query(
        `SELECT m.* FROM modules m
         JOIN module_groups mg ON mg.module_id = m.id
         WHERE mg.group_id = ? AND m.teacher_id = ?
         ORDER BY m.created_at DESC`,
        [group_id, req.user.id]
      );
      return res.json(rows);
    }

    const [rows] = await pool.query(
      "SELECT * FROM modules WHERE teacher_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/modules/:id
const getModuleById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM modules WHERE id = ? AND teacher_id = ?",
      [req.params.id, req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Module not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/modules/:id
const updateModule = async (req, res) => {
  const { title, description } = req.body;
  try {
    const [result] = await pool.query(
      "UPDATE modules SET title = ?, description = ? WHERE id = ? AND teacher_id = ?",
      [title, description, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Module not found" });
    res.json({ message: "Module updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/modules/:id
const deleteModule = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM modules WHERE id = ? AND teacher_id = ?",
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Module not found" });
    res.json({ message: "Module deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/modules/assign — assign module to a group
const assignModuleToGroup = async (req, res) => {
  const { module_id, group_id } = req.body;
  if (!module_id || !group_id)
    return res.status(400).json({ message: "module_id and group_id are required" });

  try {
    // verify teacher owns both
    const [mod] = await pool.query(
      "SELECT id FROM modules WHERE id = ? AND teacher_id = ?",
      [module_id, req.user.id]
    );
    const [grp] = await pool.query(
      "SELECT id FROM groups WHERE id = ? AND teacher_id = ?",
      [group_id, req.user.id]
    );
    if (mod.length === 0 || grp.length === 0)
      return res.status(403).json({ message: "Unauthorized: not your module or group" });

    const [result] = await pool.query(
      "INSERT INTO module_groups (module_id, group_id) VALUES (?, ?)",
      [module_id, group_id]
    );
    res.status(201).json({ message: "Module assigned to group", id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Already assigned" });
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/modules/assign — remove module from group
const removeModuleFromGroup = async (req, res) => {
  const { module_id, group_id } = req.params;
  try {
    await pool.query(
      "DELETE FROM module_groups WHERE module_id = ? AND group_id = ?",
      [module_id, group_id]
    );
    res.json({ message: "Assignment removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  createModule, getModules, getModuleById, updateModule, deleteModule,
  assignModuleToGroup, removeModuleFromGroup,
};
