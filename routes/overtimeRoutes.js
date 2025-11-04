// routes/overtimeRoutes.js
const express = require("express");
const router = express.Router();

const {
  getOvertimes,
  getOvertimeByUser,
  addOvertime,
  updateOvertimeStatus,
} = require("../controllers/overtimeController");

// Routes
router.get("/", getOvertimes);          
router.get("/:id", getOvertimeByUser); 
router.post("/", addOvertime);          
router.put("/:id", updateOvertimeStatus);

module.exports = router;
