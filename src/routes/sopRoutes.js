import express from "express";
import { getRules, createRule, updateRule, deleteRule, toggleRule } from "../controllers/sopController.js";

const router = express.Router();

router.get("/", getRules);
router.post("/", createRule);
router.put("/:id", updateRule);
router.delete("/:id", deleteRule);
router.patch("/:id/toggle", toggleRule);

export default router;