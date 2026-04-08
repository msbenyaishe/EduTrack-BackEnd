const express = require("express");
const router = express.Router();
const {
  createSprint, getSprintsByGroup, getSprintById, updateSprint, deleteSprint,
  submitSprint, getSubmissionsByTeam, getSubmissionsBySprint,
} = require("../controllers/sprintController");
const { authenticate } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

router.use(authenticate);

// Sprint submissions
router.get("/sprint-submissions/team/:teamId", getSubmissionsByTeam);        // both roles
router.get("/sprint-submissions/sprint/:sprintId", getSubmissionsBySprint);  // both roles

// Student
router.post("/:id/submit", requireRole("student"), submitSprint);

// Teacher
router.post("/", requireRole("teacher"), createSprint);
router.put("/:id", requireRole("teacher"), updateSprint);
router.delete("/:id", requireRole("teacher"), deleteSprint);

// Both
router.get("/group/:groupId", getSprintsByGroup);
router.get("/:id", getSprintById);

module.exports = router;
