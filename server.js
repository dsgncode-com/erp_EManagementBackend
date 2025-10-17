// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const userRoutes = require("./auth_routes/authRoutes");

const app = express();

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// ====== DATABASE CONNECTION ======
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "DsgnCode",
  password: process.env.DB_PASS || "postgres",
  port: process.env.DB_PORT || 5432,
});

pool.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch(err => console.error("Connection error:", err.message));

// ====== ROUTES ======
app.use("/api", userRoutes);

app.get("/", (req, res) => {
  res.send("Backend running securely with JWT authentication!");
});

// ====== SERVER START ======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
