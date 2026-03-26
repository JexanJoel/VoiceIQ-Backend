import express from "express";
import {
  getDashboardStats,
  getComplianceTrend,
  getTopViolations,
  getViolationsByRule,
} from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/stats", getDashboardStats);
router.get("/trend", getComplianceTrend);
router.get("/violations", getTopViolations);
router.get("/violations-by-rule", getViolationsByRule);

export default router;