import { io } from "socket.io-client";
const BACKEND = "http://localhost:4000";
export const socket = io(BACKEND, { autoConnect: true });
