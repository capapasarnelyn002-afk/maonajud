# Brealls Resorts — Database Setup Guide

Complete guide to host the database on **Aiven for MySQL** (free tier available)
and connect through **MySQL Workbench**.

---

## 📋 What's in this folder

| File | Purpose |
|---|---|
| `schema.sql` | Creates all tables, indexes, views, and seed data |
| `README.md` | This guide |

---

## 1. Create a free MySQL service on Aiven

1. Go to **https://aiven.io** and **Sign up** (free trial, no credit card for the free tier).
2. After login, click **+ Create service**.
3. Choose:
   - **Service**: `MySQL`
   - **Plan**: `Free-1-5GB` (or any free tier shown)
   - **Cloud provider** & **region**: pick the one closest to you
     (e.g. *Google Cloud — asia-southeast1 (Singapore)* for the Philippines)
   - **Service name**: `brealls-mysql` (or anything)
4. Click **Create service**.
5. Wait ~2 minutes until the service status changes from *REBUILDING* → **RUNNING**.

---

## 2. Get your connection credentials

Open the new service in the Aiven dashboard. On the **Overview** tab you'll see
**Connection information**. Note these:

| Field | Where to find it |
|---|---|
| **Host** | `mysql-xxxxxxx-xxxx.aivencloud.com` |
| **Port** | `12345` (Aiven uses a non-standard port) |
| **User** | `avnadmin` |
| **Password** | Click 👁️ icon to reveal |
| **Database** | `defaultdb` |
| **SSL Mode** | `REQUIRED` |

Also click **Show CA certificate → Download** and save the file as `ca.pem`.
You'll need it for the SSL connection.

---

## 3. Connect with MySQL Workbench

### Install
Download MySQL Workbench from <https://dev.mysql.com/downloads/workbench/>.

### Set up a connection

1. Open Workbench → click the **➕** beside *MySQL Connections*.
2. Fill in:

   | Field | Value |
   |---|---|
   | **Connection Name** | `Brealls Aiven` |
   | **Connection Method** | `Standard (TCP/IP)` |
   | **Hostname** | *(your Aiven host)* |
   | **Port** | *(your Aiven port, e.g. 12345)* |
   | **Username** | `avnadmin` |
   | **Default Schema** | `defaultdb` |

3. Click **Store in Vault…** → enter the password from Aiven.

4. Switch to the **SSL** tab:

   | Field | Value |
   |---|---|
   | **Use SSL** | `Require` |
   | **SSL CA File** | path to the `ca.pem` you downloaded |
   | **SSL CERT File** | *(leave blank)* |
   | **SSL Key File** | *(leave blank)* |

5. Click **Test Connection**. You should see  
   *"Successfully made the MySQL connection"* ✅

6. Click **OK** to save.

### Common errors

