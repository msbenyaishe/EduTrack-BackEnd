const express = require("express");
const router = express.Router();
const { getCompanies, createCompany } = require("../controllers/companyController");
const { authenticate } = require("../middlewares/authMiddleware");

router.use(authenticate);

router.get("/", getCompanies);
router.post("/", createCompany);

// Handle cases without trailing slash if needed
router.get("", getCompanies);
router.post("", createCompany);

module.exports = router;
