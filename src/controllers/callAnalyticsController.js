import fs from "fs";
import path from "path";
import os from "os";
import { transcribeAudio } from "../services/whisperService.js";
import { analyzeForHackathon } from "../services/groqService.js";

// Clean garbled unicode from Whisper output — keep ASCII + Tamil + Hindi
const cleanTranscript = (text) => {
  return text
    .replace(/[^\x00-\x7F\u0B80-\u0BFF\u0900-\u097F\s.,!?'"():;\-₹%]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * POST /api/call-analytics
 * Auth: x-api-key header
 * Body: { language, audioFormat, audioBase64 }
 */
export const analyzeCall = async (req, res) => {
  let tempFilePath = null;

  try {
    const { language, audioFormat, audioBase64 } = req.body;

    // ── Validate required fields ──────────────────────────────────────────
    if (!audioBase64) {
      return res.status(400).json({
        status: "error",
        message: "audioBase64 is required",
      });
    }

    if (!language) {
      return res.status(400).json({
        status: "error",
        message: "language is required (Tamil or Hindi)",
      });
    }

    // ── Decode Base64 → temp file ─────────────────────────────────────────
    const buffer = Buffer.from(audioBase64, "base64");
    const ext = audioFormat || "mp3";
    tempFilePath = path.join(os.tmpdir(), `voiceiq_${Date.now()}.${ext}`);
    fs.writeFileSync(tempFilePath, buffer);

    // ── Transcribe with Whisper ───────────────────────────────────────────
    const transcription = await transcribeAudio(tempFilePath);

    // ── Clean transcript ──────────────────────────────────────────────────
    const cleanedText = cleanTranscript(transcription.text);
    const cleanedTimestamped = transcription.timestamped_transcript
      ? cleanTranscript(transcription.timestamped_transcript)
      : cleanedText;

    // ── Analyze with Groq ─────────────────────────────────────────────────
    const analysis = await analyzeForHackathon(
      cleanedTimestamped || cleanedText,
      language
    );

    // ── Clean up temp file ────────────────────────────────────────────────
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    // ── Return exact required response shape ──────────────────────────────
    return res.status(200).json({
      status: "success",
      language: language,
      transcript: cleanedText,
      summary: analysis.summary,
      sop_validation: analysis.sop_validation,
      analytics: analysis.analytics,
      keywords: analysis.keywords,
    });
  } catch (err) {
    // Clean up temp file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return res.status(500).json({
      status: "error",
      message: err.message || "Internal server error",
    });
  }
};