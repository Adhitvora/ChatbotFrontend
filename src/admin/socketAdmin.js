// src/admin/socketAdmin.js
import { io } from "socket.io-client";

const BACKEND = import.meta.env.VITE_BACKEND_URL;

export const adminSocket = io(BACKEND, {
    transports: ["websocket"],
    autoConnect: false, // connect when needed
});
