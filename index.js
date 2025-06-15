import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import http from "http";
import connectDB from "./utils/db.js";

import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";

import { setupSocket } from "./socket/socket.js"; // ✅ Import socket setup
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __dirname=path.resolve();
console.log(__dirname);

// CORS config
const corsOptions = {
  origin: "http://localhost:5173", // frontend URL
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/message", messageRoute);

app.use(express.static(path.join(__dirname,"/frontend/dist")));

// HTTP + WebSocket server
const server = http.createServer(app);
setupSocket(server); // ✅ Initialize socket logic

// Start server & connect DB
server.listen(PORT, () => {
  connectDB();
  console.log(`🚀 Server listening at port ${PORT}`);
});
