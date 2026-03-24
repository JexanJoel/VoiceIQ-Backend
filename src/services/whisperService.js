import Groq from "groq-sdk";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const transcribeAudio = async (filePath) => {
  try {
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    // Build timestamped transcript from segments
    const segments = transcription.segments || [];
    const timestampedTranscript = segments
      .map(s => `[${formatTime(s.start)}–${formatTime(s.end)}] ${s.text.trim()}`)
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