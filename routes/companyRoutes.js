const express = require("express");
const router = express.Router();
const { getCompanies, createCompany, updateCompany, deleteCompany } = require("../controllers/companyController");
const { authenticate } = require("../middlewares/authMiddleware");

router.use(authenticate);

router.get("/", getCompanies);
router.post("/", createCompany);
router.put("/:id", updateCompany);
router.delete("/:id", deleteCompany);

// Handle cases without trailing slash if needed
router.get("", getCompanies);
router.post("", createCompany);

module.exports = router;
