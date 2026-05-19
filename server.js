import express from "express";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "10mb" })); // allow data-URL image uploads

// Database pool configuration
// For Aiven, ensure you use the full Service URI or these specific variables
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: Number(process.env.MYSQL_PORT) || 3306,
  ssl: {
    rejectUnauthorized: false, // Required for secure Aiven communication
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Quick connectivity check
pool
  .getConnection()
  .then((conn) => {
    console.log("✅  MySQL connected:", process.env.MYSQL_HOST);
    conn.release();
  })
  .catch((err) => {
    console.warn("⚠️   MySQL connection failed:", err.message);
  });

// Health check (Render auto-pings)
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// =====================================================================
// USERS API  (table: users)
// =====================================================================
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role, phone, created_at FROM users ORDER BY role, name"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)",
      [name, email, password, role || "customer", phone || null]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  const { name, email, role, phone } = req.body;
  try {
    await pool.query(
      "UPDATE users SET name = ?, email = ?, role = ?, phone = ? WHERE id = ?",
      [name, email, role, phone, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = ? AND role <> 'admin'", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUTH ---
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role, phone FROM users WHERE email = ? AND password_hash = ?",
      [email, password]
    );
    if (rows.length > 0) {
      res.json({ success: true, user: rows[0] });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/register", async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, 'customer', ?)",
      [name, email, password, phone || null]
    );
    const [rows] = await pool.query(
      "SELECT id, name, email, role, phone FROM users WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// ROOMS API  (table: rooms)
// =====================================================================
app.get("/api/rooms", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM rooms ORDER BY id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/rooms/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM rooms WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Room not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/rooms", async (req, res) => {
  const { name, type, capacity, price, description, image_url, available } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO rooms (name, type, capacity, price, description, image_url, available) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, type, capacity, price, description, image_url, available ?? 1]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/rooms/:id", async (req, res) => {
  const { name, type, capacity, price, description, image_url, available } = req.body;
  try {
    await pool.query(
      "UPDATE rooms SET name = ?, type = ?, capacity = ?, price = ?, description = ?, image_url = ?, available = ? WHERE id = ?",
      [name, type, capacity, price, description, image_url, available, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick image change (for the dynamic per-room image upload)
app.patch("/api/rooms/:id/image", async (req, res) => {
  try {
    await pool.query("UPDATE rooms SET image_url = ? WHERE id = ?", [
      req.body.image_url,
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle available flag
app.patch("/api/rooms/:id/toggle", async (req, res) => {
  try {
    await pool.query("UPDATE rooms SET available = NOT available WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/rooms/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM rooms WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AVAILABILITY (uses view: v_active_bookings) ---
app.get("/api/rooms/:id/availability", async (req, res) => {
  const { check_in, check_out } = req.query;
  if (!check_in || !check_out) {
    return res.status(400).json({ error: "check_in and check_out required" });
  }
  try {
    const [conflicts] = await pool.query(
      `SELECT id, check_in, check_out, status
         FROM v_active_bookings
        WHERE room_id = ? AND check_in < ? AND check_out > ?`,
      [req.params.id, check_out, check_in]
    );
    res.json({ available: conflicts.length === 0, conflicts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/rooms/:id/booked-ranges", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT check_in, check_out FROM v_active_bookings
        WHERE room_id = ? AND check_out >= CURDATE()
        ORDER BY check_in`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// BOOKINGS API  (table: bookings, view: v_booked_records)
// =====================================================================

// All bookings (admin/staff Booked Records) with filters
app.get("/api/bookings", async (req, res) => {
  const { status, payment_status, customer_id, from, to, q } = req.query;
  try {
    let sql = "SELECT * FROM v_booked_records WHERE 1=1";
    const params = [];
    if (status)         { sql += " AND status = ?";          params.push(status); }
    if (payment_status) { sql += " AND payment_status = ?";  params.push(payment_status); }
    if (customer_id)    { sql += " AND customer_id = ?";     params.push(customer_id); }
    if (from)           { sql += " AND check_in >= ?";       params.push(from); }
    if (to)             { sql += " AND check_out <= ?";      params.push(to); }
    if (q) {
      sql += " AND (customer_name LIKE ? OR customer_email LIKE ? OR payment_reference LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    sql += " ORDER BY booked_on DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One booking
app.get("/api/bookings/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM v_booked_records WHERE booking_id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0) return res.status(404).json({ error: "Booking not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer "My Bookings" — filter=upcoming|history|all
app.get("/api/bookings/customer/:customerId", async (req, res) => {
  const { filter } = req.query;
  try {
    let sql = "SELECT * FROM v_booked_records WHERE customer_id = ?";
    if (filter === "upcoming") {
      sql += " AND check_out >= CURDATE() AND status <> 'Cancelled' ORDER BY check_in ASC";
    } else if (filter === "history") {
      sql += " AND (check_out < CURDATE() OR status = 'Cancelled') ORDER BY check_in DESC";
    } else {
      sql += " ORDER BY booked_on DESC";
    }
    const [rows] = await pool.query(sql, [req.params.customerId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a booking — checks conflict, computes price, inserts
app.post("/api/bookings", async (req, res) => {
  const {
    room_id, customer_id, customer_name, customer_email, customer_phone,
    check_in, check_out, guests,
    payment_method, payment_reference, payment_proof,
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Conflict check
    const [conflicts] = await conn.query(
      `SELECT id FROM v_active_bookings
         WHERE room_id = ? AND check_in < ? AND check_out > ?`,
      [room_id, check_out, check_in]
    );
    if (conflicts.length > 0) {
      await conn.rollback();
      conn.release();
      return res
        .status(409)
        .json({ error: "Room is already reserved for the selected dates." });
    }

    // 2) Price calc
    const [[room]] = await conn.query("SELECT price FROM rooms WHERE id = ?", [room_id]);
    if (!room) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: "Room not found" });
    }
    const [[settings]] = await conn.query(
      "SELECT downpayment_percent FROM site_settings WHERE id = 1"
    );
    const nights = Math.max(
      1,
      Math.ceil((new Date(check_out) - new Date(check_in)) / 86400000)
    );
    const total = Number(room.price) * nights;
    const downpayment = Math.round((total * (settings?.downpayment_percent ?? 50)) / 100);
    const balance = total - downpayment;
    const payment_status =
      payment_method === "Cash on Arrival" ? "Unpaid" : "Awaiting Verification";

    // 3) Insert
    const [result] = await conn.query(
      `INSERT INTO bookings
       (room_id, customer_id, customer_name, customer_email, customer_phone,
        check_in, check_out, guests,
        total, downpayment, balance,
        payment_method, payment_status, payment_reference, payment_proof, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        room_id, customer_id, customer_name, customer_email, customer_phone || null,
        check_in, check_out, guests,
        total, downpayment, balance,
        payment_method, payment_status,
        payment_reference || null, payment_proof || null,
      ]
    );

    await conn.commit();
    conn.release();

    const [rows] = await pool.query("SELECT * FROM v_booked_records WHERE booking_id = ?", [
      result.insertId,
    ]);
    res.status(201).json({ success: true, booking: rows[0] });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: err.message });
  }
});

// Update booking status (Pending/Confirmed/Cancelled)
app.patch("/api/bookings/:id/status", async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query("UPDATE bookings SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update payment status (Awaiting Verification/Paid/Unpaid/Refunded)
app.patch("/api/bookings/:id/payment", async (req, res) => {
  const { payment_status } = req.body;
  try {
    await pool.query("UPDATE bookings SET payment_status = ? WHERE id = ?", [
      payment_status,
      req.params.id,
    ]);
    // Auto-confirm when marked paid
    if (payment_status === "Paid") {
      await pool.query(
        "UPDATE bookings SET status = 'Confirmed' WHERE id = ? AND status <> 'Cancelled'",
        [req.params.id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/bookings/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM bookings WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// SITE SETTINGS API  (table: site_settings — single row id=1)
// =====================================================================
app.get("/api/settings", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM site_settings WHERE id = 1");
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/settings", async (req, res) => {
  const s = req.body;
  try {
    await pool.query(
      `UPDATE site_settings SET
         hero_image          = ?,
         hero_title          = ?,
         hero_subtitle       = ?,
         contact_phone       = ?,
         contact_email       = ?,
         contact_location    = ?,
         downpayment_percent = ?,
         gcash_number        = ?,
         gcash_name          = ?,
         bank_name           = ?,
         bank_account_number = ?,
         bank_account_name   = ?
       WHERE id = 1`,
      [
        s.hero_image,
        s.hero_title,
        s.hero_subtitle,
        s.contact_phone,
        s.contact_email,
        s.contact_location,
        s.downpayment_percent ?? 50,
        s.gcash_number,
        s.gcash_name,
        s.bank_name,
        s.bank_account_number,
        s.bank_account_name,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick hero background update
app.patch("/api/settings/hero-image", async (req, res) => {
  try {
    await pool.query("UPDATE site_settings SET hero_image = ? WHERE id = 1", [
      req.body.hero_image,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// DASHBOARD STATS  (aggregate over all tables)
// =====================================================================
app.get("/api/stats", async (req, res) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM rooms)                                 AS total_rooms,
        (SELECT COUNT(*) FROM bookings WHERE status = 'Pending')     AS pending_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'Confirmed')   AS confirmed_bookings,
        (SELECT COUNT(*) FROM users WHERE role = 'customer')         AS total_customers,
        (SELECT COALESCE(SUM(total),0) FROM bookings
           WHERE status = 'Confirmed' AND payment_status = 'Paid')   AS revenue
    `);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static assets from the React build
app.use(express.static(path.join(__dirname, "dist")));

// React fallback — any non-API route returns index.html
app.get(/^\/(?!api|healthz).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅  Brealls Resorts server running on port ${PORT}`)
);
