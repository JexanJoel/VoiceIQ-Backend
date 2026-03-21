import express from "express";
import {
  getTranscriptByCallId,
  searchTranscripts,
} from "../controllers/transcriptController.js";

const router = express.Router();

router.get("/search", searchTranscripts);
router.get("/:callId", getTranscriptByCallId);

export default router;