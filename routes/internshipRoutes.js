const express = require("express");
const router = express.Router();
const {
  submitInternship, getMyInternship, updateInternship, deleteInternship, getInternshipsByGroup,
} = require("../controllers/internshipController");
const { authenticate } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

router.use(authenticate);

// Teacher
router.get("/group/:groupId", requireRole("teacher"), getInternshipsByGroup);

// Student
router.post("/", requireRole("student"), submitInternship);
router.get("/me", requireRole("student"), getMyInternship);
router.put("/:id", requireRole("student"), updateInternship);
router.delete("/:id", requireRole("student"), deleteInternship);

module.exports = router;
