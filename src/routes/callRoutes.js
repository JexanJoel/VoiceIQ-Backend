import express from "express";
import {
  uploadCall,
  getAllCalls,
  getCallById,
  getFlaggedCalls,
} from "../controllers/callController.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/upload", upload.single("audio"), uploadCall);
router.get("/", getAllCalls);
router.get("/flagged", getFlaggedCalls);
router.get("/:id", getCallById);

export default router;