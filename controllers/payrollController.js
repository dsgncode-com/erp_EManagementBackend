// controllers/payrollController.js
const { pool } = require("../db");

// get req all (sum)
const getAllPayrolls = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pr.*, e.name, e.position
      FROM payroll_records pr
      JOIN employees e ON pr.user_id = e.id
      ORDER BY pr.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching payroll records" });
  }
};

// get req 1 payroll
const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await pool.query(
      `
      SELECT pr.*, e.name, e.position, e.bank_name, e.bank_account_name, e.bank_account_number,
             e.birthday, e.phone, e.email, e.citizenship, e.city, e.address
      FROM payroll_records pr
      JOIN employees e ON pr.user_id = e.id
      WHERE pr.user_id = $1
      ORDER BY pr.created_at DESC
      LIMIT 1
      `,
      [id]
    );

    if (record.rows.length === 0)
      return res.status(404).json({ message: "No payroll found" });

    const payrollId = record.rows[0].id;

    const details = await pool.query(
      `SELECT label, amount, type FROM payroll_details WHERE payroll_id = $1`,
      [payrollId]
    );

    const income = {};
    const deduction = {};

    details.rows.forEach((d) => {
      if (d.type === "income") income[d.label] = Number(d.amount);
      else deduction[d.label] = Number(d.amount);
    });

    res.json({
      id: record.rows[0].user_id,
      name: record.rows[0].name,
      position: record.rows[0].position,
      income,
      deduction,
      tax: Number(record.rows[0].tax),
      netSalary: Number(record.rows[0].net_salary),
      bank: {
        name: record.rows[0].bank_name,
        accountName: record.rows[0].bank_account_name,
        accountNumber: record.rows[0].bank_account_number,
      },
      info: {
        birthday: record.rows[0].birthday,
        phone: record.rows[0].phone,
        email: record.rows[0].email,
        citizenship: record.rows[0].citizenship,
        city: record.rows[0].city,
        address: record.rows[0].address,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching payroll details" });
  }
};

// post req
// const createPayroll = async (req, res) => {
//   const client = await pool.connect();

//   try {
//     const { user_id, tax, period_start, period_end, details } = req.body;

//     if (!user_id || !details || !Array.isArray(details)) {
//       return res.status(400).json({ message: "Invalid request body" });
//     }

//     const totalIncome = details
//       .filter((d) => d.type === "income")
//       .reduce((a, b) => a + Number(b.amount), 0);

//     const totalDeduction = details
//       .filter((d) => d.type === "deduction")
//       .reduce((a, b) => a + Number(b.amount), 0);

//     const computedTax = Number(tax) || 0;
//     const netSalary = totalIncome - totalDeduction - computedTax;

//     await client.query("BEGIN");

//     const record = await client.query(
//       `
//       INSERT INTO payroll_records 
//         (user_id, total_income, total_deduction, tax, net_salary, pay_period_start, pay_period_end)
//       VALUES ($1, $2, $3, $4, $5, $6, $7)
//       RETURNING id
//       `,
//       [user_id, totalIncome, totalDeduction, computedTax, netSalary, period_start, period_end]
//     );

//     const payrollId = record.rows[0].id;

//     for (const d of details) {
//       await client.query(
//         `
//         INSERT INTO payroll_details (payroll_id, label, amount, type)
//         VALUES ($1, $2, $3, $4)
//         `,
//         [payrollId, d.label, d.amount, d.type]
//       );
//     }

//     await client.query("COMMIT");

//     res.status(201).json({
//       message: "Payroll record created successfully",
//       payroll_id: payrollId,
//       total_income: totalIncome,
//       total_deduction: totalDeduction,
//       net_salary: netSalary,
//     });
//   } catch (err) {
//     await client.query("ROLLBACK");
//     console.error(err);
//     res.status(500).json({ message: "Error creating payroll record" });
//   } finally {
//     client.release();
//   }
// };

// delete req 
// const deletePayroll = async (req, res) => {
//   const { id } = req.params;
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");
//     await client.query("DELETE FROM payroll_details WHERE payroll_id = $1", [id]);
//     const result = await client.query("DELETE FROM payroll_records WHERE id = $1 RETURNING *", [id]);
//     if (result.rowCount === 0) {
//       await client.query("ROLLBACK");
//       return res.status(404).json({ message: "Payroll record not found" });
//     }
//     await client.query("COMMIT");
//     res.json({ message: "Payroll record deleted successfully", deleted: result.rows[0] });
//   } catch (err) {
//     await client.query("ROLLBACK");
//     console.error(err);
//     res.status(500).json({ message: "Error deleting payroll record" });
//   } finally {
//     client.release();
//   }
// };

module.exports = { getAllPayrolls, getPayrollById};
