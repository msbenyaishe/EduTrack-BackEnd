const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { ensureSubmissionReactionColumns } = require("../utils/ensureSubmissionReactionColumns");

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

ensureSubmissionReactionColumns().catch((err) => {
  console.error("Failed to ensure submission reaction columns:", err.message);
});

// ── Routes ─────────────────────────────────────────────────────────────────────
const mainRouter = express.Router();

mainRouter.use("/auth",         require("../routes/authRoutes"));
mainRouter.use("/teachers",     require("../routes/teacherRoutes"));
mainRouter.use("/students",     require("../routes/studentRoutes"));
mainRouter.use("/modules",      require("../routes/moduleRoutes"));
mainRouter.use("/groups",       require("../routes/groupRoutes"));
mainRouter.use("/workshops",    require("../routes/workshopRoutes"));
mainRouter.use("/agile",        require("../routes/agileRoutes"));
mainRouter.use("/sprints",      require("../routes/sprintRoutes"));
mainRouter.use("/pfe",          require("../routes/pfeRoutes"));
mainRouter.use("/internships",  require("../routes/internshipRoutes"));
mainRouter.use("/companies",    require("../routes/companyRoutes"));

// Mount the router on both /api and / for maximum compatibility
app.use("/api", mainRouter);
app.use("/", mainRouter);

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "EduTrack API is running 🚀", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "EduTrack API is running 🚀" });
});

// ── 404 fallback ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Route not found: ${req.url}` });
});

// ── Error handler ──────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR HANDLER:", err.stack);
  res.status(500).json({ 
    message: "Internal server error", 
    error: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method
  });
});

// ── Local dev server (not used by Vercel) ─────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ EduTrack API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
