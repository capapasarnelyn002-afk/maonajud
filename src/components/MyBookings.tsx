import { useMemo, useState } from "react";
import { formatPHP, nightsBetween, useStore } from "../store";
import type { Booking } from "../types";

type FilterTab = "upcoming" | "history" | "all";

export function MyBookings() {
  const { session, bookings, rooms } = useStore();
  const [tab, setTab] = useState<FilterTab>("upcoming");

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Sign in to view your bookings</h2>
        <p className="text-slate-600 mt-2">
          Log in or create an account to make reservations.
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const mine = useMemo<Booking[]>(() => {
    const list =
      session.role === "customer"
        ? bookings.filter((b) => b.customerId === session.id)
        : bookings;
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [bookings, session]);

  const upcoming = mine.filter(
    (b) => b.checkOut >= today && b.status !== "Cancelled"
  );
  const history = mine.filter(
    (b) => b.checkOut < today || b.status === "Cancelled"
  );

  const visible = tab === "upcoming" ? upcoming : tab === "history" ? history : mine;

  const totalSpent = mine
    .filter((b) => b.paymentStatus === "Paid")
    .reduce((s, b) => s + b.total, 0);
  const completedStays = history.filter((b) => b.status === "Confirmed").length;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            {session.role === "customer" ? "My Bookings" : "All Bookings"}
          </h2>
          <p className="text-slate-600 mt-1">
            Manage your upcoming stays and review your past reservations.
          </p>
        </div>
      </div>

      {/* Quick stats for customers */}
      {session.role === "customer" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Bookings" value={mine.length} />
          <StatCard label="Upcoming" value={upcoming.length} />
          <StatCard label="Completed Stays" value={completedStays} />
          <StatCard label="Total Spent" value={formatPHP(totalSpent)} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mb-5 overflow-x-auto">
        <TabBtn active={tab === "upcoming"} onClick={() => setTab("upcoming")}>
          Upcoming ({upcoming.length})
        </TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")}>
          History ({history.length})
        </TabBtn>
        <TabBtn active={tab === "all"} onClick={() => setTab("all")}>
          All ({mine.length})
        </TabBtn>
      </div>

      <div className="space-y-3">
        {visible.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500">
            {tab === "upcoming"
              ? "No upcoming bookings."
              : tab === "history"
                ? "No past bookings yet."
                : "No bookings yet."}
          </div>
        )}
        {visible.map((b) => {
          const room = rooms.find((r) => r.id === b.roomId);
          const nights = nightsBetween(b.checkIn, b.checkOut);
          const isPast = b.checkOut < today;
          const isCancelled = b.status === "Cancelled";
          return (
            <article
              key={b.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                isCancelled
                  ? "border-rose-200"
                  : isPast
                    ? "border-slate-200 opacity-90"
                    : "border-slate-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row gap-4 p-4">
                {room && (
                  <img
                    src={room.image}
                    alt={room.name}
                    className={`w-full sm:w-40 h-32 sm:h-32 rounded-xl object-cover ${
                      isPast || isCancelled ? "grayscale-[40%]" : ""
                    }`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-lg">
                      {room?.name || "Room"}
                    </h3>
                    <StatusPill status={b.status} />
                    {isPast && !isCancelled && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        Completed
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {b.id}
                  </div>
                  <div className="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-700">
                    <div>
                      <span className="text-slate-500">Stay:</span> {b.checkIn} →{" "}
                      {b.checkOut}{" "}
                      <span className="text-slate-400">
                        ({nights} night{nights > 1 ? "s" : ""})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Guests:</span> {b.guests}
                    </div>
                    <div>
                      <span className="text-slate-500">Payment:</span>{" "}
                      {b.paymentMethod}
                    </div>
                    <div>
                      <span className="text-slate-500">Booked on:</span>{" "}
                      {new Date(b.createdAt).toLocaleDateString()}
                    </div>
                    {b.paymentReference && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-500">Reference:</span>{" "}
                        <span className="font-mono">{b.paymentReference}</span>
                      </div>
                    )}
                  </div>
                  {session.role !== "customer" && (
                    <div className="text-xs text-slate-500 mt-2 border-t border-slate-100 pt-2">
                      Customer: <b>{b.customerName}</b> ({b.customerEmail})
                      {b.customerPhone && <> • {b.customerPhone}</>}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-4 pt-3 sm:pt-0">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">
                    Total
                  </div>
                  <div className="font-bold text-teal-700 text-2xl">
                    {formatPHP(b.total)}
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <PaymentPill status={b.paymentStatus} />
                    <div className="text-xs text-amber-700">
                      Down: <b>{formatPHP(b.downpayment)}</b>
                    </div>
                    {b.balance > 0 && b.paymentStatus !== "Paid" && (
                      <div className="text-xs text-slate-500">
                        Bal: {formatPHP(b.balance)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
        {label}
      </div>
      <div className="text-xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${
        active
          ? "border-teal-600 text-teal-700"
          : "border-transparent text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: Booking["status"] }) {
  const styles = {
    Pending: "bg-amber-100 text-amber-700",
    Confirmed: "bg-emerald-100 text-emerald-700",
    Cancelled: "bg-rose-100 text-rose-700",
  }[status];
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles}`}>
      {status}
    </span>
  );
}

function PaymentPill({ status }: { status: Booking["paymentStatus"] }) {
  const styles: Record<Booking["paymentStatus"], string> = {
    Paid: "bg-emerald-100 text-emerald-700",
    "Awaiting Verification": "bg-amber-100 text-amber-700",
    Unpaid: "bg-slate-100 text-slate-700",
    Refunded: "bg-blue-100 text-blue-700",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}
