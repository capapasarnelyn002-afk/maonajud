import { useState } from "react";
import { useStore } from "../store";
import { IconCal, IconPin, IconSearch, IconUser } from "./Icons";

export function Hero({ onSearch }: { onSearch: (q: SearchQuery) => void }) {
  const { settings } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);

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

  const handleSearch = () => {
    if (checkIn < today) {
      alert("Check-in date cannot be in the past.");
      return;
    }
    if (checkOut <= checkIn) {
      alert("Check-out date must be after check-in.");
      return;
    }
    onSearch({ checkIn, checkOut, guests, rooms });
  };

  return (
    <section className="relative">
      <div
        className="relative h-[520px] sm:h-[560px] bg-cover bg-center"
        style={{ backgroundImage: `url("${settings.heroImage}")` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/70" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full w-fit text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Resort booking made easy
          </div>
          <h1 className="mt-4 text-4xl sm:text-6xl font-bold leading-tight max-w-3xl drop-shadow-lg">
            {settings.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-slate-100 text-base sm:text-lg">
            {settings.heroSubtitle}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-slate-100">
            <IconPin /> {settings.contactLocation}
          </div>
        </div>
      </div>

      {/* Search bar - overlapping */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-5 gap-3 border border-slate-100">
          <Field label="Check-in" icon={<IconCal />}>
            <input
              type="date"
              min={today}
              value={checkIn}
              onChange={(e) => handleCheckIn(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-medium text-slate-800"
            />
          </Field>
          <Field label="Check-out" icon={<IconCal />}>
            <input
              type="date"
              min={minCheckOut}
              value={checkOut}
              onChange={(e) => handleCheckOut(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-medium text-slate-800"
            />
          </Field>
          <Field label="Guests" icon={<IconUser />}>
            <select
              value={guests}
              onChange={(e) => setGuests(+e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-medium text-slate-800"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "adult" : "adults"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rooms" icon={<IconUser />}>
            <select
              value={rooms}
              onChange={(e) => setRooms(+e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-medium text-slate-800"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "room" : "rooms"}
                </option>
              ))}
            </select>
          </Field>
          <button
            onClick={handleSearch}
            className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl px-5 py-3 shadow-md transition"
          >
            <IconSearch /> Search
          </button>
        </div>
      </div>
    </section>
  );
}

export interface SearchQuery {
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 border border-slate-200 rounded-xl px-3 py-2 hover:border-teal-400 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 transition">
      <span className="text-teal-600">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          {label}
        </span>
        {children}
      </span>
    </label>
  );
}
