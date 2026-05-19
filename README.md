# 🌴 Brealls Resorts — Booking System

A complete resort booking web app for **Brealls Resorts** at *San Pedro Island, Hinunangan, Southern Leyte*.
Customers can browse lodges and cottages, reserve dates online, and pay an advance downpayment.
Admins and staff manage rooms, bookings, payments, users, and site content.

🔗 **Live demo:** _add your Render URL here after deploying_

---

## ✨ Features

### Public site
- Dynamic hero with admin-editable background image and copy
- Search bar with date/guest/room filters (past dates blocked)
- Browse rooms by type, capacity, price range, availability
- Sort by lowest/highest price or capacity
- Customer registration & login

### Booking flow
- 2-step reservation: details → advance payment
- Multiple payment methods: **GCash**, **Maya**, **Bank Transfer**, **Cash on Arrival**
- Admin-configurable downpayment % (default 50%)
- Upload proof of payment + payment reference
- **Conflict detection** — a room can't be reserved for overlapping dates;
  the UI shows already-booked ranges and the next available date

### Customer dashboard
- "My Bookings" with **Upcoming / History / All** tabs
- Personal stats: total bookings, upcoming, completed stays, total spent
- Cancelled bookings highlighted; completed stays show a "Past" badge

### Admin & Staff panel
- 📊 **Dashboard** — rooms, pending/confirmed counts, revenue
- 🛏 **Manage Rooms** — add/edit/delete, change room images dynamically (upload or URL), toggle availability
- 📅 **Bookings** — confirm, cancel, mark paid; view proof-of-payment screenshots
- 🗂 **Booked Records** — full archive with filters (status, payment, date range, search) and **CSV export**
- 🎨 **Site Settings** — change hero background, contact info, payment account details, downpayment %
- 👥 **Users** — manage admin/staff/customer accounts

---

## 🧱 Tech stack

- **React 19** + **TypeScript**
- **Vite 7** — build tool
- **Tailwind CSS v4** — styling
- **vite-plugin-singlefile** — bundles to a single `dist/index.html`
- **localStorage** — current data persistence (swap for MySQL later — see `database/`)

---

## 🚀 Quick start (local dev)

```bash
npm install
npm run dev
```

App opens at <http://localhost:5173>.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@brealls.com` | `admin123` |
| Staff | `staff@brealls.com` | `staff123` |
| Customer | `bea002@gmail.com` | `bea1234` |

You can register additional customer accounts from the Login page.

### Build for production

```bash
npm run build      # creates dist/index.html (single file, ~85 KB gzipped)
npm run preview    # serve the build locally to test
```

---

## 📁 Project structure

```
.
├── src/
│   ├── components/
│   │   ├── Admin.tsx        # Admin/staff panel + Booked Records
│   │   ├── Auth.tsx         # Login & registration
│   │   ├── Contact.tsx      # Contact page
│   │   ├── Hero.tsx         # Hero + search bar (date validation)
│   │   ├── Icons.tsx        # SVG icons
│   │   ├── MyBookings.tsx   # Customer history (Upcoming / History tabs)
│   │   ├── Navbar.tsx
│   │   └── Rooms.tsx        # Listings, filters, reservation modal
│   ├── App.tsx              # Page routing + footer
│   ├── store.ts             # State, persistence, conflict utils
│   ├── types.ts
│   └── index.css            # Tailwind + custom inputs
├── database/
│   ├── schema.sql           # MySQL schema for Aiven
│   └── README.md            # Aiven + Workbench setup guide
├── DEPLOYMENT.md            # GitHub + Render deployment guide
├── render.yaml              # Render Blueprint (one-click deploy)
└── index.html
```

---

## ☁️ Deploy

- **Frontend** → see [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full GitHub + Render guide
- **Database** → see [`database/README.md`](./database/README.md) for Aiven MySQL + Workbench setup

One-click deploy via Render Blueprint:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## 📜 License

For educational/demo use. Feel free to adapt for the Brealls Resorts project.
