const pool = require("../db");

// Get all payroll records
const getAll = async () => {
  const result = await pool.query(`
    SELECT pr.*, e.name, e.position
    FROM payroll_records pr
    JOIN employees e ON pr.user_id = e.id
    ORDER BY pr.created_at DESC
  `);
  return result.rows;
};

// Get one payroll record
const getByUserId = async (userId) => {
  const result = await pool.query(`
    SELECT pr.*, e.name, e.position, e.bank_name, e.bank_account_name, e.bank_account_number,
           e.birthday, e.phone, e.email, e.citizenship, e.city, e.address
    FROM payroll_records pr
    JOIN employees e ON pr.user_id = e.id
    WHERE pr.user_id = $1
    ORDER BY pr.created_at DESC
    LIMIT 1
  `, [userId]);
  return result.rows[0];
};

// Create new payroll record
const create = async (user_id, total_income, total_deduction, tax, net_salary, start, end) => {
  const result = await pool.query(`
    INSERT INTO payroll_records 
      (user_id, total_income, total_deduction, tax, net_salary, pay_period_start, pay_period_end)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING id
  `, [user_id, total_income, total_deduction, tax, net_salary, start, end]);
  return result.rows[0];
};

// Delete payroll record
const remove = async (id) => {
  await pool.query("DELETE FROM payroll_records WHERE id = $1", [id]);
};

module.exports = { getAll, getByUserId, create, remove };
