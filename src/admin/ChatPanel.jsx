// src/admin/ChatPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./admin.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function ChatPanel({ session, adminSocket, onClose }) {
  const [messages, setMessages] = useState(session.messages || []);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false); // prevents double send

  const areaRef = useRef(null);
  const endRef = useRef(null);

  // Helper: normalize incoming message to consistent shape
  const normalize = (m) => ({
    id: m.id ?? m._id ?? Math.random().toString(36).slice(2),
    sender: (m.sender || "USER").toString(),
    text: m.text || m.content || "",
    createdAt: m.createdAt || new Date().toISOString(),
    tempId: m.tempId ?? null,
  });

  // join socket room & setup listeners
  useEffect(() => {
    if (!adminSocket) return;

    // ensure socket open & join as admin
    if (!adminSocket.connected) adminSocket.open();
    adminSocket.emit("join_chat", {
      sessionId: session.sessionId,
      isAdmin: true,
    });

    // Expose socket for quick debugging in console and wrap emit to log (debug only)
    try {
      if (typeof window !== "undefined") {
        window.adminSocket = adminSocket;
        // Only wrap once
        if (!window.__adminSocketWrapped) {
          const origEmit = adminSocket.emit.bind(adminSocket);
          adminSocket.emit = function (ev, ...args) {
            console.log(
              "%cADMIN CLIENT EMIT →",
              "color:teal;font-weight:700",
              ev,
              args
            );
            return origEmit(ev, ...args);
          };
          window.__adminSocketWrapped = true;
        }
      }
    } catch (e) {
      // ignore in SSR or environments without window
    }

    // Handler for new messages from server
    const onNew = (msg) => {
      if (!msg) return;
      const incoming = normalize(msg);

      setMessages((prev) => {
        // 1) if server returned a tempId, replace optimistic message
        if (incoming.tempId) {
          let replaced = false;
          const mapped = prev.map((m) => {
            if (m.id === incoming.tempId) {
              replaced = true;
              return {
                id: incoming.id,
                sender: incoming.sender,
                text: incoming.text,
                createdAt: incoming.createdAt,
              };
            }
            return m;
          });
          if (replaced) return mapped;
        }

        // 2) dedupe by authoritative id
        if (
          incoming.id &&
          prev.some((m) => String(m.id) === String(incoming.id))
        ) {
          return prev; // already present
        }

        // 3) else append
        return [...prev, incoming];
      });

      // reset loading/typing state
      setIsLoading(false);
      setTyping(false);
    };

    const onTyping = (isT) => setTyping(!!isT);

    adminSocket.on("new_message", onNew);
    adminSocket.on("ai_typing", onTyping);

    return () => {
      adminSocket.off("new_message", onNew);
      adminSocket.off("ai_typing", onTyping);
      // We DO NOT close the socket here because AdminApp likely manages it.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionId, adminSocket]);

  // auto-scroll behavior
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const threshold = 160; // px threshold for auto-scroll
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (isNearBottom) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typing]);

  // send admin message (with tempId & optimistic UI) and guard double-sends
  const sendAdmin = async () => {
    const sid = session.sessionId;
    if (!sid || !text.trim()) return;

    // prevent double submits
    if (isSending) {
      console.warn("sendAdmin suppressed — already sending");
      return;
    }
    setIsSending(true);
    setIsLoading(true);

    const trimmed = text.trim();
    const tempId = "admtemp-" + Date.now().toString(36);

    // optimistic message
    const optimistic = {
      id: tempId,
      sender: "ADMIN",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((m) => [...m, optimistic]);
    setText("");

    // emit via socket with tempId
    try {
      adminSocket.emit("admin_message", {
        sessionId: sid,
        text: trimmed,
        tempId,
      });
    } catch (err) {
      console.error("admin emit failed:", err);
    }

    // optional REST persistence (keeps compatibility)
    try {
      await axios.post(`${BACKEND}/api/chats/send`, {
        sessionId: sid,
        sender: "ADMIN",
        text: trimmed,
        tempId,
      });
    } catch (err) {
      // REST persist not required if sockets save; log for debug
      console.warn("REST persist failed (optional):", err?.message || err);
    } finally {
      // short debounce to avoid immediate duplicate clicks
      setTimeout(() => setIsSending(false), 600);
      setIsLoading(false);
    }
  };

  // handler for Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendAdmin();
    }
  };

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "--:--";
    }
  };

  return (
    <div
      className="chat-panel"
      role="region"
      aria-label={`Chat with ${session.sessionId}`}
    >
      <div className="chat-header">
        <div>
          <div className="chat-title">{session.sessionId}</div>
          <div className="chat-sub muted">
            {session.userAgent || "unknown device"}
          </div>
        </div>

        <div>
          <button className="btn small" onClick={() => onClose && onClose()}>
            Close
          </button>
        </div>
      </div>

      <div className="chat-body" ref={areaRef}>
        <div className="chat-inner">
          {messages.map((m, i) => {
            const sender = String(m.sender || "").toLowerCase();
            const isAI = sender === "ai" || sender === "bot";
            const isAdmin = sender === "admin";
            const side = isAI ? "left" : "right";

            return (
              <div key={m.id || i} className={`msg-row ${side}`}>
                <div
                  className={`msg-bubble ${
                    isAI ? "ai" : isAdmin ? "admin" : "user"
                  }`}
                >
                  <div className="msg-text">{m.text}</div>
                  <div className="msg-time">{formatTime(m.createdAt)}</div>
                </div>
              </div>
            );
          })}

          {typing && (
            <div className="msg-row left">
              <div className="typing-bubble">
                <span
                  className="typing-dot"
                  style={{ animationDelay: "0s" }}
                ></span>
                <span
                  className="typing-dot"
                  style={{ animationDelay: "0.12s" }}
                ></span>
                <span
                  className="typing-dot"
                  style={{ animationDelay: "0.24s" }}
                ></span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <div className="chat-footer">
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Reply as admin — Enter to send"
          className="chat-input"
          aria-label="Reply"
        />
        <button
          onClick={sendAdmin}
          disabled={!text.trim() || isSending}
          className="btn primary"
        >
          {isLoading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
