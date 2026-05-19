
import { useEffect, useState } from "react";
import type { Booking, BookedRange, Room, SiteSettings, User } from "./types";

// API base URL — set VITE_API_URL at build time.
// Empty string => same-origin (useful when API and web are served together).
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const SESSION_KEY = "brealls_session";

// ---------------- API helper ----------------
async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg =
      (data as { error?: string; message?: string }).error ||
      (data as { error?: string; message?: string }).message ||
      res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

// ---------------- Field mappers (DB row → frontend type) ----------------
function mapUser(u: Record<string, unknown>): User {
  return {
    id: String(u.id),
    name: String(u.name ?? ""),
    email: String(u.email ?? ""),
    password: "",
    role: u.role as User["role"],
  };
}

function mapRoom(r: Record<string, unknown>): Room {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    type: r.type as Room["type"],
    capacity: Number(r.capacity ?? 0),
    price: Number(r.price ?? 0),
    description: String(r.description ?? ""),
    image: String(r.image_url ?? ""),
    available: Boolean(Number(r.available ?? 0)),
  };
}

function isoDate(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function mapBooking(b: Record<string, unknown>): Booking {
  return {
    id: String(b.booking_id ?? b.id),
    roomId: String(b.room_id ?? ""),
    customerId: String(b.customer_id ?? ""),
    customerName: String(b.customer_name ?? ""),
    customerEmail: String(b.customer_email ?? ""),
    customerPhone: (b.customer_phone as string) || undefined,
    checkIn: isoDate(b.check_in),
    checkOut: isoDate(b.check_out),
    guests: Number(b.guests ?? 0),
    rooms: 1,
    status: b.status as Booking["status"],
    createdAt: (b.booked_on as string) || (b.created_at as string) || new Date().toISOString(),
    total: Number(b.total ?? 0),
    downpayment: Number(b.downpayment ?? 0),
    balance: Number(b.balance ?? 0),
    paymentMethod: b.payment_method as Booking["paymentMethod"],
    paymentStatus: b.payment_status as Booking["paymentStatus"],
    paymentReference: (b.payment_reference as string) || undefined,
    paymentProof: (b.payment_proof as string) || undefined,
  };
}

function mapRange(r: Record<string, unknown>): BookedRange {
  return {
    id: String(r.id),
    roomId: String(r.room_id),
    checkIn: isoDate(r.check_in),
    checkOut: isoDate(r.check_out),
    status: r.status as BookedRange["status"],
  };
}

function mapSettings(s: Record<string, unknown> | null | undefined): SiteSettings {
  s = s || {};
  return {
    heroImage: String(s.hero_image ?? ""),
    heroTitle: String(s.hero_title ?? ""),
    heroSubtitle: String(s.hero_subtitle ?? ""),
    contactPhone: String(s.contact_phone ?? ""),
    contactEmail: String(s.contact_email ?? ""),
    contactLocation: String(s.contact_location ?? ""),
    downpaymentPercent: Number(s.downpayment_percent ?? 50),
    gcashNumber: String(s.gcash_number ?? ""),
    gcashName: String(s.gcash_name ?? ""),
    bankName: String(s.bank_name ?? ""),
    bankAccountNumber: String(s.bank_account_number ?? ""),
    bankAccountName: String(s.bank_account_name ?? ""),
  };
}

// ---------------- Empty defaults (UI render value before first fetch) ----------------
const EMPTY_SETTINGS: SiteSettings = mapSettings({});

// ---------------- Module state + subscription ----------------
interface State {
  users: User[];
  rooms: Room[];
  bookings: Booking[];        // role-specific full records
  bookedRanges: BookedRange[]; // public minimal ranges for conflict detection
  settings: SiteSettings;
  session: User | null;
  loading: boolean;
  error: string;
}

const loadSession = (): User | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

let state: State = {
  users: [],
  rooms: [],
  bookings: [],
  bookedRanges: [],
  settings: EMPTY_SETTINGS,
  session: loadSession(),
  loading: false,
  error: "",
};

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  notify();
}

// ---------------- Refresh actions ----------------
export async function refreshRooms() {
  const data = await api<Record<string, unknown>[]>("/api/rooms");
  setState({ rooms: data.map(mapRoom) });
}

