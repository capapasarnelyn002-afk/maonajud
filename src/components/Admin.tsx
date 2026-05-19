import { useMemo, useRef, useState } from "react";
import { fileToDataUrl, formatPHP, uid, useStore } from "../store";
import type { Booking, Room, RoomType } from "../types";
import { IconCheck, IconEdit, IconImage, IconPlus, IconTrash, IconX } from "./Icons";
import { Labelled, Modal } from "./Rooms";

type Tab = "dashboard" | "rooms" | "bookings" | "records" | "site" | "users";

export function AdminPanel() {
  const { session } = useStore();
  const [tab, setTab] = useState<Tab>("dashboard");

  if (!session || (session.role !== "admin" && session.role !== "staff")) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Access denied</h2>
        <p className="text-slate-600 mt-2">
          You need to log in as admin or staff to view this page.
        </p>
      </div>
    );
  }

  const isAdmin = session.role === "admin";
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "dashboard", label: "Dashboard", show: true },
    { id: "rooms", label: "Manage Rooms", show: isAdmin },
    { id: "bookings", label: "Bookings", show: true },
    { id: "records", label: "Booked Records", show: true },
    { id: "site", label: "Site Settings", show: isAdmin },
    { id: "users", label: "Users", show: isAdmin },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            {isAdmin ? "Admin" : "Staff"} Panel
          </h2>
          <p className="text-slate-600">
            Welcome back, <span className="font-semibold">{session.name}</span>.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 mb-6">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px ${
                tab === t.id
                  ? "border-teal-600 text-teal-700 bg-teal-50"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      {tab === "dashboard" && <Dashboard />}
      {tab === "rooms" && isAdmin && <ManageRooms />}
      {tab === "bookings" && <ManageBookings />}
      {tab === "records" && <BookedRecords />}
      {tab === "site" && isAdmin && <SiteSettingsForm />}
      {tab === "users" && isAdmin && <ManageUsers />}
    </section>
  );
}

