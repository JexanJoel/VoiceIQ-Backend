import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import callRoutes from "./src/routes/callRoutes.js";
import transcriptRoutes from "./src/routes/transcriptRoutes.js";
import analyticsRoutes from "./src/routes/analyticsRoutes.js";
import { authenticate } from "./src/middleware/authMiddleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());

// Health check (public)
app.get("/", (req, res) => {
  res.json({ status: "VoiceIQ Backend Running 🎙️" });
});

// Protected routes
app.use("/api/calls", authenticate, callRoutes);
app.use("/api/transcripts", authenticate, transcriptRoutes);
app.use("/api/analytics", authenticate, analyticsRoutes);

app.listen(PORT, () => {
  console.log(`VoiceIQ backend running on port ${PORT}`);
});
