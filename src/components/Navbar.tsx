import { useState } from "react";
import { useStore } from "../store";
import { IconLogout, IconMenu, IconX } from "./Icons";

type Page = "home" | "rooms" | "book" | "contact" | "admin" | "login";

export function Navbar({
  page,
  setPage,
}: {
  page: Page;
  setPage: (p: Page) => void;
}) {
  const { session, setSession } = useStore();
  const [open, setOpen] = useState(false);

  const links: { id: Page; label: string; show: boolean }[] = [
    { id: "home", label: "Home", show: true },
    { id: "rooms", label: "Lodge & Cottages", show: true },
    {
      id: "book",
      label:
        session?.role === "customer"
          ? "My Bookings"
          : session?.role === "admin" || session?.role === "staff"
            ? "All Bookings"
            : "Book Now",
      show: true,
    },
    { id: "contact", label: "Contact", show: true },
    {
      id: "admin",
      label: session?.role === "admin" ? "Admin" : session?.role === "staff" ? "Staff" : "Admin",
      show: !session || session.role === "admin" || session.role === "staff",
    },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <button
          onClick={() => setPage("home")}
          className="flex items-center gap-2 group"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
            B
          </div>
          <div className="text-left">
            <div className="font-bold text-slate-900 leading-tight">Brealls Resorts</div>
            <div className="text-[10px] uppercase tracking-widest text-teal-600">
              Lodge & Cottage
            </div>
          </div>
        </button>

        <div className="hidden md:flex items-center gap-1">
          {links
            .filter((l) => l.show)
            .map((l) => (
              <button
                key={l.id}
                onClick={() => setPage(l.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  page === l.id
                    ? "bg-teal-600 text-white shadow"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </button>
            ))}
          {session ? (
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200">
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-800">{session.name}</div>
                <div className="text-[10px] uppercase tracking-wider text-teal-600">
                  {session.role}
                </div>
              </div>
              <button
                onClick={() => {
                  setSession(null);
                  setPage("home");
                }}
                title="Logout"
                className="p-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600"
              >
                <IconLogout />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setPage("login")}
              className="ml-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
            >
              Login
            </button>
          )}
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-slate-100"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <IconX /> : <IconMenu />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 px-4 py-3 space-y-1 bg-white">
          {links
            .filter((l) => l.show)
            .map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  setPage(l.id);
                  setOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  page === l.id ? "bg-teal-600 text-white" : "hover:bg-slate-100"
                }`}
              >
                {l.label}
              </button>
            ))}
          {session ? (
            <button
              onClick={() => {
                setSession(null);
                setPage("home");
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Logout ({session.name})
            </button>
          ) : (
            <button
              onClick={() => {
                setPage("login");
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white"
            >
              Login
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

export type { Page };