function Dashboard() {
  const { rooms, bookings, users } = useStore();
  const pending = bookings.filter((b) => b.status === "Pending").length;
  const confirmed = bookings.filter((b) => b.status === "Confirmed").length;
  const revenue = bookings
    .filter((b) => b.status === "Confirmed")
    .reduce((s, b) => s + b.total, 0);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Total Rooms" value={rooms.length} color="teal" />
      <Stat label="Pending Bookings" value={pending} color="amber" />
      <Stat label="Confirmed Bookings" value={confirmed} color="emerald" />
      <Stat label="Total Customers" value={users.filter((u) => u.role === "customer").length} color="slate" />
      <Stat label="Revenue (Confirmed)" value={formatPHP(revenue)} color="teal" wide />
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  wide,
}: {
  label: string;
  value: string | number;
  color: "teal" | "amber" | "emerald" | "slate";
  wide?: boolean;
}) {
  const styles = {
    teal: "from-teal-500 to-emerald-600",
    amber: "from-amber-500 to-orange-600",
    emerald: "from-emerald-500 to-green-600",
    slate: "from-slate-600 to-slate-800",
  }[color];
  return (
    <div
      className={`${
        wide ? "sm:col-span-2" : ""
      } bg-gradient-to-br ${styles} text-white rounded-2xl p-5 shadow-lg`}
    >
      <div className="text-xs uppercase tracking-wider opacity-80 font-semibold">{label}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

function ManageRooms() {
  const { rooms, setRooms } = useStore();
  const [editing, setEditing] = useState<Room | null>(null);
  const [adding, setAdding] = useState(false);

  const remove = (id: string) => {
    if (confirm("Delete this room?")) setRooms(rooms.filter((r) => r.id !== id));
  };

  const save = (room: Room) => {
    if (rooms.some((r) => r.id === room.id)) {
      setRooms(rooms.map((r) => (r.id === room.id ? room : r)));
    } else {
      setRooms([...rooms, room]);
    }
    setEditing(null);
    setAdding(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-xl text-slate-900">Lodges & Cottages</h3>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-lg"
        >
          <IconPlus /> Add Room
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((r) => (
          <AdminRoomCard
            key={r.id}
            room={r}
            onEdit={() => setEditing(r)}
            onDelete={() => remove(r.id)}
            onImageChange={(img) => setRooms(rooms.map((x) => (x.id === r.id ? { ...x, image: img } : x)))}
            onToggleAvailable={() =>
              setRooms(rooms.map((x) => (x.id === r.id ? { ...x, available: !x.available } : x)))
            }
          />
        ))}
      </div>

      {(editing || adding) && (
        <RoomForm
          room={
            editing || {
              id: uid("r"),
              name: "",
              type: "Lodge",
              capacity: 2,
              price: 1500,
              description: "",
              image: "",
              available: true,
            }
          }
          onCancel={() => {
            setEditing(null);
            setAdding(false);
          }}
          onSave={save}
        />
      )}
    </div>
  );
}

function AdminRoomCard({
  room,
  onEdit,
  onDelete,
  onImageChange,
  onToggleAvailable,
}: {
  room: Room;
  onEdit: () => void;
  onDelete: () => void;
  onImageChange: (img: string) => void;
  onToggleAvailable: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const url = await fileToDataUrl(file);
    onImageChange(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="relative aspect-video bg-slate-100 group">
        {room.image ? (
          <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <IconImage width={32} height={32} />
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-semibold gap-2"
        >
          <IconImage /> Change Image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-bold text-slate-900">{room.name}</div>
            <div className="text-xs text-slate-500">
              {room.type} • {room.capacity} guests
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-teal-700">{formatPHP(room.price)}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              per night
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{room.description}</p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onToggleAvailable}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg ${
              room.available
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            {room.available ? "Available" : "Unavailable"}
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
            title="Edit"
          >
            <IconEdit width={16} height={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
            title="Delete"
          >
            <IconTrash width={16} height={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomForm({
  room,
  onSave,
  onCancel,
}: {
  room: Room;
  onSave: (r: Room) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Room>(room);
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = async (file: File) => {
    const url = await fileToDataUrl(file);
    setDraft({ ...draft, image: url });
  };

  return (
    <Modal title={room.name ? `Edit ${room.name}` : "Add new room"} onClose={onCancel} size="lg">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div
            className="aspect-video bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer relative group"
            onClick={() => fileRef.current?.click()}
          >
            {draft.image ? (
              <img src={draft.image} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-400 text-sm">Click to upload image</div>
            )}
            <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-semibold gap-2">
              <IconImage /> Upload Image
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Labelled label="Or paste image URL">
            <input
              value={draft.image.startsWith("data:") ? "" : draft.image}
              onChange={(e) => setDraft({ ...draft, image: e.target.value })}
              placeholder="https://..."
              className="input"
            />
          </Labelled>
        </div>
        <div className="space-y-3">
          <Labelled label="Name">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="input"
            />
          </Labelled>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Type">
              <select
                value={draft.type}
                onChange={(e) =>
                  setDraft({ ...draft, type: e.target.value as RoomType })
                }
                className="input"
              >
                <option value="Lodge">Lodge</option>
                <option value="Cottage">Cottage</option>
              </select>
            </Labelled>
            <Labelled label="Capacity">
              <input
                type="number"
                min={1}
                value={draft.capacity}
                onChange={(e) => setDraft({ ...draft, capacity: +e.target.value })}
                className="input"
              />
            </Labelled>
          </div>
          <Labelled label="Price (₱ per night)">
            <input
              type="number"
              min={0}
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: +e.target.value })}
              className="input"
            />
          </Labelled>
          <Labelled label="Description">
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="input min-h-24"
            />
          </Labelled>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.available}
              onChange={(e) => setDraft({ ...draft, available: e.target.checked })}
              className="accent-teal-600 w-4 h-4"
            />
            Available for booking
          </label>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onSave(draft)}
              disabled={!draft.name.trim()}
              className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-lg"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ManageBookings() {
  const { bookings, rooms, setBookings } = useStore();
  const [filter, setFilter] = useState<Booking["status"] | "All">("All");
  const [viewing, setViewing] = useState<Booking | null>(null);

  const list = filter === "All" ? bookings : bookings.filter((b) => b.status === filter);

  const update = (id: string, status: Booking["status"]) =>
    setBookings(bookings.map((b) => (b.id === id ? { ...b, status } : b)));

  const markPaid = (id: string) =>
    setBookings(
      bookings.map((b) =>
        b.id === id ? { ...b, paymentStatus: "Paid", status: "Confirmed" } : b
      )
    );

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {(["All", "Pending", "Confirmed", "Cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              filter === s
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Room</th>
                <th className="text-left px-4 py-3">Dates</th>
                <th className="text-left px-4 py-3">Guests</th>
                <th className="text-right px-4 py-3">Down / Total</th>
                <th className="text-center px-4 py-3">Payment</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-slate-500 py-10">
                    No bookings yet.
                  </td>
                </tr>
              )}
              {list.map((b) => {
                const room = rooms.find((r) => r.id === b.roomId);
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{b.customerName}</div>
                      <div className="text-xs text-slate-500">{b.customerEmail}</div>
                      {b.customerPhone && (
                        <div className="text-xs text-slate-500">{b.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{room?.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {b.checkIn}
                      <span className="text-slate-400"> → </span>
                      {b.checkOut}
                    </td>
                    <td className="px-4 py-3">{b.guests}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold text-amber-700">
                        {formatPHP(b.downpayment)}
                      </div>
                      <div className="text-xs text-slate-500">
                        of {formatPHP(b.total)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PaymentBadge status={b.paymentStatus} />
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {b.paymentMethod}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => setViewing(b)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                          title="View details"
                        >
                          View
                        </button>
                        {b.paymentStatus === "Awaiting Verification" && (
                          <button
                            onClick={() => markPaid(b.id)}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold"
                            title="Mark paid & confirm"
                          >
                            Mark Paid
                          </button>
                        )}
                        {b.status !== "Confirmed" && (
                          <button
                            onClick={() => update(b.id, "Confirmed")}
                            className="p-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                            title="Confirm"
                          >
                            <IconCheck width={16} height={16} />
                          </button>
                        )}
                        {b.status !== "Cancelled" && (
                          <button
                            onClick={() => update(b.id, "Cancelled")}
                            className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700"
                            title="Cancel"
                          >
                            <IconX width={16} height={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <Modal
          title={`Booking ${viewing.id}`}
          onClose={() => setViewing(null)}
          size="lg"
        >
          <BookingDetails
            booking={viewing}
            room={rooms.find((r) => r.id === viewing.roomId)}
          />
        </Modal>
      )}
    </div>
  );
}

function PaymentBadge({ status }: { status: Booking["paymentStatus"] }) {
  const styles: Record<Booking["paymentStatus"], string> = {
    Paid: "bg-emerald-100 text-emerald-700",
    "Awaiting Verification": "bg-amber-100 text-amber-700",
    Unpaid: "bg-slate-100 text-slate-700",
    Refunded: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

function BookingDetails({
  booking,
  room,
}: {
  booking: Booking;
  room?: { name: string; image: string };
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <div className="space-y-2 text-sm">
        <div className="font-bold text-slate-900 text-base">
          {room?.name || "Room"}
        </div>
        <DRow k="Customer" v={booking.customerName} />
        <DRow k="Email" v={booking.customerEmail} />
        {booking.customerPhone && <DRow k="Phone" v={booking.customerPhone} />}
        <DRow k="Check-in" v={booking.checkIn} />
        <DRow k="Check-out" v={booking.checkOut} />
        <DRow k="Guests" v={String(booking.guests)} />
        <DRow k="Total" v={formatPHP(booking.total)} />
        <DRow k="Downpayment" v={formatPHP(booking.downpayment)} />
        <DRow k="Balance" v={formatPHP(booking.balance)} />
        <DRow k="Payment Method" v={booking.paymentMethod} />
        <DRow k="Payment Status" v={booking.paymentStatus} />
        {booking.paymentReference && (
          <DRow k="Reference #" v={booking.paymentReference} />
        )}
        <DRow k="Booked On" v={new Date(booking.createdAt).toLocaleString()} />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">
          Proof of Payment
        </div>
        {booking.paymentProof ? (
          <img
            src={booking.paymentProof}
            alt="proof"
            className="w-full rounded-xl border border-slate-200"
          />
        ) : (
          <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-sm text-slate-500">
            No proof uploaded
          </div>
        )}
      </div>
    </div>
  );
}

function DRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
      <span className="text-slate-500">{k}</span>
      <span className="font-semibold text-slate-800 text-right break-all">{v}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: Booking["status"] }) {
  const styles = {
    Pending: "bg-amber-100 text-amber-700",
    Confirmed: "bg-emerald-100 text-emerald-700",
    Cancelled: "bg-rose-100 text-rose-700",
  }[status];
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles}`}>
      {status}
    </span>
  );
}

function SiteSettingsForm() {
  const { settings, setSettings } = useStore();
  const [draft, setDraft] = useState(settings);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  const handleHero = async (file: File) => {
    const url = await fileToDataUrl(file);
    setDraft({ ...draft, heroImage: url });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-bold text-lg text-slate-900 mb-4">Hero Background</h3>
        <div
          className="aspect-video rounded-xl overflow-hidden bg-slate-100 relative group cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <img src={draft.heroImage} alt="hero" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-semibold gap-2">
            <IconImage /> Change Background Image
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleHero(e.target.files[0])}
        />
        <Labelled label="Or paste image URL">
          <input
            value={draft.heroImage.startsWith("data:") ? "" : draft.heroImage}
            onChange={(e) => setDraft({ ...draft, heroImage: e.target.value })}
            placeholder="https://..."
            className="input"
          />
        </Labelled>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-lg text-slate-900 mb-2">Site Content</h3>
        <Labelled label="Hero Title">
          <input
            value={draft.heroTitle}
            onChange={(e) => setDraft({ ...draft, heroTitle: e.target.value })}
            className="input"
          />
        </Labelled>
        <Labelled label="Hero Subtitle">
          <textarea
            value={draft.heroSubtitle}
            onChange={(e) => setDraft({ ...draft, heroSubtitle: e.target.value })}
            className="input min-h-24"
          />
        </Labelled>
        <Labelled label="Contact Phone">
          <input
            value={draft.contactPhone}
            onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })}
            className="input"
          />
        </Labelled>
        <Labelled label="Contact Email">
          <input
            value={draft.contactEmail}
            onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
            className="input"
          />
        </Labelled>
        <Labelled label="Location">
          <input
            value={draft.contactLocation}
            onChange={(e) => setDraft({ ...draft, contactLocation: e.target.value })}
            className="input"
          />
        </Labelled>

        <div className="pt-3 border-t border-slate-200">
          <div className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">
            Payment Settings
          </div>
          <Labelled label="Required downpayment %">
            <input
              type="number"
              min={0}
              max={100}
              value={draft.downpaymentPercent}
              onChange={(e) =>
                setDraft({ ...draft, downpaymentPercent: +e.target.value })
              }
              className="input"
            />
          </Labelled>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Labelled label="GCash / Maya Number">
              <input
                value={draft.gcashNumber}
                onChange={(e) => setDraft({ ...draft, gcashNumber: e.target.value })}
                className="input"
              />
            </Labelled>
            <Labelled label="Account Name">
              <input
                value={draft.gcashName}
                onChange={(e) => setDraft({ ...draft, gcashName: e.target.value })}
                className="input"
              />
            </Labelled>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <Labelled label="Bank">
              <input
                value={draft.bankName}
                onChange={(e) => setDraft({ ...draft, bankName: e.target.value })}
                className="input"
              />
            </Labelled>
            <Labelled label="Bank Account #">
              <input
                value={draft.bankAccountNumber}
                onChange={(e) =>
                  setDraft({ ...draft, bankAccountNumber: e.target.value })
                }
                className="input"
              />
            </Labelled>
            <Labelled label="Bank Account Name">
              <input
                value={draft.bankAccountName}
                onChange={(e) =>
                  setDraft({ ...draft, bankAccountName: e.target.value })
                }
                className="input"
              />
            </Labelled>
          </div>
        </div>

        <button
          onClick={() => {
            setSettings(draft);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg"
        >
          {saved ? "✓ Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function ManageUsers() {
  const { users, setUsers } = useStore();
  const remove = (id: string) => {
    if (confirm("Delete this user?")) setUsers(users.filter((u) => u.id !== id));
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold">{u.name}</td>
                <td className="px-4 py-3 text-slate-700">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.role === "admin"
                        ? "bg-teal-100 text-teal-700"
                        : u.role === "staff"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role !== "admin" && (
                    <button
                      onClick={() => remove(u.id)}
                      className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700"
                    >
                      <IconTrash width={16} height={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BookedRecords() {
  const { bookings, rooms } = useStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Booking["status"] | "All">("All");
  const [paymentFilter, setPaymentFilter] = useState<Booking["paymentStatus"] | "All">(
    "All"
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [viewing, setViewing] = useState<Booking | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo<Booking[]>(() => {
    let list: Booking[] = [...bookings].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (b) =>
          b.customerName.toLowerCase().includes(q) ||
          b.customerEmail.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          (b.paymentReference || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "All") list = list.filter((b) => b.status === statusFilter);
    if (paymentFilter !== "All")
      list = list.filter((b) => b.paymentStatus === paymentFilter);
    if (fromDate) list = list.filter((b) => b.checkIn >= fromDate);
    if (toDate) list = list.filter((b) => b.checkOut <= toDate);
    return list;
  }, [bookings, query, statusFilter, paymentFilter, fromDate, toDate]);

  const totalRevenue = filtered
    .filter((b) => b.paymentStatus === "Paid" || b.status === "Confirmed")
    .reduce((s, b) => s + b.total, 0);
  const totalDownpayment = filtered
    .filter((b) => b.paymentStatus === "Paid")
    .reduce((s, b) => s + b.downpayment, 0);

  const exportCsv = () => {
    const headers = [
      "Booking ID",
      "Customer Name",
      "Email",
      "Phone",
      "Room",
      "Check-in",
      "Check-out",
      "Guests",
      "Total",
      "Downpayment",
      "Balance",
      "Payment Method",
      "Payment Status",
      "Reference",
      "Status",
      "Booked On",
    ];
    const rows = filtered.map((b) => {
      const room = rooms.find((r) => r.id === b.roomId);
      return [
        b.id,
        b.customerName,
        b.customerEmail,
        b.customerPhone || "",
        room?.name || "",
        b.checkIn,
        b.checkOut,
        b.guests,
        b.total,
        b.downpayment,
        b.balance,
        b.paymentMethod,
        b.paymentStatus,
        b.paymentReference || "",
        b.status,
        new Date(b.createdAt).toLocaleString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `brealls-booked-records-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <RecStat label="Total Records" value={filtered.length} />
        <RecStat label="Confirmed" value={filtered.filter((b) => b.status === "Confirmed").length} />
        <RecStat label="Cancelled" value={filtered.filter((b) => b.status === "Cancelled").length} />
        <RecStat label="Revenue" value={formatPHP(totalRevenue)} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-4">
        <div className="grid md:grid-cols-5 gap-3">
          <input
            placeholder="Search name, email, ID, reference…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input md:col-span-2"
          />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as Booking["status"] | "All")
            }
            className="input"
          >
            <option value="All">All statuses</option>
            <option>Pending</option>
            <option>Confirmed</option>
            <option>Cancelled</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(e) =>
              setPaymentFilter(e.target.value as Booking["paymentStatus"] | "All")
            }
            className="input"
          >
            <option value="All">All payments</option>
            <option>Awaiting Verification</option>
            <option>Paid</option>
            <option>Unpaid</option>
            <option>Refunded</option>
          </select>
          <button
            onClick={exportCsv}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg px-4 py-2.5 text-sm"
          >
            Export CSV
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          <label className="text-xs text-slate-600">
            From check-in
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="text-xs text-slate-600">
            To check-out
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input mt-1"
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={() => {
                setQuery("");
                setStatusFilter("All");
                setPaymentFilter("All");
                setFromDate("");
                setToDate("");
              }}
              className="text-sm text-teal-700 hover:text-teal-800 font-semibold"
            >
              Clear filters
            </button>
          </div>
        </div>
        {totalDownpayment > 0 && (
          <div className="text-xs text-slate-500 mt-3">
            Total downpayments received in this view:{" "}
            <b className="text-emerald-700">{formatPHP(totalDownpayment)}</b>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Booking ID</th>
                <th className="text-left px-4 py-3">Booked On</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Room</th>
                <th className="text-left px-4 py-3">Dates</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-center px-4 py-3">Payment</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-slate-500 py-10">
                    No matching records found.
                  </td>
                </tr>
              )}
              {filtered.map((b) => {
                const room = rooms.find((r) => r.id === b.roomId);
                const isPast = b.checkOut < today;
                return (
                  <tr key={b.id} className={`hover:bg-slate-50 ${isPast ? "opacity-75" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{b.id}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(b.createdAt).toLocaleDateString()}
                      <div className="text-[10px] text-slate-400">
                        {new Date(b.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{b.customerName}</div>
                      <div className="text-xs text-slate-500">{b.customerEmail}</div>
                    </td>
                    <td className="px-4 py-3">{room?.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs">
                      {b.checkIn}
                      <div className="text-slate-400">to {b.checkOut}</div>
                      {isPast && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          Past
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-teal-700">
                      {formatPHP(b.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PaymentBadge status={b.paymentStatus} />
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {b.paymentMethod}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setViewing(b)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <Modal title={`Record ${viewing.id}`} onClose={() => setViewing(null)} size="lg">
          <BookingDetails
            booking={viewing}
            room={rooms.find((r) => r.id === viewing.roomId)}
          />
        </Modal>
      )}
    </div>
  );
}

function RecStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
        {label}
      </div>
      <div className="text-xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}
