import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import callRoutes from "./src/routes/callRoutes.js";
import transcriptRoutes from "./src/routes/transcriptRoutes.js";
import analyticsRoutes from "./src/routes/analyticsRoutes.js";
import sopRoutes from "./src/routes/sopRoutes.js";
import agentRoutes from "./src/routes/agentRoutes.js";
import { authenticate } from "./src/middleware/authMiddleware.js";
import callAnalyticsRoute from "./src/routes/callAnalyticsRoute.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'https://voice-iq-ai.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());
app.use(express.json({ limit: "50mb" }));

app.use("/api/call-analytics", callAnalyticsRoute);

app.get("/", (req, res) => {
  res.json({ status: "VoiceIQ Backend Running 🎙️" });
});

app.use("/api/calls", authenticate, callRoutes);
app.use("/api/transcripts", authenticate, transcriptRoutes);
app.use("/api/analytics", authenticate, analyticsRoutes);
app.use("/api/sop", authenticate, sopRoutes);
app.use("/api/agents", authenticate, agentRoutes);

app.listen(PORT, () => {
  console.log(`VoiceIQ backend running on port ${PORT}`);
});