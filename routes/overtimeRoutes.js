const express = require("express");
const router = express.Router();
const {Pool} =  require("pg");

const pool = new Pool({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "erp",
    password: process.env.DB_PASS || "password",
    port: process.env.DB_PORT || 5432,
});