import { useEffect, useState, useRef } from "react";
import { socket } from "./socket";
import axios from "axios";
import "./App.css";

export default function App() {
  const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [responseTime, setResponseTime] = useState(0);
  const responseTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    let sid = localStorage.getItem("chat_session_id");
    if (!sid) {
      sid = Date.now().toString();
      localStorage.setItem("chat_session_id", sid);
    }

    socket.emit("join_chat", { sessionId: sid, isAdmin: false });

    axios.get(`${BACKEND}/api/chats/${sid}`).then(res => {
      if (res.data?.messages) setMessages(res.data.messages);
    });

    socket.on("new_message", msg => {
      setIsLoading(false);
      setResponseTime(0);
      if (responseTimerRef.current) {
        clearInterval(responseTimerRef.current);
        responseTimerRef.current = null;
      }
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off("new_message");
      if (responseTimerRef.current) {
        clearInterval(responseTimerRef.current);
      }
    };
  }, []);

  const startResponseTimer = () => {
    setResponseTime(0);
    if (responseTimerRef.current) {
      clearInterval(responseTimerRef.current);
    }
    responseTimerRef.current = setInterval(() => {
      setResponseTime(prev => prev + 1);
    }, 1000);
  };

  const send = () => {
    const sid = localStorage.getItem("chat_session_id");
    if (!text.trim()) return;
    
    setIsLoading(true);
    startResponseTimer();
    socket.emit("user_message", { sessionId: sid, text });
    setText("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatResponseTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className={`chat-container ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="chat-header">
        <div className="chat-avatar">
          <div className="avatar-icon">🤖</div>
        </div>
        <div className="chat-header-info">
          <h3>AI Assistant</h3>
          <span className="status">
            <span className="status-dot"></span>
            Online
            {isLoading && (
              <span className="response-time">
                • Responding... {formatResponseTime(responseTime)}
              </span>
            )}
          </span>
        </div>
        <button 
          className="theme-toggle"
          onClick={toggleDarkMode}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM12 1L7.05 6.34l1.42 1.42L12 4l3.53 3.76 1.42-1.42L12 1zM12 23l4.95-5.34-1.42-1.42L12 20l-3.53-3.76-1.42 1.42L12 23zM1 12l5.34-4.95 1.42 1.42L4 12l3.76 3.53-1.42 1.42L1 12zM23 12l-5.34 4.95-1.42-1.42L20 12l-3.76-3.53 1.42-1.42L23 12z"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.37 5.51A7.35 7.35 0 0 0 9.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0 1 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Messages Area */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>Welcome to AI Chat!</h3>
            <p>Start a conversation by sending a message below.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.sender.toLowerCase()}-message`}
            >
              <div className="message-content">
                <div className="message-text">{message.text}</div>
                <div className="message-time">
                  {formatTime(message.createdAt || new Date())}
                </div>
              </div>
              {message.sender === 'AI' && (
                <div className="message-avatar">AI</div>
              )}
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="message ai-message">
            <div className="message-content">
              <div className="response-indicator">
                <div className="thinking-text">AI is thinking</div>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="processing-steps">
                  <div className="step">
                    <div className="step-icon">💭</div>
                    <span>Processing your message</span>
                  </div>
                  <div className="step">
                    <div className="step-icon">⚡</div>
                    <span>Generating response</span>
                  </div>
                  <div className="step">
                    <div className="step-icon">✨</div>
                    <span>Almost ready</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="message-avatar">AI</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-container">
        <div className="input-wrapper">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="message-input"
            disabled={isLoading}
          />
          <button 
            onClick={send} 
            className="send-button"
            disabled={!text.trim() || isLoading}
          >
            {isLoading ? (
              <div className="sending-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        </div>
        {isLoading && (
          <div className="response-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${Math.min(responseTime * 10, 90)}%`,
                  animation: responseTime > 5 ? 'pulse 1.5s infinite' : 'none'
                }}
              ></div>
            </div>
            <div className="progress-text">
              {responseTime < 5 ? (
                "Getting response..."
              ) : responseTime < 10 ? (
                "Taking a bit longer than usual..."
              ) : (
                "Still working on it..."
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}