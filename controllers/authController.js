const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// POST /api/auth/register-teacher
const registerTeacher = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    // Check if email exists in EITHER table
    const [existingTeacher] = await pool.query("SELECT id FROM teachers WHERE email = ?", [email]);
    const [existingStudent] = await pool.query("SELECT id FROM students WHERE email = ?", [email]);
    
    if (existingTeacher.length > 0 || existingStudent.length > 0)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO teachers (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashed]
    );

    const userId = Number(result.insertId);
    const token = jwt.sign(
      { id: userId, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, role: "teacher", id: userId, name, email });
  } catch (err) {
    console.error("REGISTER TEACHER ERROR:", err);
    res.status(500).json({ message: "Server error during teacher registration", error: err.message });
  }
};

// POST /api/auth/register-student
const registerStudent = async (req, res) => {
  const { name, email, password, portfolio_link, additional_profile_data } = req.body;
  const personal_image = req.file ? req.file.path : null;
  
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    // Check if email exists in EITHER table
    const [existingTeacher] = await pool.query("SELECT id FROM teachers WHERE email = ?", [email]);
    const [existingStudent] = await pool.query("SELECT id FROM students WHERE email = ?", [email]);

    if (existingTeacher.length > 0 || existingStudent.length > 0)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO students (name, email, password, portfolio_link, personal_image, additional_profile_data) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashed, portfolio_link || null, personal_image, additional_profile_data || null]
    );

    const userId = Number(result.insertId);
    const token = jwt.sign(
      { id: userId, role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, role: "student", id: userId, name, email });
  } catch (err) {
    console.error("DEBUG REGISTER STUDENT ERROR:", err);
    res.status(500).json({ 
      message: "Server error during student registration", 
      error: err.message, 
      stack: err.stack,
      details: "Check if all database columns exist and Cloudinary is configured correctly."
    });
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
      `SELECT id, name, email, created_at${role === 'student' ? ', portfolio_link, personal_image, additional_profile_data' : ''} FROM ${table} WHERE id = ?`,
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
