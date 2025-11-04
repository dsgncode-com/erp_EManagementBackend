const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "erp",
  password: process.env.DB_PASS || "password",
  port: process.env.DB_PORT || 5432,
});

// ✅ GET ALL overtime requests (with employee fullname)
const getOvertimes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.fullname AS employee_name
       FROM overtime_requests o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching overtime data:", err.message);
    res.status(500).json({
      message: "Failed to fetch overtime data.",
      error: err.message,
    });
  }
};

// ✅ ADD overtime request
const addOvertime = async (req, res) => {
  const { user_id, request_date, overtime_date, duration, overtime, reason } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO overtime_requests 
       (user_id, request_date, overtime_date, duration, overtime, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [user_id, request_date, overtime_date, duration, overtime, reason]
    );
    res.status(201).json({
      message: "Overtime request added successfully!",
      request: result.rows[0],
    });
  } catch (err) {
    console.error("Error adding overtime:", err.message);
    res.status(500).json({
      message: "Failed to add overtime request.",
      error: err.message,
    });
  }
};

// ✅ UPDATE overtime status
const updateOvertimeStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE overtime_requests
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Overtime request not found." });
    }

    res.json({
      message: "Overtime status updated successfully!",
      request: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating overtime:", err.message);
    res.status(500).json({
      message: "Failed to update overtime status.",
      error: err.message,
    });
  }
};

// ✅ GET overtime by user_id (JOIN with users)
const getOvertimeByUser = async (req, res) => {
  const { id } = req.params; // user_id
  try {
    const result = await pool.query(
      `SELECT o.*, u.fullname AS employee_name
       FROM overtime_requests o
       JOIN users u ON o.user_id = u.id
       WHERE o.user_id = $1
       ORDER BY o.id DESC`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No overtime found for this user." });
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching overtime by user:", err.message);
    res.status(500).json({
      message: "Failed to fetch overtime for this user.",
      error: err.message,
    });
  }
};

module.exports = {
  getOvertimes,
  addOvertime,
  updateOvertimeStatus,
  getOvertimeByUser,
};
