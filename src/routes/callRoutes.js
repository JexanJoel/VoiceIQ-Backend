import express from "express";
import {
  uploadCall,
  getAllCalls,
  getCallById,
  getFlaggedCalls,
  deleteCall,
  getSignedUrl,
  reviewCall,
} from "../controllers/callController.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/upload", upload.single("audio"), uploadCall);
router.get("/", getAllCalls);
router.get("/flagged", getFlaggedCalls);
router.get("/:id/audio", getSignedUrl);
router.get("/:id", getCallById);
router.delete("/:id", deleteCall);
router.patch("/:id/review", reviewCall);

export default router;