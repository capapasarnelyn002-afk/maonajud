-- =====================================================================
-- Brealls Resorts — MySQL Schema
-- Compatible with MySQL 8.0+ (Aiven for MySQL)
-- =====================================================================

-- Create and use database
CREATE DATABASE IF NOT EXISTS brealls_resorts
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE brealls_resorts;

-- ---------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,           -- store bcrypt/argon2 hash
    role          ENUM('admin','staff','customer') NOT NULL DEFAULT 'customer',
    phone         VARCHAR(30)   NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ROOMS  (lodges & cottages)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100)   NOT NULL,
    type         ENUM('Lodge','Cottage') NOT NULL,
    capacity     INT            NOT NULL CHECK (capacity > 0),
    price        DECIMAL(10,2)  NOT NULL CHECK (price >= 0),
    description  TEXT           NULL,
    image_url    TEXT           NULL,             -- can be HTTP URL or data URL
    available    TINYINT(1)     NOT NULL DEFAULT 1,
    created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- BOOKINGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    room_id          INT NOT NULL,
    customer_id      INT NOT NULL,
    customer_name    VARCHAR(150) NOT NULL,        -- snapshot
    customer_email   VARCHAR(150) NOT NULL,        -- snapshot
    customer_phone   VARCHAR(30)  NULL,
    check_in         DATE NOT NULL,
    check_out        DATE NOT NULL,
    guests           INT  NOT NULL CHECK (guests > 0),
    rooms_qty        INT  NOT NULL DEFAULT 1,
    total            DECIMAL(10,2) NOT NULL,
    downpayment      DECIMAL(10,2) NOT NULL,
    balance          DECIMAL(10,2) NOT NULL,
    payment_method   ENUM('GCash','Maya','Bank Transfer','Cash on Arrival') NOT NULL,
    payment_status   ENUM('Awaiting Verification','Paid','Unpaid','Refunded') NOT NULL,
    payment_reference VARCHAR(100) NULL,
    payment_proof    LONGTEXT NULL,                -- data URL or file path
    status           ENUM('Pending','Confirmed','Cancelled') NOT NULL DEFAULT 'Pending',
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_bookings_room
        FOREIGN KEY (room_id)     REFERENCES rooms(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_user
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_dates CHECK (check_out > check_in)
) ENGINE=InnoDB;

CREATE INDEX idx_bookings_room_dates ON bookings(room_id, check_in, check_out);
CREATE INDEX idx_bookings_customer   ON bookings(customer_id);
CREATE INDEX idx_bookings_status     ON bookings(status);

-- ---------------------------------------------------------------------
-- SITE SETTINGS (single row — id always = 1)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
    id                  INT PRIMARY KEY DEFAULT 1,
    hero_image          TEXT NULL,
    hero_title          VARCHAR(255) NOT NULL DEFAULT 'Resort booking made easy',
    hero_subtitle       TEXT NULL,
    contact_phone       VARCHAR(30)  NULL,
    contact_email       VARCHAR(150) NULL,
    contact_location    VARCHAR(255) NOT NULL DEFAULT 'San Pedro Island, Hinunangan, Southern Leyte',
    downpayment_percent INT NOT NULL DEFAULT 50,
    gcash_number        VARCHAR(50)  NULL,
    gcash_name          VARCHAR(150) NULL,
    bank_name           VARCHAR(100) NULL,
    bank_account_number VARCHAR(50)  NULL,
    bank_account_name   VARCHAR(150) NULL,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_single_row CHECK (id = 1)
) ENGINE=InnoDB;

-- =====================================================================
-- SEED DATA
-- =====================================================================

-- Default site settings
INSERT INTO site_settings (
    id, hero_image, hero_title, hero_subtitle,
    contact_phone, contact_email, contact_location,
    downpayment_percent,
    gcash_number, gcash_name,
    bank_name, bank_account_number, bank_account_name
) VALUES (
    1,
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80',
    'Resort booking made easy',
    'Find your perfect lodge or cottage stay. Browse available accommodations, check prices, and reserve your stay at Brealls Resorts.',
    '09XXXXXXXXX',
    'breallsresorts@gmail.com',
    'San Pedro Island, Hinunangan, Southern Leyte',
    50,
    '0917-XXX-XXXX', 'Brealls Resorts',
    'BDO', '0000-1111-2222', 'Brealls Resorts Inc.'
) ON DUPLICATE KEY UPDATE id = id;

-- Default users (replace password_hash with real hashes in production)
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Administrator', 'admin@brealls.com', 'admin123', 'admin'),
    ('Staff Member',  'staff@brealls.com', 'staff123', 'staff'),
    ('Bea Infanso',   'bea002@gmail.com',  'bea1234',  'customer')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Default rooms
INSERT INTO rooms (name, type, capacity, price, description, image_url, available) VALUES
    ('Room 1', 'Cottage', 5, 2500.00, 'Comfortable and relaxing cottage with garden view.',
     'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?auto=format&fit=crop&w=900&q=80', 1),
    ('Room 2', 'Lodge',   4, 1800.00, 'Cozy lodge room perfect for small families.',
     'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80', 1),
    ('Room 3', 'Cottage', 6, 3200.00, 'Spacious family cottage with private balcony.',
     'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80', 1),
    ('Room 4', 'Lodge',   6, 4500.00, 'Luxury lodge room with premium amenities.',
     'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80', 1);

-- =====================================================================
-- HANDY VIEWS
-- =====================================================================

-- Active (non-cancelled) bookings for room availability checks
CREATE OR REPLACE VIEW v_active_bookings AS
SELECT
    b.id, b.room_id, b.customer_id, b.check_in, b.check_out,
    b.status, b.payment_status, r.name AS room_name
FROM bookings b
JOIN rooms r ON r.id = b.room_id
WHERE b.status <> 'Cancelled';

-- Booked records (joined with customer + room) — for admin/staff "Booked Records" tab
CREATE OR REPLACE VIEW v_booked_records AS
SELECT
    b.id              AS booking_id,
    b.created_at      AS booked_on,
    u.name            AS customer_name,
    u.email           AS customer_email,
    u.phone           AS customer_phone,
    r.name            AS room_name,
    r.type            AS room_type,
    b.check_in,
    b.check_out,
    DATEDIFF(b.check_out, b.check_in) AS nights,
    b.guests,
    b.total,
    b.downpayment,
    b.balance,
    b.payment_method,
    b.payment_status,
    b.payment_reference,
    b.status
FROM bookings b
JOIN users u ON u.id = b.customer_id
JOIN rooms r ON r.id = b.room_id
ORDER BY b.created_at DESC;

-- =====================================================================
-- USEFUL QUERIES
-- =====================================================================

-- 1) Check if a room is available for given dates (returns rows = conflicts)
-- SELECT * FROM v_active_bookings
-- WHERE room_id = 1
--   AND check_in  < '2026-05-22'    -- desired check-out
--   AND check_out > '2026-05-20';   -- desired check-in

-- 2) Customer booking history
-- SELECT * FROM v_booked_records WHERE customer_email = 'bea002@gmail.com';

-- 3) Revenue from paid bookings
-- SELECT SUM(total) AS revenue FROM bookings
-- WHERE payment_status = 'Paid' AND status = 'Confirmed';

-- 4) Upcoming check-ins this week
-- SELECT * FROM v_booked_records
-- WHERE status = 'Confirmed'
--   AND check_in BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY);
