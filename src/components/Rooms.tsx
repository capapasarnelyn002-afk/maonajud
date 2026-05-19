import { useMemo, useRef, useState } from "react";
import {
  fileToDataUrl,
  findConflicts,
  formatPHP,
  nextAvailableFrom,
  nightsBetween,
  roomBlockingBookings,
  uid,
  useStore,
} from "../store";
import type { Booking, PaymentMethod, Room, RoomType } from "../types";
import { IconCal, IconCheck, IconImage, IconStar, IconUsers, IconX } from "./Icons";
import type { SearchQuery } from "./Hero";

interface Filters {
  types: Set<RoomType>;
  capacities: Set<number>;
  priceRanges: Set<string>;
  onlyAvailable: boolean;
}

const PRICE_RANGES: Record<string, [number, number]> = {
  "₱1,000 - ₱2,000": [1000, 2000],
  "₱2,001 - ₱3,500": [2001, 3500],
  "₱3,501 and above": [3501, Infinity],
};

export function RoomsSection({
  search,
  onGoLogin,
}: {
  search: SearchQuery | null;
  onGoLogin: () => void;
}) {
  const { rooms, bookings } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState<Filters>({
    types: new Set(),
    capacities: new Set(),
    priceRanges: new Set(),
    onlyAvailable: true,
  });
  const [sort, setSort] = useState<"lowest" | "highest" | "capacity">("lowest");
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);

  const filtered = useMemo(() => {
    let list = [...rooms];
    if (filters.onlyAvailable) list = list.filter((r) => r.available);
    if (filters.types.size > 0) list = list.filter((r) => filters.types.has(r.type));
    if (filters.capacities.size > 0)
      list = list.filter((r) => Array.from(filters.capacities).some((c) => r.capacity >= c));
    if (filters.priceRanges.size > 0)
      list = list.filter((r) =>
        Array.from(filters.priceRanges).some((k) => {
          const [a, b] = PRICE_RANGES[k];
          return r.price >= a && r.price <= b;
        })
      );
    if (search) list = list.filter((r) => r.capacity >= search.guests);

    if (sort === "lowest") list.sort((a, b) => a.price - b.price);
    if (sort === "highest") list.sort((a, b) => b.price - a.price);
    if (sort === "capacity") list.sort((a, b) => b.capacity - a.capacity);
    return list;
  }, [rooms, filters, sort, search]);

  const toggle = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <section id="rooms" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        {/* Filters */}
        <aside className="bg-white rounded-2xl border border-slate-200 p-5 h-fit lg:sticky lg:top-20 shadow-sm">
          <h3 className="font-bold text-slate-900 text-lg mb-4">Filter by</h3>

          <FilterGroup title="Accommodation Type">
            {(["Lodge", "Cottage"] as RoomType[]).map((t) => (
              <CheckRow
                key={t}
                label={t}
                checked={filters.types.has(t)}
                onChange={() => setFilters({ ...filters, types: toggle(filters.types, t) })}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Capacity">
            {[2, 4, 6].map((c) => (
              <CheckRow
                key={c}
                label={`${c}+ guests`}
                checked={filters.capacities.has(c)}
                onChange={() =>
                  setFilters({ ...filters, capacities: toggle(filters.capacities, c) })
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Price Range">
            {Object.keys(PRICE_RANGES).map((k) => (
              <CheckRow
                key={k}
                label={k}
                checked={filters.priceRanges.has(k)}
                onChange={() =>
                  setFilters({ ...filters, priceRanges: toggle(filters.priceRanges, k) })
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Status">
            <CheckRow
              label="Available only"
              checked={filters.onlyAvailable}
              onChange={() =>
                setFilters({ ...filters, onlyAvailable: !filters.onlyAvailable })
              }
            />
          </FilterGroup>

          <button
            onClick={() =>
              setFilters({
                types: new Set(),
                capacities: new Set(),
                priceRanges: new Set(),
                onlyAvailable: true,
              })
            }
            className="mt-2 w-full text-sm text-teal-700 hover:text-teal-800 font-semibold"
          >
            Reset filters
          </button>
        </aside>

        {/* Listing */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                Available Lodges & Cottages
              </h2>
              <p className="text-slate-600 mt-1">
                Choose from our available resort accommodations.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 font-medium">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "lowest" | "highest" | "capacity")}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
              >
                <option value="lowest">Lowest Price</option>
                <option value="highest">Highest Price</option>
                <option value="capacity">Largest Capacity</option>
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center text-slate-500">
              No accommodations match your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filtered.map((room) => {
                const conflicts = search
                  ? findConflicts(bookings, room.id, search.checkIn, search.checkOut)
                  : [];
                const upcomingBlocks = roomBlockingBookings(bookings, room.id)
                  .filter((b) => b.checkOut >= today)
                  .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
                const nextFree = search
                  ? nextAvailableFrom(bookings, room.id, search.checkIn)
                  : today;
                const isBlocked = conflicts.length > 0;
                return (
                  <RoomCard
                    key={room.id}
                    room={room}
                    isBlocked={isBlocked}
                    nextFree={nextFree}
                    bookedRanges={upcomingBlocks}
                    onReserve={() => setBookingRoom(room)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {bookingRoom && (
        <BookingModal
          room={bookingRoom}
          search={search}
          onClose={() => setBookingRoom(null)}
          onGoLogin={onGoLogin}
        />
      )}
    </section>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm py-1 px-1 rounded hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-teal-600 w-4 h-4"
      />
      <span className="text-slate-700">{label}</span>
    </label>
  );
}

function RoomCard({
  room,
  onReserve,
  isBlocked,
  nextFree,
  bookedRanges,
}: {
  room: Room;
  onReserve: () => void;
  isBlocked: boolean;
  nextFree: string;
  bookedRanges: Booking[];
}) {
  const disabled = !room.available || isBlocked;
  return (
    <article
      className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition border ${
        isBlocked ? "border-rose-200" : "border-slate-200"
      } flex flex-col`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
        <img
          src={room.image}
          alt={room.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition duration-500 ${
            isBlocked ? "grayscale-[40%]" : ""
          }`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect fill='%23e2e8f0' width='400' height='300'/><text x='50%25' y='50%25' fill='%2364748b' font-family='sans-serif' font-size='20' text-anchor='middle' dy='.3em'>No image</text></svg>";
          }}
        />
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur text-slate-800 text-xs font-bold px-3 py-1 rounded-full shadow">
          {room.type}
        </div>
        {!room.available ? (
          <div className="absolute top-3 right-3 bg-rose-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
            Unavailable
          </div>
        ) : isBlocked ? (
          <div className="absolute top-3 right-3 bg-rose-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
            Booked for selected dates
          </div>
        ) : (
          <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
            Available
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-lg">{room.name}</h3>
          <div className="flex items-center gap-1 text-amber-500 text-xs">
            <IconStar width={14} height={14} /> 4.8
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
          <IconUsers width={14} height={14} /> Capacity: {room.capacity} guests
        </div>
        <p className="text-sm text-slate-600 mt-3 flex-1">{room.description}</p>

        {bookedRanges.length > 0 && (
          <div className="mt-3 bg-rose-50/60 border border-rose-100 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-rose-700">
              <IconCal width={12} height={12} /> Currently booked
            </div>
            <ul className="mt-1 space-y-0.5 text-xs text-rose-800/90 max-h-16 overflow-y-auto">
              {bookedRanges.slice(0, 3).map((b) => (
                <li key={b.id}>
                  {b.checkIn} → {b.checkOut}
                </li>
              ))}
              {bookedRanges.length > 3 && (
                <li className="text-rose-600/70">
                  +{bookedRanges.length - 3} more reservation
                  {bookedRanges.length - 3 > 1 ? "s" : ""}
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-teal-700">{formatPHP(room.price)}</div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider">
              per night
            </div>
          </div>
          <div className="text-right">
            {isBlocked && nextFree && (
              <div className="text-[11px] text-rose-700 mb-1">
                Next free: <b>{nextFree}</b>
              </div>
            )}
            <button
              onClick={onReserve}
              disabled={disabled}
              className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition"
            >
              {isBlocked ? "Unavailable" : "Reserve now"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function BookingModal({
  room,
  search,
  onClose,
  onGoLogin,
}: {
  room: Room;
  search: SearchQuery | null;
  onClose: () => void;
  onGoLogin: () => void;
}) {
  const { session, bookings, setBookings, settings } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const initialCheckIn =
    search?.checkIn && search.checkIn >= today ? search.checkIn : today;
  const initialCheckOut =
    search?.checkOut && search.checkOut > initialCheckIn
      ? search.checkOut
      : (() => {
          const d = new Date(initialCheckIn);
          d.setDate(d.getDate() + 1);
          return d.toISOString().slice(0, 10);
        })();
  const [step, setStep] = useState<"details" | "payment" | "done">("details");
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(search?.guests || 2);
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("GCash");
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<string>("");
  const [createdBookingId, setCreatedBookingId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!session || session.role !== "customer") {
    return (
      <Modal onClose={onClose} title="Login required">
        <p className="text-slate-600">
          Please log in as a customer to reserve a room. Don’t have an account? Create one
          first.
        </p>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => {
              onClose();
              onGoLogin();
            }}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg"
          >
            Go to Login
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </Modal>
    );
  }

  const nights = nightsBetween(checkIn, checkOut);
  const total = nights * room.price;
  const downpayment = Math.round((total * settings.downpaymentPercent) / 100);
  const balance = total - downpayment;

  const conflicts = findConflicts(bookings, room.id, checkIn, checkOut);
  const hasConflict = conflicts.length > 0;
  const nextFree = nextAvailableFrom(bookings, room.id, today);
  const upcomingBlocks = roomBlockingBookings(bookings, room.id)
    .filter((b) => b.checkOut >= today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  const minCheckOut = (() => {
    const d = new Date(checkIn);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const handleCheckIn = (v: string) => {
    if (v < today) {
      setCheckIn(today);
      return;
    }
    setCheckIn(v);
    if (checkOut <= v) {
      const d = new Date(v);
      d.setDate(d.getDate() + 1);
      setCheckOut(d.toISOString().slice(0, 10));
    }
  };

  const handleCheckOut = (v: string) => {
    if (v <= checkIn) return;
    setCheckOut(v);
  };

  const goToPayment = () => {
    if (checkIn < today) {
      alert("Check-in date cannot be in the past.");
      return;
    }
    if (guests > room.capacity) {
      alert(`This room only fits up to ${room.capacity} guests.`);
      return;
    }
    if (nights < 1) {
      alert("Check-out must be after check-in.");
      return;
    }
    if (hasConflict) {
      alert(
        "Sorry, this room is already reserved within the dates you selected. Please choose other dates."
      );
      return;
    }
    setStep("payment");
  };

  const submitPaymentSafe = () => {
    // re-check conflict at submit (in case state changed)
    const stillConflict = findConflicts(bookings, room.id, checkIn, checkOut);
    if (stillConflict.length > 0) {
      alert(
        "This room was just reserved for overlapping dates. Please pick different dates."
      );
      setStep("details");
      return false;
    }
    return true;
  };

  const handleProof = async (file: File) => {
    const url = await fileToDataUrl(file);
    setProof(url);
  };

  const submitPayment = () => {
    if (paymentMethod !== "Cash on Arrival") {
      if (!reference.trim()) {
        alert("Please enter the payment reference / transaction number.");
        return;
      }
    }
    if (!submitPaymentSafe()) return;
    const booking: Booking = {
      id: uid("bk"),
      roomId: room.id,
      customerId: session.id,
      customerName: session.name,
      customerEmail: session.email,
      customerPhone: phone || undefined,
      checkIn,
      checkOut,
      guests,
      rooms: 1,
      status: "Pending",
      createdAt: new Date().toISOString(),
      total,
      downpayment,
      balance,
      paymentMethod,
      paymentStatus:
        paymentMethod === "Cash on Arrival" ? "Unpaid" : "Awaiting Verification",
      paymentReference: reference || undefined,
      paymentProof: proof || undefined,
    };
    setBookings([booking, ...bookings]);
    setCreatedBookingId(booking.id);
    setStep("done");
  };

  if (step === "done") {
    return (
      <Modal onClose={onClose} title="Reservation Submitted!">
        <div className="text-center py-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
            <IconCheck width={32} height={32} />
          </div>
          <p className="text-slate-700">
            Your reservation for <b>{room.name}</b> has been submitted.
          </p>
          {paymentMethod === "Cash on Arrival" ? (
            <p className="text-sm text-slate-600 mt-2">
              Please pay <b>{formatPHP(downpayment)}</b> upon arrival to confirm your stay.
            </p>
          ) : (
            <p className="text-sm text-slate-600 mt-2">
              Your advance payment of <b>{formatPHP(downpayment)}</b> via{" "}
              <b>{paymentMethod}</b> is awaiting verification by our staff.
            </p>
          )}
          <div className="mt-4 bg-slate-50 rounded-xl p-3 text-left text-sm space-y-1 max-w-sm mx-auto">
            <Row k="Booking ID" v={createdBookingId} />
            <Row k="Stay" v={`${checkIn} → ${checkOut} (${nights} night${nights > 1 ? "s" : ""})`} />
            <Row k="Total" v={formatPHP(total)} />
            <Row k="Downpayment" v={formatPHP(downpayment)} />
            <Row k="Balance on arrival" v={formatPHP(balance)} />
          </div>
          <button
            onClick={onClose}
            className="mt-5 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-lg"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title={`Reserve ${room.name}`} size="lg">
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-5 text-xs font-semibold">
        <span
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            step === "details" ? "bg-teal-600 text-white" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {step === "details" ? "1" : <IconCheck width={12} height={12} />} Booking Details
        </span>
        <span className="flex-1 h-px bg-slate-200" />
        <span
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            step === "payment"
              ? "bg-teal-600 text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          2 Advance Payment
        </span>
      </div>

      {step === "details" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <img
              src={room.image}
              alt={room.name}
              className="w-full h-40 object-cover rounded-xl"
            />
            <p className="text-sm text-slate-600 mt-3">{room.description}</p>
            <div className="text-xs text-slate-500 mt-2">
              {room.type} • up to {room.capacity} guests •{" "}
              {formatPHP(room.price)}/night
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Labelled label="Check-in">
                <input
                  type="date"
                  min={today}
                  value={checkIn}
                  onChange={(e) => handleCheckIn(e.target.value)}
                  className={`input ${hasConflict ? "border-rose-400 ring-2 ring-rose-100" : ""}`}
                />
              </Labelled>
              <Labelled label="Check-out">
                <input
                  type="date"
                  min={minCheckOut}
                  value={checkOut}
                  onChange={(e) => handleCheckOut(e.target.value)}
                  className={`input ${hasConflict ? "border-rose-400 ring-2 ring-rose-100" : ""}`}
                />
              </Labelled>
            </div>
            <p className="text-xs text-slate-500 -mt-1">
              Past dates are not allowed.
            </p>

            {hasConflict && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <IconX width={16} height={16} className="text-rose-600 mt-0.5" />
                  <div className="text-sm text-rose-800">
                    <div className="font-bold">Room not available on these dates.</div>
                    <div className="text-xs mt-1">
                      Already reserved:
                      <ul className="list-disc list-inside mt-0.5">
                        {conflicts.slice(0, 3).map((c) => (
                          <li key={c.id}>
                            {c.checkIn} → {c.checkOut}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = nextFree;
                        setCheckIn(next);
                        const d = new Date(next);
                        d.setDate(d.getDate() + 1);
                        setCheckOut(d.toISOString().slice(0, 10));
                      }}
                      className="mt-2 text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
                    >
                      Use next available date ({nextFree}) →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!hasConflict && upcomingBlocks.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700">
                  Already booked dates for this room
                </div>
                <ul className="text-xs text-amber-800 mt-1 space-y-0.5 max-h-20 overflow-y-auto">
                  {upcomingBlocks.slice(0, 4).map((b) => (
                    <li key={b.id}>
                      • {b.checkIn} → {b.checkOut}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Labelled label="Guests">
              <input
                type="number"
                min={1}
                max={room.capacity}
                value={guests}
                onChange={(e) => setGuests(+e.target.value)}
                className="input"
              />
            </Labelled>
            <Labelled label="Contact phone (optional)">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09XXXXXXXXX"
                className="input"
              />
            </Labelled>
            <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span>
                  {formatPHP(room.price)} × {nights} night{nights > 1 ? "s" : ""}
                </span>
                <span className="font-semibold">{formatPHP(total)}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Required downpayment ({settings.downpaymentPercent}%)</span>
                <span className="font-bold">{formatPHP(downpayment)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Balance on arrival</span>
                <span>{formatPHP(balance)}</span>
              </div>
            </div>
            <button
              onClick={goToPayment}
              disabled={hasConflict}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg"
            >
              {hasConflict ? "Pick other dates" : "Continue to Payment →"}
            </button>
          </div>
        </div>
      )}

      {step === "payment" && (
        <div className="grid md:grid-cols-2 gap-5">
          {/* Payment Instructions */}
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
              <div className="text-xs uppercase tracking-wider font-bold text-amber-700">
                Advance Payment Required
              </div>
              <div className="text-2xl font-bold text-amber-900 mt-1">
                {formatPHP(downpayment)}
              </div>
              <div className="text-xs text-amber-700">
                {settings.downpaymentPercent}% of {formatPHP(total)} • Balance{" "}
                {formatPHP(balance)} on arrival
              </div>
            </div>

            <div className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">
              Choose Payment Method
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["GCash", "Maya", "Bank Transfer", "Cash on Arrival"] as PaymentMethod[]).map(
                (m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`text-sm font-semibold py-2.5 rounded-lg border-2 transition ${
                      paymentMethod === m
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    {m}
                  </button>
                )
              )}
            </div>

            <div className="mt-4 bg-slate-50 rounded-xl p-4 text-sm space-y-1">
              {paymentMethod === "GCash" && (
                <>
                  <div className="font-bold text-slate-800">GCash Payment</div>
                  <Row k="Number" v={settings.gcashNumber} />
                  <Row k="Account Name" v={settings.gcashName} />
                  <p className="text-xs text-slate-500 mt-2">
                    Send <b>{formatPHP(downpayment)}</b> to the number above and enter the
                    reference number below.
                  </p>
                </>
              )}
              {paymentMethod === "Maya" && (
                <>
                  <div className="font-bold text-slate-800">Maya Payment</div>
                  <Row k="Number" v={settings.gcashNumber} />
                  <Row k="Account Name" v={settings.gcashName} />
                  <p className="text-xs text-slate-500 mt-2">
                    Send <b>{formatPHP(downpayment)}</b> via Maya and enter the reference
                    number below.
                  </p>
                </>
              )}
              {paymentMethod === "Bank Transfer" && (
                <>
                  <div className="font-bold text-slate-800">Bank Transfer</div>
                  <Row k="Bank" v={settings.bankName} />
                  <Row k="Account #" v={settings.bankAccountNumber} />
                  <Row k="Account Name" v={settings.bankAccountName} />
                  <p className="text-xs text-slate-500 mt-2">
                    Transfer <b>{formatPHP(downpayment)}</b> and enter your transaction
                    reference below.
                  </p>
                </>
              )}
              {paymentMethod === "Cash on Arrival" && (
                <>
                  <div className="font-bold text-slate-800">Cash on Arrival</div>
                  <p className="text-xs text-slate-600">
                    Your reservation will be held tentatively. Please pay{" "}
                    <b>{formatPHP(downpayment)}</b> upon arrival at our reception. Note:
                    reservation may be cancelled if you don’t arrive on the check-in date.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Payment confirmation form */}
          <div className="space-y-3">
            {paymentMethod !== "Cash on Arrival" && (
              <>
                <Labelled label="Reference / Transaction No.">
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="input"
                  />
                </Labelled>
                <Labelled label="Upload proof of payment (optional)">
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-teal-500 hover:bg-teal-50/30 transition"
                  >
                    {proof ? (
                      <img
                        src={proof}
                        alt="proof"
                        className="max-h-32 mx-auto rounded-lg"
                      />
                    ) : (
                      <div className="text-slate-500 text-sm flex items-center justify-center gap-2">
                        <IconImage /> Click to upload screenshot
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handleProof(e.target.files[0])
                    }
                  />
                </Labelled>
              </>
            )}

            <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
              <Row k="Room" v={room.name} />
              <Row k="Stay" v={`${checkIn} → ${checkOut}`} />
              <Row k="Guests" v={`${guests}`} />
              <Row k="Total" v={formatPHP(total)} />
              <Row k="Downpayment" v={formatPHP(downpayment)} />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setStep("details")}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 rounded-lg"
              >
                ← Back
              </button>
              <button
                onClick={submitPayment}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg"
              >
                Submit Reservation
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{k}</span>
      <span className="font-semibold text-slate-800 text-right break-all">{v}</span>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  size = "md",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${
          size === "lg" ? "max-w-3xl" : "max-w-xl"
        } max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="font-bold text-lg text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <IconX />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider font-bold text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
