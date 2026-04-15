const express = require("express");
const router = express.Router();
const {
  createTeam, joinTeam, getTeamsByGroup, deleteTeam,
  submitPFE, getSubmissionsByGroup, getSubmissionByTeam, removeMember
} = require("../controllers/pfeController");
const { authenticate } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

router.use(authenticate);

// Submission views
router.get("/submissions/:groupId", requireRole("teacher"), getSubmissionsByGroup);
router.get("/submissions/team/:teamId", getSubmissionByTeam); // both roles

// Student
router.post("/teams", requireRole("student"), createTeam);
router.post("/teams/join", requireRole("student"), joinTeam);
router.post("/submit", requireRole("student"), submitPFE);
router.delete("/teams/:teamId/members/:studentId", requireRole("student"), removeMember);

// Both
router.get("/teams/:groupId", getTeamsByGroup);

// Teacher
router.delete("/teams/:teamId", requireRole("teacher"), deleteTeam);

module.exports = router;
