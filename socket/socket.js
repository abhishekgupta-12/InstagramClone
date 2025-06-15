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
      origin: "https://socialmedia-frontend-rlct-3b7qcehwh-abhisheks-projects-4233a795.vercel.app",
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
