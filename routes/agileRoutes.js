const express = require("express");
const router = express.Router();
const {
  getClassmates, createTeam, getTeamsByGroup, getTeamById, deleteTeam, joinTeam,
} = require("../controllers/agileController");
const { authenticate } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

// All agile routes require auth
router.use(authenticate);

router.get("/students/:groupId", getClassmates);                          // both roles
router.post("/teams", requireRole("student"), createTeam);
router.post("/teams/join", requireRole("student"), joinTeam);
router.get("/teams/:groupId", getTeamsByGroup);                           // both roles
router.get("/teams/team/:teamId", getTeamById);                           // both roles
router.delete("/teams/:teamId", requireRole("teacher"), deleteTeam);

module.exports = router;
