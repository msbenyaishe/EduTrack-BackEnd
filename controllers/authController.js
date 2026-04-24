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

    res.status(201).json({ token, role: "student", id: userId, name, email, personal_image });
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

    res.json({ token, role, id: user.id, name: user.name, email: user.email, personal_image: user.personal_image });
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
      `SELECT id, name, email, created_at, personal_image${role === 'student' ? ', portfolio_link, additional_profile_data' : ''} FROM ${table} WHERE id = ?`,
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    res.json({ ...rows[0], role });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  const { name, email, portfolio_link, additional_profile_data } = req.body;
  const personal_image = req.file ? req.file.path : null;
  const { id, role } = req.user;
  const table = role === "teacher" ? "teachers" : "students";

  try {
    // If email is provided and different from current, check if it's already taken
    if (email) {
      const [teachersWithEmail] = await pool.query("SELECT id FROM teachers WHERE email = ?", [email]);
      const [studentsWithEmail] = await pool.query("SELECT id FROM students WHERE email = ?", [email]);

      if (teachersWithEmail.length > 0) {
        if (!(role === 'teacher' && teachersWithEmail[0].id === id)) {
           return res.status(409).json({ message: "Email already registered by another user" });
        }
      }
      
      if (studentsWithEmail.length > 0) {
        if (!(role === 'student' && studentsWithEmail[0].id === id)) {
           return res.status(409).json({ message: "Email already registered by another user" });
        }
      }
    }

    let query = `UPDATE ${table} SET name = ?`;
    let params = [name];

    if (email) {
      query += ", email = ?";
      params.push(email);
    }

    if (role === "student") {
      query += ", portfolio_link = ?, additional_profile_data = ?";
      params.push(portfolio_link || null, additional_profile_data || null);
    }

    if (personal_image) {
      query += ", personal_image = ?";
      params.push(personal_image);
    }

    query += " WHERE id = ?";
    params.push(id);

    await pool.query(query, params);

    res.json({ 
      message: "Profile updated successfully", 
      name,
      email,
      personal_image: personal_image || undefined,
      portfolio_link: role === 'student' ? portfolio_link : undefined,
      additional_profile_data: role === 'student' ? additional_profile_data : undefined
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error during profile update", error: err.message });
  }
};

// PUT /api/auth/password
const updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const { id, role } = req.user;
  const table = role === "teacher" ? "teachers" : "students";

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "Old and new passwords are required" });
  }

  try {
    const [rows] = await pool.query(`SELECT password FROM ${table} WHERE id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(oldPassword, rows[0].password);
    if (!match) return res.status(401).json({ message: "Incorrect old password" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE ${table} SET password = ? WHERE id = ?`, [hashed, id]);

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("UPDATE PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error during password update", error: err.message });
  }
};

module.exports = { registerTeacher, registerStudent, login, me, updateProfile, updatePassword };
