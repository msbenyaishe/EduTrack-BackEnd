const express = require("express");
const router = express.Router();
const { registerTeacher, registerStudent, login, me } = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

router.post("/register-teacher", registerTeacher);
router.post("/register-student", upload.single('personal_image'), registerStudent);
router.post("/login", login);
router.get("/me", authenticate, me);

module.exports = router;
