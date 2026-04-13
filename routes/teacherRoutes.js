const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getGroups,
  getModules,
  getSubmissionsDashboard,
  updateSubmissionReaction,
  deleteSubmission,
} = require("../controllers/teacherController");
const { authenticate } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

router.use(authenticate, requireRole("teacher"));

router.get("/me", getProfile);
router.put("/me", updateProfile);
router.get("/groups", getGroups);
router.get("/modules", getModules);
router.get("/submissions", getSubmissionsDashboard);
router.delete("/submissions", deleteSubmission);
router.patch("/submissions/reaction", updateSubmissionReaction);

module.exports = router;