| Error | Fix |
|---|---|
| `SSL connection error: ASN: bad other signature confirmation` | Re-download `ca.pem` and re-select it |
| `Can't connect to MySQL server` | Wrong host/port — copy them exactly from Aiven |
| `Access denied for user` | Wrong password — re-copy from Aiven (no spaces) |
| `Unknown database` | Use `defaultdb` (Aiven's default) and run `schema.sql` |

---

## 4. Run the schema

Inside Workbench, open your new connection, then:

1. **File → Open SQL Script…** → choose `database/schema.sql`.
2. Press the **⚡ lightning bolt** (Execute) to run the whole script.
3. Refresh the *SCHEMAS* panel on the left — you'll see the `brealls_resorts`
   database with tables: `users`, `rooms`, `bookings`, `site_settings`.
4. Test it:
   ```sql
   USE brealls_resorts;
   SELECT * FROM rooms;
   SELECT * FROM v_booked_records;
   ```

> **Tip — Aiven default database**
> Aiven only creates one database called `defaultdb`. If you want to keep
> everything inside it instead of creating `brealls_resorts`, just remove
> the `CREATE DATABASE` and `USE` lines at the top of `schema.sql`.

---

## 5. Connect from your application

### Node.js (Express / Next.js API route)

```bash
npm install mysql2
```

```js
// db.js
import mysql from "mysql2/promise";
import fs from "fs";

export const pool = mysql.createPool({
  host: process.env.DB_HOST,            // mysql-xxx.aivencloud.com
  port: Number(process.env.DB_PORT),    // 12345
  user: process.env.DB_USER,            // avnadmin
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,        // brealls_resorts (or defaultdb)
  ssl: {
    ca: fs.readFileSync("./ca.pem"),    // downloaded from Aiven
  },
  waitForConnections: true,
  connectionLimit: 10,
});
```

`.env`
```
DB_HOST=mysql-xxxxxxx-xxxx.aivencloud.com
DB_PORT=12345
DB_USER=avnadmin
DB_PASSWORD=your_aiven_password
DB_NAME=brealls_resorts
```

Example usage:
```js
import { pool } from "./db.js";

const [rooms] = await pool.query("SELECT * FROM rooms WHERE available = 1");
console.log(rooms);
```

### PHP (XAMPP / Laravel)

```php
// config/database.php
$mysqli = new mysqli(
    "mysql-xxxxxxx-xxxx.aivencloud.com",  // host
    "avnadmin",                            // user
    "your_password",                       // pass
    "brealls_resorts",                     // db
    12345                                  // port
);
$mysqli->ssl_set(null, null, __DIR__ . "/ca.pem", null, null);
$mysqli->real_connect(
    "mysql-xxxxxxx-xxxx.aivencloud.com",
    "avnadmin",
    "your_password",
    "brealls_resorts",
    12345,
    null,
    MYSQLI_CLIENT_SSL
);
```

### Python (Flask / FastAPI)

```bash
pip install mysql-connector-python
```

```python
import mysql.connector

conn = mysql.connector.connect(
    host="mysql-xxxxxxx-xxxx.aivencloud.com",
    port=12345,
    user="avnadmin",
    password="your_password",
    database="brealls_resorts",
    ssl_ca="ca.pem",
    ssl_verify_cert=True,
)
```

---

## 6. Wire it to the React app

The current React app uses **localStorage**. To switch to Aiven MySQL:

1. Build a small backend (Express, Next.js API routes, PHP, or Python).
2. Expose REST endpoints, for example:

   ```
   GET    /api/rooms
   POST   /api/rooms                 (admin)
   PUT    /api/rooms/:id             (admin)
   DELETE /api/rooms/:id             (admin)

   POST   /api/auth/login
   POST   /api/auth/register

   GET    /api/bookings              (admin/staff: all, customer: own)
   POST   /api/bookings              (customer)
   PATCH  /api/bookings/:id/status   (admin/staff)

   GET    /api/settings
   PUT    /api/settings              (admin)
   ```

3. In `src/store.ts`, replace the `localStorage` reads/writes with `fetch()` calls to those endpoints. The component code does not have to change because every consumer goes through `useStore()`.

---

## 7. Useful queries

### Check room availability for given dates
```sql
SELECT COUNT(*) AS conflicts
FROM v_active_bookings
WHERE room_id   = ?
  AND check_in  < ?    -- desired check_out
  AND check_out > ?;   -- desired check_in
-- 0 means free; > 0 means already reserved
```

### Insert a new booking (server-side after conflict check passes)
```sql
INSERT INTO bookings
    (room_id, customer_id, customer_name, customer_email, customer_phone,
     check_in, check_out, guests, total, downpayment, balance,
     payment_method, payment_status, payment_reference, status)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending');
```

### Customer booking history (upcoming vs past)
```sql
-- Upcoming
SELECT * FROM v_booked_records
WHERE customer_email = ? AND check_out >= CURDATE() AND status <> 'Cancelled'
ORDER BY check_in ASC;

-- History
SELECT * FROM v_booked_records
WHERE customer_email = ? AND (check_out < CURDATE() OR status = 'Cancelled')
ORDER BY check_in DESC;
```

### Revenue report
```sql
SELECT
    DATE_FORMAT(created_at, '%Y-%m') AS month,
    COUNT(*)                         AS bookings,
    SUM(total)                       AS revenue,
    SUM(downpayment)                 AS downpayments_received
FROM bookings
WHERE status = 'Confirmed'
GROUP BY month
ORDER BY month DESC;
```

---

## 8. Backup & restore (Workbench)

- **Backup:** `Server → Data Export` → choose `brealls_resorts` → *Export to Self-Contained File* → save `.sql`.
- **Restore:** `Server → Data Import` → *Import from Self-Contained File* → pick that `.sql`.

---

That's it 🎉 — once connected, you can manage the resort's data directly in
Workbench while the React app talks to the same Aiven MySQL through your API.
