// authRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const verifyToken = require("../middleware/authMiddleware");
require("dotenv").config();

const router = express.Router();

// ====== DATABASE CONNECTION ======
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "DsgnCode",
  password: process.env.DB_PASS || "postgres",
  port: process.env.DB_PORT || 5432,
});

/* ==========================
   REGISTER USER
========================== */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, role, profile_image, fullname } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Check for duplicates
    const existing = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    const result = await pool.query(
      `INSERT INTO users (username, email, password, role, profile_image, fullname)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, role, profile_image, fullname, date_created`,
      [username, email, hashedPassword, role || "Employee", profile_image || null, fullname || null]
    );

    console.log("User registered:", result.rows[0]);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ==========================
   LOGIN USER
========================== */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Missing username or password" });
    }

    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    // ga generate sa JWT kada naay mag login
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log(" User logged in --");
    console.log("User ID:", user.id, ", Username:", user.username, ", Role:", user.role);

    // Remove password before sending back
    delete user.password;

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ==========================
   PROTECTED ROUTE
========================== */
router.get("/protected", verifyToken, (req, res) => {
  console.log("🔒 Verified user accessed /protected:", req.user);
  res.json({
    success: true,
    message: "Access granted to protected route",
    user: req.user,
  });
});

module.exports = router;
