import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));

const corsOptions = {
    origin: process.env.URL,
    credentials: true
};
app.use(cors(corsOptions));

// User route only
app.use("/api/v1/user", userRoute);

// Start server
app.listen(PORT, () => {
    connectDB();
    console.log(`Server listening at port ${PORT}`);
});
