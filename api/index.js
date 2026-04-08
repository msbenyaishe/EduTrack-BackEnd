const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/auth",         require("../routes/authRoutes"));
app.use("/api/teachers",     require("../routes/teacherRoutes"));
app.use("/api/students",     require("../routes/studentRoutes"));
app.use("/api/modules",      require("../routes/moduleRoutes"));
app.use("/api/groups",       require("../routes/groupRoutes"));
app.use("/api/workshops",    require("../routes/workshopRoutes"));
app.use("/api/agile",        require("../routes/agileRoutes"));
app.use("/api/sprints",      require("../routes/sprintRoutes"));
app.use("/api/pfe",          require("../routes/pfeRoutes"));
app.use("/api/internships",  require("../routes/internshipRoutes"));

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "EduTrack API is running 🚀" });
});

// ── 404 fallback ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ── Error handler ──────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error", error: err.message });
});

// ── Local dev server (not used by Vercel) ─────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ EduTrack API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
