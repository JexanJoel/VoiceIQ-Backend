import supabase from "../services/supabaseService.js";
import { success, error } from "../utils/responseHelper.js";

export const getTranscriptByCallId = async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from("calls")
      .select("id, file_name, transcript, language, duration_seconds, created_at")
      .eq("id", req.params.callId)
      .single();

    if (dbError) throw new Error(dbError.message);
    if (!data) return error(res, "Call not found", 404);

    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
};

export const searchTranscripts = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === "") {
    return error(res, "Search query is required", 400);
  }

  try {
    const { data, error: dbError } = await supabase
      .from("calls")
      .select("id, file_name, transcript, sentiment, sop_compliance_percentage, created_at")
      .ilike("transcript", `%${q}%`)
      .order("created_at", { ascending: false });

    if (dbError) throw new Error(dbError.message);

    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
};