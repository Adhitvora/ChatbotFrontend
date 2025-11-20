// src/admin/AdminApp.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import SessionList from "./SessionList";
import ChatPanel from "./ChatPanel";
import { adminSocket } from "./socketAdmin";
import "./admin.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function AdminApp() {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");

  // THEME: persisted dark/light mode
  const [darkMode, setDarkMode] = useState(() => {
    const t = localStorage.getItem("admin_theme");
    if (t) return t === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("admin-dark", darkMode);
    document.documentElement.classList.toggle("admin-light", !darkMode);
    localStorage.setItem("admin_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // load sessions list
  const loadSessions = async () => {
    try {
      const res = await axios.get(`${BACKEND}/api/chats`);
      // Expecting an array; if your backend returns { data: ... } adjust accordingly
      setSessions(res.data || []);
    } catch (err) {
      console.error("Load sessions error", err);
    }
  };

  useEffect(() => {
    loadSessions();

    // connect admin socket (but don't auto-join any session until admin opens it)
    adminSocket.open();
    adminSocket.on("connect", () =>
      console.log("Admin socket connected", adminSocket.id)
    );
    adminSocket.on("connect_error", (e) =>
      console.warn("Admin socket connect error", e)
    );

    return () => {
      adminSocket.off("connect");
      adminSocket.off("connect_error");
      adminSocket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return sessions;
    const q = query.toLowerCase();
    return sessions.filter((s) => {
      return (
        (s.sessionId && s.sessionId.toLowerCase().includes(q)) ||
        (s.userAgent && s.userAgent.toLowerCase().includes(q)) ||
        (s.messages &&
          s.messages.some((m) => (m.text || "").toLowerCase().includes(q)))
      );
    });
  }, [sessions, query]);

  return (
    <div className="admin-root">
      <div className="admin-container">
        {/* SIDEBAR */}
        <aside className="sidebar" aria-label="Conversations sidebar">
          <div className="sidebar-header">
            <div>
              <div className="brand">🤖 Admin</div>
              <div className="brand-sub">Conversations</div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn small"
                onClick={loadSessions}
                title="Refresh list"
              >
                Refresh
              </button>
              <button
                className="btn small"
                onClick={() => setDarkMode((d) => !d)}
                title="Toggle theme"
              >
                {darkMode ? "🌞 Light" : "🌙 Dark"}
              </button>
            </div>
          </div>

          <div className="search-block">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sessions..."
              className="search-input"
              aria-label="Search sessions"
            />
          </div>

          <div className="sessions-list" role="list">
            <SessionList
              sessions={filtered}
              onSelect={(s) => setSelected(s)}
              selectedId={selected?.sessionId}
            />
          </div>
        </aside>

        {/* MAIN */}
        <main className="main-panel" aria-live="polite">
          <div className="main-card">
            {selected ? (
              <ChatPanel
                key={selected.sessionId}
                session={selected}
                adminSocket={adminSocket}
                onClose={() => setSelected(null)}
              />
            ) : (
              <div
                className="empty-state"
                role="region"
                aria-label="Select session"
              >
                <h3>Select a session to open</h3>
                <p>Open a session to view messages and reply in real-time.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
