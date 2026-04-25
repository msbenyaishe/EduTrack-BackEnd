const express = require("express");
const router = express.Router();
const {
  createModule, getModules, getModuleById, updateModule, deleteModule,
  assignModuleToGroup, removeModuleFromGroup,
} = require("../controllers/moduleController");
const { authenticate } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");
const upload = require("../middlewares/upload");

router.use(authenticate, requireRole("teacher"));

router.post("/", upload.single("logo"), createModule);
router.get("/", getModules);
router.get("/:id", getModuleById);
router.put("/:id", upload.single("logo"), updateModule);
router.delete("/:id", deleteModule);

router.post("/assign", assignModuleToGroup);
router.delete("/assign/:module_id/:group_id", removeModuleFromGroup);

module.exports = router;
