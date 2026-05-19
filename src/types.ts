export type UserRole = "admin" | "staff" | "customer";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export type RoomType = "Lodge" | "Cottage";

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  price: number;
  description: string;
  image: string; // data URL or remote URL
  available: boolean;
}

export type PaymentMethod = "GCash" | "Maya" | "Bank Transfer" | "Cash on Arrival";
export type PaymentStatus = "Awaiting Verification" | "Paid" | "Unpaid" | "Refunded";

export interface Booking {
  id: string;
  roomId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  status: "Pending" | "Confirmed" | "Cancelled";
  createdAt: string;
  total: number;
  downpayment: number;
  balance: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  paymentProof?: string; // data URL
}

export interface SiteSettings {
  heroImage: string;
  heroTitle: string;
  heroSubtitle: string;
  contactPhone: string;
  contactEmail: string;
  contactLocation: string;
  downpaymentPercent: number; // e.g. 50
  gcashNumber: string;
  gcashName: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}
