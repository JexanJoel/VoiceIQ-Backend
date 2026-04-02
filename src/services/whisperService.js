import Groq from "groq-sdk";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Map hackathon language field → Whisper language codes
const LANGUAGE_MAP = {
  tamil: "ta",
  hindi: "hi",
  english: "en",
};

export const transcribeAudio = async (filePath, language = null) => {
  try {
    const requestParams = {
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    };

    // Pass language hint to Whisper — improves Tanglish/Hinglish accuracy significantly
    if (language) {
      const langCode = LANGUAGE_MAP[language.toLowerCase()];
      if (langCode) requestParams.language = langCode;
    }

    const transcription = await groq.audio.transcriptions.create(requestParams);

    const segments = transcription.segments || [];
    const timestampedTranscript = segments
      .map((s) => `[${formatTime(s.start)}–${formatTime(s.end)}] ${s.text.trim()}`)
      .join("\n");

    return {
      text: transcription.text,
      timestamped_transcript: timestampedTranscript || transcription.text,
      language: transcription.language,
      duration: transcription.duration,
      segments: segments,
    };
  } catch (error) {
    throw new Error(`Transcription failed: ${error.message}`);
  }
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};