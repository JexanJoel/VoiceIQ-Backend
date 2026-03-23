import express from "express";
import {
  getAgents,
  createAgent,
  deleteAgent,
  getAgentStats,
  getAgentCalls,
} from "../controllers/agentController.js";

const router = express.Router();

router.get("/", getAgents);
router.post("/", createAgent);
router.delete("/:id", deleteAgent);
router.get("/stats", getAgentStats);
router.get("/:id/calls", getAgentCalls);

export default router;