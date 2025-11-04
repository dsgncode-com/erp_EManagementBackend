// routes/payrollRoutes.js
const express = require("express");
const { getAllPayrolls, getPayrollById} = require("../controllers/payrollController");

const router = express.Router();

// get req
router.get("/", getAllPayrolls);
router.get("/:id", getPayrollById);

//post req

// router.post("/", createPayroll);
// router.post("/:id", deletePayroll);
module.exports = router;
