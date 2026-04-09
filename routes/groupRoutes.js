const express = require("express");
const router = express.Router();
const {
  createGroup, getGroups, getGroupById, updateGroup, deleteGroup,
  generateCode, getGroupStudents, joinGroup, getStudentGroups,
} = require("../controllers/groupController");
const { authenticate } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

// Student-only routes
router.post("/join", authenticate, requireRole("student"), joinGroup);
router.get("/student/my-groups", authenticate, requireRole("student"), getStudentGroups);

// Teacher-only routes
router.post("/", authenticate, requireRole("teacher"), createGroup);
router.get("/", authenticate, requireRole("teacher"), getGroups);
router.get("/:id", authenticate, requireRole("teacher"), getGroupById);
router.put("/:id", authenticate, requireRole("teacher"), updateGroup);
router.delete("/:id", authenticate, requireRole("teacher"), deleteGroup);
router.post("/:id/generate-code", authenticate, requireRole("teacher"), generateCode);
router.get("/:id/students", authenticate, requireRole("teacher"), getGroupStudents);
router.delete("/:id/students/:student_id", authenticate, requireRole("teacher"), removeStudent);

module.exports = router;
