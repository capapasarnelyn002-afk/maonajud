import { useState } from "react";
import { uid, useStore } from "../store";
import type { User } from "../types";

export function AuthPage({ onSuccess }: { onSuccess: () => void }) {
  const { users, setUsers, setSession } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");
    const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u || u.password !== password) {
      setError("Invalid email or password.");
      return;
    }
    setSession(u);
    onSuccess();
  };

  const handleRegister = () => {
    setError("");
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      setError("Email already registered.");
      return;
    }
    const newUser: User = {
      id: uid("u"),
      name: name.trim(),
      email: email.trim(),
      password,
      role: "customer",
    };
    setUsers([...users, newUser]);
    setSession(newUser);
    onSuccess();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Login */}
        <div
          className={`bg-white rounded-2xl border p-6 shadow-sm ${
            mode === "login" ? "border-teal-500 ring-2 ring-teal-100" : "border-slate-200"
          }`}
        >
          <h2 className="text-2xl font-bold text-slate-900">Login</h2>
          <p className="text-sm text-slate-500 mt-1">
            Use your Admin, Staff, or Customer account.
          </p>
          <div className="mt-5 space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={mode === "login" ? email : ""}
              onChange={(e) => {
                setMode("login");
                setEmail(e.target.value);
              }}
              onFocus={() => setMode("login")}
              className="input"
            />
            <input
              type="password"
              placeholder="Password"
              value={mode === "login" ? password : ""}
              onChange={(e) => {
                setMode("login");
                setPassword(e.target.value);
              }}
              onFocus={() => setMode("login")}
              className="input"
            />
            {mode === "login" && error && (
              <div className="text-sm text-rose-600">{error}</div>
            )}
            <button
              onClick={handleLogin}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg"
            >
              Login
            </button>
          </div>
          <div className="mt-5 text-xs text-slate-500 space-y-1 bg-slate-50 rounded-lg p-3">
            <div>
              <b>Admin:</b> admin@brealls.com / admin123
            </div>
            <div>
              <b>Staff:</b> staff@brealls.com / staff123
            </div>
            <div>
              <b>Customer:</b> bea002@gmail.com / bea1234
            </div>
          </div>
        </div>

        {/* Register */}
        <div
          className={`bg-white rounded-2xl border p-6 shadow-sm ${
            mode === "register" ? "border-teal-500 ring-2 ring-teal-100" : "border-slate-200"
          }`}
        >
          <h2 className="text-2xl font-bold text-slate-900">Create Customer Account</h2>
          <p className="text-sm text-slate-500 mt-1">Register first before booking a stay.</p>
          <div className="mt-5 space-y-3">
            <input
              type="text"
              placeholder="Full name"
              value={mode === "register" ? name : ""}
              onChange={(e) => {
                setMode("register");
                setName(e.target.value);
              }}
              onFocus={() => setMode("register")}
              className="input"
            />
            <input
              type="email"
              placeholder="Email"
              value={mode === "register" ? email : ""}
              onChange={(e) => {
                setMode("register");
                setEmail(e.target.value);
              }}
              onFocus={() => setMode("register")}
              className="input"
            />
            <input
              type="password"
              placeholder="Password"
              value={mode === "register" ? password : ""}
              onChange={(e) => {
                setMode("register");
                setPassword(e.target.value);
              }}
              onFocus={() => setMode("register")}
              className="input"
            />
            {mode === "register" && error && (
              <div className="text-sm text-rose-600">{error}</div>
            )}
            <button
              onClick={handleRegister}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
