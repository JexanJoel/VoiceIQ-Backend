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

const getUserSOP = async (userId) => {
  const { data, error: dbError } = await supabase
    .from("sop_rules")
    .select("rule_text, category")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (dbError || !data || data.length === 0) return DEFAULT_SOP;
  return data.map((r, i) => `${i + 1}. [${r.category.toUpperCase()}] ${r.rule_text}`).join("\n");
};

export const uploadCall = async (req, res) => {
  const file = req.file;
  if (!file) return error(res, "No audio file uploaded", 400);

  try {
    const fileBuffer = fs.readFileSync(file.path);
    const storagePath = `calls/${Date.now()}-${file.originalname}`;

    const { error: storageError } = await supabase.storage
      .from("voiceiq-calls")
      .upload(storagePath, fileBuffer, { contentType: file.mimetype });

    if (storageError) throw new Error(storageError.message);

    const transcription = await transcribeAudio(file.path);
    const sopRules = await getUserSOP(req.user.id);
    const analysis = await analyzeTranscript(transcription.text, sopRules);

    // Get agent info if provided
    const agentId = req.body.agent_id || null;
    let agentName = 'Unknown Agent';

    if (agentId) {
      const { data: agent } = await supabase
        .from("agents")
        .select("name")
        .eq("id", agentId)
        .eq("user_id", req.user.id)
        .single();
      if (agent) agentName = agent.name;
    }

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
        agent_id: agentId,
        agent_name: agentName,
      })
      .select()
      .single();

    if (dbError) throw new Error(dbError.message);
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

export const deleteCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: call, error: fetchError } = await supabase
      .from("calls")
      .select("storage_path")
      .eq("id", id)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    if (!call) return error(res, "Call not found", 404);
    if (call.storage_path) {
      await supabase.storage.from("voiceiq-calls").remove([call.storage_path]);
    }
    const { error: dbError } = await supabase.from("calls").delete().eq("id", id);
    if (dbError) throw new Error(dbError.message);
    return success(res, null, "Call deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

export const getSignedUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: call, error: fetchError } = await supabase
      .from("calls")
      .select("storage_path")
      .eq("id", id)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    if (!call) return error(res, "Call not found", 404);
    const { data, error: urlError } = await supabase.storage
      .from("voiceiq-calls")
      .createSignedUrl(call.storage_path, 3600);
    if (urlError) throw new Error(urlError.message);
    return success(res, { url: data.signedUrl });
  } catch (err) {
    return error(res, err.message);
  }
};