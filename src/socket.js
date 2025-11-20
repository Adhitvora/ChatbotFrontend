import { io } from "socket.io-client";
const BACKEND = "https://chatbot-e82s.onrender.com";
export const socket = io(BACKEND, { autoConnect: true });