export async function refreshSettings() {
  const data = await api<Record<string, unknown>>("/api/settings");
  setState({ settings: mapSettings(data) });
}

export async function refreshBookedRanges() {
  const data = await api<Record<string, unknown>[]>("/api/booked-ranges");
  setState({ bookedRanges: data.map(mapRange) });
}

export async function refreshBookings() {
  const data = await api<Record<string, unknown>[]>("/api/bookings");
  setState({ bookings: data.map(mapBooking) });
}

export async function refreshCustomerBookings(customerId: string) {
  const data = await api<Record<string, unknown>[]>(
    `/api/bookings/customer/${customerId}?filter=all`
  );
  setState({ bookings: data.map(mapBooking) });
}

export async function refreshUsers() {
  const data = await api<Record<string, unknown>[]>("/api/users");
  setState({ users: data.map(mapUser) });
}

// ---------------- Auth actions ----------------
export async function loginUser(email: string, password: string): Promise<User> {
  const res = await api<{ success: boolean; user: Record<string, unknown> }>("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const user = mapUser(res.user);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  setState({ session: user });
  await loadRoleData(user);
  return user;
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const res = await api<{ success: boolean; user: Record<string, unknown> }>(
    "/api/register",
    {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }
  );
  const user = mapUser(res.user);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  setState({ session: user });
  await loadRoleData(user);
  return user;
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  setState({ session: null, bookings: [], users: [] });
}

async function loadRoleData(user: User) {
  if (user.role === "admin" || user.role === "staff") {
    await Promise.all([refreshBookings(), refreshUsers()]).catch(() => {});
  } else if (user.role === "customer") {
    await refreshCustomerBookings(user.id).catch(() => {});
  }
}

// ---------------- Rooms (admin) ----------------
export async function createRoom(room: Omit<Room, "id">) {
  await api("/api/rooms", {
    method: "POST",
    body: JSON.stringify({
      name: room.name,
      type: room.type,
      capacity: room.capacity,
      price: room.price,
      description: room.description,
      image_url: room.image,
      available: room.available ? 1 : 0,
    }),
  });
  await refreshRooms();
}

export async function updateRoom(room: Room) {
  await api(`/api/rooms/${room.id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: room.name,
      type: room.type,
      capacity: room.capacity,
      price: room.price,
      description: room.description,
      image_url: room.image,
      available: room.available ? 1 : 0,
    }),
  });
  await refreshRooms();
}

export async function deleteRoom(id: string) {
  await api(`/api/rooms/${id}`, { method: "DELETE" });
  await refreshRooms();
}

export async function updateRoomImage(id: string, image: string) {
  await api(`/api/rooms/${id}/image`, {
    method: "PATCH",
    body: JSON.stringify({ image_url: image }),
  });
  await refreshRooms();
}

export async function toggleRoomAvailability(id: string) {
  await api(`/api/rooms/${id}/toggle`, { method: "PATCH" });
  await refreshRooms();
}

// ---------------- Bookings ----------------
export interface CreateBookingInput {
  roomId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  paymentMethod: Booking["paymentMethod"];
  paymentReference?: string;
  paymentProof?: string;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const res = await api<{ success: boolean; booking: Record<string, unknown> }>(
    "/api/bookings",
    {
      method: "POST",
      body: JSON.stringify({
        room_id: Number(input.roomId),
        customer_id: Number(input.customerId),
        customer_name: input.customerName,
        customer_email: input.customerEmail,
        customer_phone: input.customerPhone || null,
        check_in: input.checkIn,
        check_out: input.checkOut,
        guests: input.guests,
        payment_method: input.paymentMethod,
        payment_reference: input.paymentReference || null,
        payment_proof: input.paymentProof || null,
      }),
    }
  );
  const booking = mapBooking(res.booking);
  await refreshBookedRanges();
  if (state.session?.role === "customer") {
    await refreshCustomerBookings(state.session.id);
  } else if (state.session) {
    await refreshBookings();
  }
  return booking;
}

export async function updateBookingStatus(id: string, status: Booking["status"]) {
  await api(`/api/bookings/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  await Promise.all([refreshBookings(), refreshBookedRanges()]);
}

export async function updateBookingPayment(
  id: string,
  payment_status: Booking["paymentStatus"]
) {
  await api(`/api/bookings/${id}/payment`, {
    method: "PATCH",
    body: JSON.stringify({ payment_status }),
  });
  await refreshBookings();
}

// ---------------- Site settings (admin) ----------------
export async function updateSettings(s: SiteSettings) {
  await api("/api/settings", {
    method: "PUT",
    body: JSON.stringify({
      hero_image: s.heroImage,
      hero_title: s.heroTitle,
      hero_subtitle: s.heroSubtitle,
      contact_phone: s.contactPhone,
      contact_email: s.contactEmail,
      contact_location: s.contactLocation,
      downpayment_percent: s.downpaymentPercent,
      gcash_number: s.gcashNumber,
      gcash_name: s.gcashName,
      bank_name: s.bankName,
      bank_account_number: s.bankAccountNumber,
      bank_account_name: s.bankAccountName,
    }),
  });
  await refreshSettings();
}

// ---------------- Users (admin) ----------------
export async function deleteUser(id: string) {
  await api(`/api/users/${id}`, { method: "DELETE" });
  await refreshUsers();
}

// ---------------- Hook ----------------
let publicInitialized = false;
let lastSessionId: string | null = null;

export function useStore() {
  const [, force] = useState(0);

  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  // Load public data once (rooms, settings, booked ranges)
  useEffect(() => {
    if (publicInitialized) return;
    publicInitialized = true;
    setState({ loading: true });
    Promise.allSettled([refreshRooms(), refreshSettings(), refreshBookedRanges()])
      .then((results) => {
        const firstErr = results.find((r) => r.status === "rejected") as
          | PromiseRejectedResult
          | undefined;
        setState({
          loading: false,
          error: firstErr ? String(firstErr.reason?.message || firstErr.reason) : "",
        });
      });
  }, []);

  // Load per-role data whenever the session changes
  useEffect(() => {
    const sid = state.session?.id || null;
    if (sid === lastSessionId) return;
    lastSessionId = sid;
    if (!state.session) {
      setState({ bookings: [], users: [] });
      return;
    }
    loadRoleData(state.session).catch(() => {});
  }, [state.session?.id]);

  return {
    users: state.users,
    rooms: state.rooms,
    bookings: state.bookings,
    bookedRanges: state.bookedRanges,
    settings: state.settings,
    session: state.session,
    loading: state.loading,
    error: state.error,
    // actions
    setSession: (u: User | null) => {
      if (u) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(u));
        setState({ session: u });
      } else {
        logoutUser();
      }
    },
    refresh: () =>
      Promise.allSettled([
        refreshRooms(),
        refreshSettings(),
        refreshBookedRanges(),
        state.session?.role === "customer"
          ? refreshCustomerBookings(state.session.id)
          : state.session
            ? refreshBookings()
            : Promise.resolve(),
        state.session?.role === "admin" || state.session?.role === "staff"
          ? refreshUsers()
          : Promise.resolve(),
      ]),
  };
}

