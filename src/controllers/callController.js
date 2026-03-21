import supabase from "../services/supabaseService.js";
import { transcribeAudio } from "../services/whisperService.js";
import { analyzeTranscript } from "../services/groqService.js";
import { success, error } from "../utils/responseHelper.js";
import fs from "fs";

const DEFAULT_SOP = `
1. Agent must greet the customer within the first 10 seconds
2. Agent must verify customer identity (name + account number)
3. Agent must not use abusive or unprofessional language
4. Agent must confirm the issue before providing a solution
5. Agent must ask for payment preference if payment is involved
6. Agent must end the call with a closing statement
`;

export const uploadCall = async (req, res) => {
  const file = req.file;
  if (!file) return error(res, "No audio file uploaded", 400);

  try {
    // 1. Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(file.path);
    const storagePath = `calls/${Date.now()}-${file.originalname}`;

    const { error: storageError } = await supabase.storage
      .from("voiceiq-calls")
      .upload(storagePath, fileBuffer, { contentType: file.mimetype });

    if (storageError) throw new Error(storageError.message);

    // 2. Transcribe with Groq Whisper
    const transcription = await transcribeAudio(file.path);

    // 3. Analyze with Groq Llama
    const analysis = await analyzeTranscript(transcription.text, DEFAULT_SOP);

    // 4. Save to Supabase DB
    const { data: callRecord, error: dbError } = await supabase
      .from("calls")
      .insert({
        file_name: file.originalname,
        storage_path: storagePath,
        transcript: transcription.text,
        language: transcription.language,
        duration_seconds: transcription.duration,
        sentiment: analysis.sentiment,
        sentiment_score: analysis.sentiment_score,
        sop_compliance_percentage: analysis.sop_compliance_percentage,
        violations: analysis.violations,
        passed_checks: analysis.passed_checks,
        payment_preference: analysis.payment_preference,
        summary: analysis.summary,
      })
      .select()
      .single();

    if (dbError) throw new Error(dbError.message);

    // 5. Cleanup local file
    fs.unlinkSync(file.path);

    return success(res, callRecord, "Call processed successfully", 201);
  } catch (err) {
    if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    return error(res, err.message);
  }
};

export const getAllCalls = async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from("calls")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) throw new Error(dbError.message);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
};

export const getCallById = async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from("calls")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (dbError) throw new Error(dbError.message);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
};

export const getFlaggedCalls = async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from("calls")
      .select("*")
      .lt("sop_compliance_percentage", 70)
      .order("created_at", { ascending: false });

    if (dbError) throw new Error(dbError.message);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
};