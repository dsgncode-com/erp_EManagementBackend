// routes/profileRoutes.js
const express = require("express");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");

require("dotenv").config();

const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "DsgnCode",
  password: process.env.DB_PASS || "postgres",
  port: process.env.DB_PORT || 5432,
});

//upload dirctory image

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync (uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file,cb)=>{
    cb(null, uploadDir);
  },

  filename: (req, file, cb)=>{
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ success: false, message: "Invalid token" });
    req.user = decoded;
    next();
  });
}

router.put("/update-image", verifyToken, async (req, res) => {
  const { profile_image } = req.body;
  const userId = req.user.id;

  if (!profile_image) {
    return res.status(400).json({ success: false, message: "No image provided" });
  }

  try {
    await pool.query("UPDATE users SET profile_image = $1 WHERE id = $2", [profile_image, userId]);
    res.json({ success: true, message: "Profile image updated successfully!" });
  } catch (err) {
    console.error("Error updating profile image:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/upload-image", verifyToken, upload.single("profile_image"), async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file)
      return res.status(400).json({ success: false, message: "No file uploaded" });

    const imagePath = `uploads/${req.file.filename}`;

    await pool.query("UPDATE users SET profile_image = $1 WHERE id = $2", [imagePath, userId]);

    res.json({
      success: true,
      message: "Profile image uploaded successfully",
      profile_image: `${req.protocol}://${req.get("host")}/${imagePath}`,
    });
  } catch (err) {
    console.error("Error uploading profile image:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.get("/me", verifyToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      "SELECT id, username, email, fullname, role, profile_image FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "User not found" });

    const user = result.rows[0];

    if (user.profile_image) {


      if (!user.profile_image.startsWith("http")) {
    user.profile_image = `${req.protocol}://${req.get("host")}/${user.profile_image}`;
  }
}


    res.json({ success: true, user });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.put("/update", verifyToken, async (req, res) => {
  const { fullname, email, bio } = req.body;
  const userId = req.user.id;

  try {
    await pool.query(
      "UPDATE users SET fullname = $1, email = $2, bio = $3 WHERE id = $4",
      [fullname, email, bio, userId]
    );

    res.json({
      success: true,
      message: "Profile details updated successfully!",
    });
  } catch (err) {
    console.error("Error updating profile details:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.put("/update-password", verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    // Get the current hashed password from DB
    const result = await pool.query("SELECT password FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "User not found" });

    const user = result.rows[0];

    // Compare entered current password with DB hash
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: "Current password is incorrect" });

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in DB
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, userId]);

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    console.error("Error updating password:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


module.exports = router;
