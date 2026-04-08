const express = require("express");
const router = express.Router();
const { registerTeacher, registerStudent, login, me } = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");

router.post("/register-teacher", registerTeacher);
router.post("/register-student", registerStudent);
router.post("/login", login);
router.get("/me", authenticate, me);

module.exports = router;
