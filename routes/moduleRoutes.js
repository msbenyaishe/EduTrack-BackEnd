const express = require("express");
const router = express.Router();
const {
  createModule, getModules, getModuleById, updateModule, deleteModule,
  assignModuleToGroup, removeModuleFromGroup,
} = require("../controllers/moduleController");
const { authenticate } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

router.use(authenticate, requireRole("teacher"));

router.post("/", createModule);
router.get("/", getModules);
router.get("/:id", getModuleById);
router.put("/:id", updateModule);
router.delete("/:id", deleteModule);

router.post("/assign", assignModuleToGroup);
router.delete("/assign/:module_id/:group_id", removeModuleFromGroup);

module.exports = router;
