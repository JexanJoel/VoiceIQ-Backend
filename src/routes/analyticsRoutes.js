import express from "express";
import {
  getDashboardStats,
  getComplianceTrend,
  getTopViolations,
} from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/stats", getDashboardStats);
router.get("/trend", getComplianceTrend);
router.get("/violations", getTopViolations);

export default router;