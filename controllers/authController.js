const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// POST /api/auth/register-teacher
const registerTeacher = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const [existing] = await pool.query("SELECT id FROM teachers WHERE email = ?", [email]);
    if (existing.length > 0)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO teachers (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashed]
    );

    const token = jwt.sign(
      { id: result.insertId, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, role: "teacher", id: result.insertId, name, email });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/auth/register-student
const registerStudent = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const [existing] = await pool.query("SELECT id FROM students WHERE email = ?", [email]);
    if (existing.length > 0)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO students (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashed]
    );

    const token = jwt.sign(
      { id: result.insertId, role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, role: "student", id: result.insertId, name, email });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  try {
    // Try teacher first
    let [rows] = await pool.query("SELECT * FROM teachers WHERE email = ?", [email]);
    let role = "teacher";

    if (rows.length === 0) {
      [rows] = await pool.query("SELECT * FROM students WHERE email = ?", [email]);
      role = "student";
    }

    if (rows.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, role, id: user.id, name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  try {
    const { id, role } = req.user;
    const table = role === "teacher" ? "teachers" : "students";
    const [rows] = await pool.query(
      `SELECT id, name, email, created_at FROM ${table} WHERE id = ?`,
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    res.json({ ...rows[0], role });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { registerTeacher, registerStudent, login, me };
