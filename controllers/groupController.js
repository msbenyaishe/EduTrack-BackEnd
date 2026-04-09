const pool = require("../config/db");
const { generateInviteCode } = require("../utils/generateInviteCode");

// POST /api/groups
const createGroup = async (req, res) => {
  const { name, year } = req.body;
  if (!name || !year)
    return res.status(400).json({ message: "name and year are required" });

  try {
    const [result] = await pool.query(
      "INSERT INTO groups (teacher_id, name, year) VALUES (?, ?, ?)",
      [req.user.id, name, year]
    );
    res.status(201).json({ id: result.insertId, name, year });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/groups
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

// GET /api/groups/:id
const getGroupById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM groups WHERE id = ? AND teacher_id = ?",
      [req.params.id, req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Group not found" });

    // Also return assigned modules
    const [modules] = await pool.query(
      `SELECT m.* FROM modules m
       JOIN module_groups mg ON mg.module_id = m.id
       WHERE mg.group_id = ?`,
      [req.params.id]
    );
    res.json({ ...rows[0], modules });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/groups/:id
const updateGroup = async (req, res) => {
  const { name, year, invite_expires_at } = req.body;
  
  // Build dynamic update query to allow partial updates
  let query = "UPDATE groups SET ";
  const params = [];
  const updates = [];

  if (name !== undefined) {
    if (!name || name.trim() === "") return res.status(400).json({ message: "Name cannot be empty" });
    updates.push("name = ?");
    params.push(name);
  }
  if (year !== undefined) {
    if (!year || year.toString().trim() === "") return res.status(400).json({ message: "Year cannot be empty" });
    updates.push("year = ?");
    params.push(year);
  }
  if (invite_expires_at !== undefined) {
    updates.push("invite_expires_at = ?");
    params.push(invite_expires_at === "" || invite_expires_at === null ? null : invite_expires_at);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  query += updates.join(", ") + " WHERE id = ? AND teacher_id = ?";
  params.push(req.params.id, req.user.id);

  try {
    const [result] = await pool.query(query, params);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Group not found or unauthorized" });
    res.json({ message: "Group updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/groups/:id
const deleteGroup = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM groups WHERE id = ? AND teacher_id = ?",
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Group not found" });
    res.json({ message: "Group deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/groups/:id/generate-code
const generateCode = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM groups WHERE id = ? AND teacher_id = ?",
      [req.params.id, req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Group not found" });

    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await pool.query(
      "UPDATE groups SET invite_code = ?, invite_expires_at = ? WHERE id = ?",
      [code, expiresAt, req.params.id]
    );

    res.json({ invite_code: code, expires_at: expiresAt });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/groups/:id/students
const getGroupStudents = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.email, gs.joined_at
       FROM students s
       JOIN group_students gs ON gs.student_id = s.id
       WHERE gs.group_id = ?
       ORDER BY gs.joined_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/groups/join  (student)
const joinGroup = async (req, res) => {
  const { invite_code } = req.body;
  if (!invite_code)
    return res.status(400).json({ message: "invite_code is required" });

  try {
    const [rows] = await pool.query(
      "SELECT * FROM groups WHERE invite_code = ?",
      [invite_code]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Invalid invite code" });

    const group = rows[0];
    
    // Check if code is expired (only if an expiration date is set)
    if (group.invite_expires_at && new Date(group.invite_expires_at) < new Date()) {
      return res.status(403).json({ 
        message: "This invitation code has expired. Please ask your teacher for a new one.",
        expired: true 
      });
    }

    // Check already joined
    const [existing] = await pool.query(
      "SELECT id FROM group_students WHERE student_id = ? AND group_id = ?",
      [req.user.id, group.id]
    );
    if (existing.length > 0)
      return res.status(409).json({ message: "Already in this group" });

    await pool.query(
      "INSERT INTO group_students (student_id, group_id) VALUES (?, ?)",
      [req.user.id, group.id]
    );

    res.status(201).json({ message: "Joined group", group_id: group.id, group_name: group.name });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/groups/student/my-groups  (student)
const getStudentGroups = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, t.name AS teacher_name, t.email AS teacher_email
       FROM groups g
       JOIN group_students gs ON gs.group_id = g.id
       JOIN teachers t ON g.teacher_id = t.id
       WHERE gs.student_id = ?
       AND (g.invite_expires_at IS NULL OR g.invite_expires_at > NOW())
       ORDER BY gs.joined_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/groups/:id/students/:student_id (teacher removes student)
const removeStudent = async (req, res) => {
  const { id, student_id } = req.params;
  try {
    // verify teacher owns group
    const [grp] = await pool.query(
      "SELECT id FROM groups WHERE id = ? AND teacher_id = ?",
      [id, req.user.id]
    );
    if (grp.length === 0)
      return res.status(403).json({ message: "Unauthorized: not your group" });

    const [result] = await pool.query(
      "DELETE FROM group_students WHERE group_id = ? AND student_id = ?",
      [id, student_id]
    );
    res.json({ message: "Student removed from group" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  createGroup, getGroups, getGroupById, updateGroup, deleteGroup,
  generateCode, getGroupStudents, joinGroup, getStudentGroups,
  removeStudent,
};
