const express = require("express");
const router = express.Router();
const {
  createWorkshop, getWorkshopsByGroup, getWorkshopById, updateWorkshop,
  deleteWorkshop, getStudentWorkshops, submitWorkshop, getMySubmissions,
  getSubmissionsByWorkshop, getSubmissionsByGroup,
} = require("../controllers/workshopController");
const { authenticate } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

// --- Workshop Submission sub-routes (mounted here for simplicity) ---
// Student
router.get("/workshop-submissions/my", authenticate, requireRole("student"), getMySubmissions);
// Teacher
router.get("/workshop-submissions/workshop/:workshopId", authenticate, requireRole("teacher"), getSubmissionsByWorkshop);
router.get("/workshop-submissions/group/:groupId", authenticate, requireRole("teacher"), getSubmissionsByGroup);

// --- Student workshop routes ---
router.get("/student", authenticate, requireRole("student"), getStudentWorkshops);
router.post("/:id/submit", authenticate, requireRole("student"), submitWorkshop);

// --- Teacher workshop routes ---
router.post("/", authenticate, requireRole("teacher"), createWorkshop);
router.get("/group/:groupId", authenticate, requireRole("teacher"), getWorkshopsByGroup);
router.get("/:id", authenticate, getWorkshopById); // both roles can view details
router.put("/:id", authenticate, requireRole("teacher"), updateWorkshop);
router.delete("/:id", authenticate, requireRole("teacher"), deleteWorkshop);

module.exports = router;
