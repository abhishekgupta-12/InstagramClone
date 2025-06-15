// backend/socket/socket.js
import { Server } from "socket.io";

const userSocketMap = {}; // userId → socketId
let io; // Declare io at the top

export const getReceiverSocketId = (receiverId) => userSocketMap[receiverId];

// Export io after initialization
export const getIo = () => io;

export const setupSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
      userSocketMap[userId] = socket.id;
      console.log(`🔌 User connected: ${userId}`);
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
      if (userId && userSocketMap[userId] === socket.id) {
        delete userSocketMap[userId];
        console.log(`❌ User disconnected: ${userId}`);
      }

      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });
};
