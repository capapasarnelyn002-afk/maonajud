import { useEffect, useState, useCallback } from "react";
import type { Booking, Room, SiteSettings, User } from "./types";

const KEYS = {
  users: "brealls_users",
  rooms: "brealls_rooms",
  bookings: "brealls_bookings",
  settings: "brealls_settings",
  session: "brealls_session",
};

// Default seed data
const DEFAULT_USERS: User[] = [
  { id: "u-admin", name: "Administrator", email: "admin@brealls.com", password: "admin123", role: "admin" },
  { id: "u-staff", name: "Staff Member", email: "staff@brealls.com", password: "staff123", role: "staff" },
  { id: "u-bea", name: "Bea Infanso", email: "bea002@gmail.com", password: "bea1234", role: "customer" },
];

const DEFAULT_ROOMS: Room[] = [
  {
    id: "r1",
    name: "Room 1",
    type: "Cottage",
    capacity: 5,
    price: 2500,
    description: "Comfortable and relaxing cottage with garden view.",
    image:
      "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?auto=format&fit=crop&w=900&q=80",
    available: true,
  },
  {
    id: "r2",
    name: "Room 2",
    type: "Lodge",
    capacity: 4,
    price: 1800,
    description: "Cozy lodge room perfect for small families.",
    image:
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80",
    available: true,
  },
  {
    id: "r3",
    name: "Room 3",
    type: "Cottage",
    capacity: 6,
    price: 3200,
    description: "Spacious family cottage with private balcony.",
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
    available: true,
  },
  {
    id: "r4",
    name: "Room 4",
    type: "Lodge",
    capacity: 6,
    price: 4500,
    description: "Luxury lodge room with premium amenities.",
    image:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
    available: true,
  },
];

const DEFAULT_SETTINGS: SiteSettings = {
  heroImage:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80",
  heroTitle: "Resort booking made easy",
  heroSubtitle:
    "Find your perfect lodge or cottage stay. Browse available accommodations, check prices, and reserve your stay at Brealls Resorts.",
  contactPhone: "09XXXXXXXXX",
  contactEmail: "breallsresorts@gmail.com",
  contactLocation: "San Pedro Island, Hinunangan, Southern Leyte",
  downpaymentPercent: 50,
  gcashNumber: "0917-XXX-XXXX",
  gcashName: "Brealls Resorts",
  bankName: "BDO",
  bankAccountNumber: "0000-1111-2222",
  bankAccountName: "Brealls Resorts Inc.",
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Seed on first run
function ensureSeed() {
  if (!localStorage.getItem(KEYS.users)) save(KEYS.users, DEFAULT_USERS);
  if (!localStorage.getItem(KEYS.rooms)) save(KEYS.rooms, DEFAULT_ROOMS);
  if (!localStorage.getItem(KEYS.bookings)) save(KEYS.bookings, [] as Booking[]);
  if (!localStorage.getItem(KEYS.settings)) save(KEYS.settings, DEFAULT_SETTINGS);

  // Migration: merge any new default fields and refresh location
  const SCHEMA_VERSION = "3";
  if (localStorage.getItem("brealls_schema") !== SCHEMA_VERSION) {
    const s = load<SiteSettings>(KEYS.settings, DEFAULT_SETTINGS);
    const merged = { ...DEFAULT_SETTINGS, ...s, contactLocation: DEFAULT_SETTINGS.contactLocation };
    save(KEYS.settings, merged);
    localStorage.setItem("brealls_schema", SCHEMA_VERSION);
  }
}
ensureSeed();

// Simple cross-component subscription
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

function useSubscription() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
}

// Hooks / API
export function useStore() {
  useSubscription();
  const users = load<User[]>(KEYS.users, DEFAULT_USERS);
  const rooms = load<Room[]>(KEYS.rooms, DEFAULT_ROOMS);
  const bookings = load<Booking[]>(KEYS.bookings, []);
  const settings = load<SiteSettings>(KEYS.settings, DEFAULT_SETTINGS);
  const session = load<User | null>(KEYS.session, null);

  const setUsers = useCallback((u: User[]) => {
    save(KEYS.users, u);
    notify();
  }, []);
  const setRooms = useCallback((r: Room[]) => {
    save(KEYS.rooms, r);
    notify();
  }, []);
  const setBookings = useCallback((b: Booking[]) => {
    save(KEYS.bookings, b);
    notify();
  }, []);
  const setSettings = useCallback((s: SiteSettings) => {
    save(KEYS.settings, s);
    notify();
  }, []);
  const setSession = useCallback((u: User | null) => {
    if (u) save(KEYS.session, u);
    else localStorage.removeItem(KEYS.session);
    notify();
  }, []);

  return {
    users,
    rooms,
    bookings,
    settings,
    session,
    setUsers,
    setRooms,
    setBookings,
    setSettings,
    setSession,
  };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  const diff = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

export function formatPHP(n: number) {
  return "₱" + n.toLocaleString("en-PH");
}

// Returns the bookings that block a room (confirmed or pending; cancelled ignored)
export function roomBlockingBookings(
  bookings: import("./types").Booking[],
  roomId: string
) {
  return bookings.filter(
    (b) => b.roomId === roomId && b.status !== "Cancelled"
  );
}

// Date range overlap (half-open: [checkIn, checkOut)). Same checkout/checkin day = OK.
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
) {
  return aStart < bEnd && bStart < aEnd;
}

// Find conflicts for a desired range on a given room
export function findConflicts(
  bookings: import("./types").Booking[],
  roomId: string,
  checkIn: string,
  checkOut: string
) {
  return roomBlockingBookings(bookings, roomId).filter((b) =>
    rangesOverlap(checkIn, checkOut, b.checkIn, b.checkOut)
  );
}

// Next available date (the earliest checkout among future blocking bookings that overlap today)
export function nextAvailableFrom(
  bookings: import("./types").Booking[],
  roomId: string,
  fromDate: string
) {
  const blocks = roomBlockingBookings(bookings, roomId)
    .filter((b) => b.checkOut > fromDate)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  if (blocks.length === 0) return fromDate;
  // Walk through blocks to find first gap from fromDate
  let cursor = fromDate;
  for (const b of blocks) {
    if (b.checkIn > cursor) return cursor; // gap found
    if (b.checkOut > cursor) cursor = b.checkOut;
  }
  return cursor;
}

