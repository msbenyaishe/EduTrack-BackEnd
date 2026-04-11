const express = require("express");
const router = express.Router();
const {
  getClassmates, createTeam, getTeamsByGroup, getTeamById, deleteTeam, joinTeam, updateTeam, addMember, removeMember,
} = require("../controllers/agileController");
const { authenticate } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

// All agile routes require auth
router.use(authenticate);

router.get("/students/:groupId", getClassmates);                          // both roles
router.post("/teams", requireRole("student"), createTeam);
router.post("/teams/join", requireRole("student"), joinTeam);
router.put("/teams/:teamId", updateTeam);
router.get("/teams/:groupId", getTeamsByGroup);                           // both roles
router.get("/teams/team/:teamId", getTeamById);                           // both roles
router.post("/teams/member", addMember);                                  // member/teacher check in controller
router.delete("/teams/member/:teamId/:studentId", removeMember);          // member/teacher check in controller
router.delete("/teams/:teamId", deleteTeam);                              // both roles (internal check)

module.exports = router;
