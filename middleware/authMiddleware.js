// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ success: false, message: "No token provided" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach decoded user info
    next(); // proceed
  } catch (err) {
    res.status(403).json({ success: false, message: "Invalid or expired token" });
  }
}

module.exports = verifyToken;
