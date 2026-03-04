import express from "express";
import "dotenv/config";
import * as db from "./db.mjs";

const app = express();
const PORT = Number(process.env.PORT || 8080);

app.use(express.static("."));
app.use(express.urlencoded({ extended: false }));

// Connect once on startup, but keep the web server alive even if DB is unavailable.
db.connect().catch((err) => {
  console.error("Database unavailable:", err.message);
});

// Helpful: list which reports exist
app.get("/api/reports", (req, res) => {
  res.json({ ok: true, reports: db.listReports() });
});

// Optional: single endpoint pattern: /api?report=deliverable2
app.get("/api", async (req, res) => {
  const report = req.query.report;

  if (!report) {
    return res.status(400).json({
      ok: false,
      error: "Missing query parameter: report. Try /api?report=deliverable2"
    });
  }

  try {
    const rows = await db.queryReport(report);
    res.json({ ok: true, rows });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Clean shutdown
process.on("SIGINT", () => {
  db.disconnect?.();
  process.exit(0);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
