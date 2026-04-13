const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getGroups,
  getModules,
  getSubmissions,
  deleteSubmission,
} = require("../controllers/studentController");
const { authenticate } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

router.use(authenticate, requireRole("student"));

router.get("/me", getProfile);
router.put("/me", updateProfile);
router.get("/groups", getGroups);
router.get("/modules", getModules);
router.get("/submissions", getSubmissions);
router.delete("/submissions", deleteSubmission);

module.exports = router;
