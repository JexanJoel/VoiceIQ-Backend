import express from "express";
import { analyzeCall } from "../controllers/callAnalyticsController.js";

const router = express.Router();

/**
 * x-api-key middleware — protects this route only
 * No Supabase JWT needed here, just the shared API key from .env
 */
const apiKeyAuth = (req, res, next) => {
  const clientKey = req.headers["x-api-key"];
  const validKey = process.env.HACKATHON_API_KEY;

  if (!clientKey || clientKey !== validKey) {
    return res.status(401).json({
      status: "error",
      message: "Unauthorized: invalid or missing x-api-key",
    });
  }

  next();
};

// POST /api/call-analytics
router.post("/", apiKeyAuth, analyzeCall);

export default router;