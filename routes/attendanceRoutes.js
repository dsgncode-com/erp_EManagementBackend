// routes/attendanceRoutes.js
const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "erp",
  password: process.env.DB_PASS || "password",
  port: process.env.DB_PORT || 5432,
});

const VALID_COLUMNS = ["morning_in", "morning_out", "afternoon_in", "afternoon_out"];

// ---------- TIME-IN ----------
router.post("/timein", async (req, res) => {
  const { user_id, period } = req.body;

  if (!["morning_in", "afternoon_in"].includes(period)) {
    return res.status(400).json({ success: false, message: "Invalid time-in period" });
  }

  try {
    const existing = await pool.query(
      `SELECT * FROM attendance_record
       WHERE user_id = $1 AND date = CURRENT_DATE`,
      [user_id]
    );

    if (existing.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO attendance_record (user_id, date, ${period})
         VALUES ($1, CURRENT_DATE, NOW())
         RETURNING *`,
        [user_id]
      );
      return res.json({
        success: true,
        message: `${period} recorded (new record)`,
        record: insert.rows[0],
      });
    }

    if (existing.rows[0][period]) {
      return res
        .status(400)
        .json({ success: false, message: `Already recorded ${period} today` });
    }

    const update = await pool.query(
      `UPDATE attendance_record
         SET ${period} = NOW()
       WHERE user_id = $1 AND date = CURRENT_DATE
       RETURNING *`,
      [user_id]
    );

    res.json({ success: true, message: `${period} recorded`, record: update.rows[0] });
  } catch (err) {
    console.error("Time-in error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------- TIME-OUT ----------
router.put("/timeout/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const { period } = req.body;

  if (!["morning_out", "afternoon_out"].includes(period)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid time-out period" });
  }

  try {
    const result = await pool.query(
      `UPDATE attendance_record
         SET ${period} = NOW()
       WHERE user_id = $1 AND date = CURRENT_DATE
       RETURNING *`,
      [user_id]
    );

    if (result.rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "No record found for today" });

    res.json({ success: true, message: `${period} recorded`, record: result.rows[0] });
  } catch (err) {
    console.error("Time-out error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------- ✅ GET ATTENDANCE RECORDS (this fixes your 404) ----------
router.get("/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM attendance_record
       WHERE user_id = $1
       ORDER BY date DESC`,
      [user_id]
    );

    res.json({ success: true, records: result.rows });
  } catch (err) {
    console.error("Fetch attendance error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ GET attendance by month/year
router.get("/month/:month/:year", async (req, res) => {
  const { month, year } = req.params;

  try {
    const result = await pool.query(
      `SELECT user_id, date, morning_in, morning_out, afternoon_in, afternoon_out
       FROM attendance_record
       WHERE EXTRACT(MONTH FROM date) = $1 
       AND EXTRACT(YEAR FROM date) = $2
       ORDER BY date ASC`,
      [month, year]
    );

    res.json({ success: true, records: result.rows });
  } catch (err) {
    console.error("Error fetching attendance:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
