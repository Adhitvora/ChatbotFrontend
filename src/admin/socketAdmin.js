// src/admin/socketAdmin.js
import { io } from "socket.io-client";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export const adminSocket = io(BACKEND, {
    transports: ["websocket"],
    autoConnect: false, // connect when needed
});
