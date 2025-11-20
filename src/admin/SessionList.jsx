// src/admin/SessionList.jsx
import React from "react";

export default function SessionList({ sessions = [], onSelect, selectedId }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="no-sessions" style={{ color: "var(--muted)" }}>
        No sessions yet.
      </div>
    );
  }

  return (
    <ul className="session-ul" role="list">
      {sessions.map((s) => {
        const lastMsg =
          (s.messages && s.messages[s.messages.length - 1]) || null;
        const isActive = selectedId === s.sessionId;
        return (
          <li
            key={s.sessionId}
            onClick={() => onSelect && onSelect(s)}
            className={`session-item ${isActive ? "active" : ""}`}
            role="listitem"
            aria-current={isActive ? "true" : "false"}
          >
            <div className="session-avatar" aria-hidden>
              🤖
            </div>

            <div className="session-body">
              <div className="session-row">
                <div className="session-title">{s.sessionId}</div>
                <div className="session-time">
                  {lastMsg
                    ? new Date(lastMsg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </div>
              </div>

              <div className="session-snippet">
                {lastMsg
                  ? lastMsg.text.length > 80
                    ? lastMsg.text.slice(0, 80) + "…"
                    : lastMsg.text
                  : s.userAgent || "No messages"}
              </div>

              <div className="session-meta">
                <span>{s.messages?.length || 0} messages</span>
                <span className="dot">•</span>
                <span className="muted">
                  {s.userAgent ? s.userAgent.slice(0, 40) : "unknown"}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
