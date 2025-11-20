
import { io } from "socket.io-client";


const API = import.meta.env.VITE_BACKEND_URL;
const socketUrl = API.replace(/\/$/, "");

export const socket = io(socketUrl, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: true,
    secure: socketUrl.startsWith("https://")
});

// optional debug
console.log("Socket URL:", socketUrl, "secure:", socketUrl.startsWith("https://"));
