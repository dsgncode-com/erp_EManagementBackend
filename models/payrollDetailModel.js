const pool = require("../db");

// Get all details by payroll_id
const getByPayrollId = async (payrollId) => {
  const result = await pool.query(
    `SELECT label, amount, type FROM payroll_details WHERE payroll_id = $1`,
    [payrollId]
  );
  return result.rows;
};

// Insert new details
const createMany = async (payrollId, details) => {
  for (const d of details) {
    await pool.query(
      `INSERT INTO payroll_details (payroll_id, label, amount, type) VALUES ($1, $2, $3, $4)`,
      [payrollId, d.label, d.amount, d.type]
    );
  }
};

// Delete details by payroll_id
const removeByPayrollId = async (payrollId) => {
  await pool.query("DELETE FROM payroll_details WHERE payroll_id = $1", [payrollId]);
};

module.exports = { getByPayrollId, createMany, removeByPayrollId };
