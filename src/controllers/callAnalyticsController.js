import fs from "fs";
import path from "path";
import os from "os";
import { transcribeAudio } from "../services/whisperService.js";
import { analyzeForHackathon } from "../services/groqService.js";

// Clean garbled unicode — keep ASCII + Tamil + Hindi + common punctuation
const cleanTranscript = (text) => {
  return text
    .replace(/[^\x00-\x7F\u0B80-\u0BFF\u0900-\u097F\s.,!?'"():;\-₹%0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// Extract numbers and amounts from raw transcript for payment context
const extractFinancialContext = (rawText) => {
  const amounts = rawText.match(/[\d,]+(?:\.\d+)?/g) || [];
  const emiKeywords = rawText.match(/EMI|installment|monthly|மாதம்|किस्त|மாதாமாதம்/gi) || [];
  const paymentKeywords = rawText.match(/pay|payment|fee|cost|amount|கட்டணம்|fees|பணம்|rupee|₹/gi) || [];

  return {
    amounts: [...new Set(amounts.filter(a => a.length > 2))].slice(0, 10),
    hasEMI: emiKeywords.length > 0,
    hasPayment: paymentKeywords.length > 0,
    emiMatches: emiKeywords,
    paymentMatches: paymentKeywords,
  };
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

    // ── Transcribe with Whisper (pass language hint) ──────────────────────
    const transcription = await transcribeAudio(tempFilePath, language);

    // ── Clean transcript ──────────────────────────────────────────────────
    const rawText = transcription.text;
    const cleanedText = cleanTranscript(rawText);
    const cleanedTimestamped = transcription.timestamped_transcript
      ? cleanTranscript(transcription.timestamped_transcript)
      : cleanedText;

    // ── Extract financial context from RAW text (before cleaning) ─────────
    // Raw text preserves numbers and mixed-language payment terms better
    const financialContext = extractFinancialContext(rawText);

    // ── Analyze with Groq ─────────────────────────────────────────────────
    // Pass cleaned timestamped transcript + financial hints from raw text
    const analysis = await analyzeForHackathon(
      cleanedTimestamped || cleanedText,
      language,
      financialContext
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
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return res.status(500).json({
      status: "error",
      message: err.message || "Internal server error",
    });
  }
};