// =====================================================================
// Utilities (unchanged)
// =====================================================================
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
  return "₱" + Number(n || 0).toLocaleString("en-PH");
}

// ---------------- Conflict helpers (accept either Booking[] or BookedRange[]) ----------------
type RangeLike = {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

export function roomBlockingBookings<T extends RangeLike>(
  ranges: T[],
  roomId: string
): T[] {
  return ranges.filter((b) => b.roomId === roomId && b.status !== "Cancelled");
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
) {
  return aStart < bEnd && bStart < aEnd;
}

export function findConflicts<T extends RangeLike>(
  ranges: T[],
  roomId: string,
  checkIn: string,
  checkOut: string
): T[] {
  return roomBlockingBookings(ranges, roomId).filter((b) =>
    rangesOverlap(checkIn, checkOut, b.checkIn, b.checkOut)
  );
}

export function nextAvailableFrom<T extends RangeLike>(
  ranges: T[],
  roomId: string,
  fromDate: string
): string {
  const blocks = roomBlockingBookings(ranges, roomId)
    .filter((b) => b.checkOut > fromDate)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  if (blocks.length === 0) return fromDate;
  let cursor = fromDate;
  for (const b of blocks) {
    if (b.checkIn > cursor) return cursor;
    if (b.checkOut > cursor) cursor = b.checkOut;
  }
  return cursor;
}
