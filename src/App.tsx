import { useState } from "react";
import { Navbar, type Page } from "./components/Navbar";
import { Hero, type SearchQuery } from "./components/Hero";
import { RoomsSection } from "./components/Rooms";
import { ContactPage } from "./components/Contact";
import { AuthPage } from "./components/Auth";
import { AdminPanel } from "./components/Admin";
import { MyBookings } from "./components/MyBookings";
import { useStore } from "./store";
import { IconMail, IconPhone, IconPin } from "./components/Icons";

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [search, setSearch] = useState<SearchQuery | null>(null);
  const { settings, session } = useStore();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar page={page} setPage={setPage} />

      <main className="flex-1">
        {page === "home" && (
          <>
            <Hero
              onSearch={(q) => {
                setSearch(q);
                setPage("rooms");
              }}
            />
            <RoomsSection search={search} onGoLogin={() => setPage("login")} />
            <FeaturedStrip />
          </>
        )}

        {page === "rooms" && (
          <div className="pt-6">
            <RoomsSection search={search} onGoLogin={() => setPage("login")} />
          </div>
        )}

        {page === "book" && <MyBookings />}

        {page === "contact" && <ContactPage />}

        {page === "login" && (
          <AuthPage
            onSuccess={() => {
              const s =
                JSON.parse(localStorage.getItem("brealls_session") || "null");
              if (s?.role === "admin" || s?.role === "staff") setPage("admin");
              else setPage("home");
            }}
          />
        )}

        {page === "admin" && <AdminPanel />}
      </main>

      <footer className="bg-slate-900 text-slate-300 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                B
              </div>
              <span className="font-bold text-white">Brealls Resorts</span>
            </div>
            <p className="text-sm mt-3 text-slate-400">
              Your perfect lodge or cottage getaway. Book with confidence.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => setPage("home")} className="hover:text-teal-400">Home</button></li>
              <li><button onClick={() => setPage("rooms")} className="hover:text-teal-400">Lodge & Cottages</button></li>
              <li><button onClick={() => setPage("book")} className="hover:text-teal-400">{session?.role === "customer" ? "My Bookings" : "Book Now"}</button></li>
              <li><button onClick={() => setPage("contact")} className="hover:text-teal-400">Contact</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">
              Contact
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><IconPhone width={14} height={14} /> {settings.contactPhone}</li>
              <li className="flex items-center gap-2"><IconMail width={14} height={14} /> {settings.contactEmail}</li>
              <li className="flex items-start gap-2"><IconPin width={14} height={14} /> <span>{settings.contactLocation}</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">
              Stay Updated
            </h4>
            <p className="text-sm text-slate-400 mb-2">
              Get news on seasonal promos and new lodges.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); alert("Subscribed (demo)"); }} className="flex gap-2">
              <input type="email" required placeholder="your@email.com" className="flex-1 px-3 py-2 rounded-lg text-sm bg-slate-800 border border-slate-700 text-white outline-none focus:border-teal-500" />
              <button className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm">Join</button>
            </form>
          </div>
        </div>
        <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
          © 2026 Brealls Resorts. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FeaturedStrip() {
  const items = [
    { title: "Beachfront views", desc: "Wake up steps from the shore." },
    { title: "Family friendly", desc: "Cottages for groups up to 6." },
    { title: "Easy reservations", desc: "Book online in under a minute." },
    { title: "24/7 support", desc: "Our staff is always ready to help." },
  ];
  return (
    <section className="bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((it) => (
          <div key={it.title} className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xl">
              ★
            </div>
            <div className="mt-2 font-semibold text-slate-900">{it.title}</div>
            <div className="text-xs text-slate-500">{it.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
