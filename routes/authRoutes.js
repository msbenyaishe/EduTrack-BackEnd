const express = require("express");
const router = express.Router();
const { registerTeacher, registerStudent, login, me } = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

router.post("/register-teacher", registerTeacher);
// Student signup may be sent as JSON (no file) or multipart/form-data (with file).
// Only invoke multer when the request is multipart to avoid "Multipart: Boundary not found" 500s.
const maybeUploadPersonalImage = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.toLowerCase().includes("multipart/form-data")) {
    return upload.single("personal_image")(req, res, next);
  }
  return next();
};

router.post("/register-student", maybeUploadPersonalImage, registerStudent);
router.post("/login", login);
router.get("/me", authenticate, me);

module.exports = router;
