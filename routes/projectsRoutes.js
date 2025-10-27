const express = require("express");
const router = express.Router();
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "erp",
  password: process.env.DB_PASS || "password",
  port: process.env.DB_PORT || 5432,
});

// GET all projects
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM projects ORDER BY created_at DESC NULLS LAST, id DESC`
    );
    res.json({ success: true, projects: result.rows });
  } catch (err) {
    console.error("Error fetching projects:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create project
router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "Project name is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO projects (name, created_at)
       VALUES ($1, NOW())
       RETURNING *`,
      [name.trim()]
    );
    res.json({ success: true, project: result.rows[0] });
  } catch (err) {
    console.error("Error inserting project:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});


// GET tasks for a project
router.get("/tasks/:projectId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
         FROM project_tasks
        WHERE project_id = $1
        ORDER BY list_status, position ASC, created_at ASC, id ASC`,
      [req.params.projectId]
    );
    res.json({ success: true, tasks: result.rows });
  } catch (err) {
    console.error("Error fetching tasks:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create a task (append to end of that column)
router.post("/task", async (req, res) => {
  const { project_id, title, description, list_status, assigned_to } = req.body;
  if (!project_id || !title) {
    return res.status(400).json({ success: false, message: "Project ID and Title are required" });
  }

  try {
    // compute next position at the end of the column
    const { rows: maxRows } = await pool.query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS nextpos
         FROM project_tasks
        WHERE project_id = $1 AND list_status = $2`,
      [project_id, list_status || "To Do"]
    );

    const nextPos = maxRows[0].nextpos;

    const result = await pool.query(
      `INSERT INTO project_tasks (project_id, title, description, list_status, assigned_to, position, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        project_id,
        title,
        description || "",
        list_status || "To Do",
        assigned_to || "Unassigned",
        nextPos,
      ]
    );

    res.json({ success: true, task: result.rows[0] });
  } catch (err) {
    console.error("Error inserting task:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update task 
// This also normalizes positions in the new column to 0..n
router.put("/task/:taskId", async (req, res) => {
  const { list_status, title, description, position } = req.body;
  const taskId = req.params.taskId;

  try {
    // Load current task
    const { rows: existingRows } = await pool.query(
      `SELECT id, project_id, list_status, position
         FROM project_tasks
        WHERE id = $1`,
      [taskId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const task = existingRows[0];
    const newStatus = list_status || task.list_status;

    // If moving to a new column and no position provided → put at end of new column
    let newPosition = position;
    if (newPosition === undefined && newStatus !== task.list_status) {
      const { rows: maxRows } = await pool.query(
        `SELECT COALESCE(MAX(position), -1) + 1 AS nextpos
           FROM project_tasks
          WHERE project_id = $1 AND list_status = $2`,
        [task.project_id, newStatus]
      );
      newPosition = maxRows[0].nextpos;
    }
    if (newPosition === undefined) newPosition = task.position;

    // Update the task
    const { rows: updatedRows } = await pool.query(
      `UPDATE project_tasks
          SET list_status = $1,
              title = COALESCE($2, title),
              description = COALESCE($3, description),
              position = $4,
              updated_at = NOW()
        WHERE id = $5
        RETURNING *`,
      [newStatus, title, description, newPosition, taskId]
    );

    // Normalize positions (0..n) for the destination column
    await pool.query(
      `
      WITH ordered AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY project_id, list_status ORDER BY position ASC, created_at ASC, id ASC) - 1 AS newpos
        FROM project_tasks
        WHERE project_id = $1 AND list_status = $2
      )
      UPDATE project_tasks p
         SET position = o.newpos
        FROM ordered o
       WHERE p.id = o.id
      `,
      [task.project_id, newStatus]
    );

    res.json({ success: true, task: updatedRows[0] });
  } catch (err) {
    console.error("Error updating task:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
